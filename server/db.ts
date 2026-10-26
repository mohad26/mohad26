/**
 * Dual database controller implementing high-availability, zero-downtime persistence.
 * Primary: Firebase Firestore (if configured via firebase-applet-config.json)
 * Fallback: High-Fidelity Local JSON Database (for local preview with ZERO setup)
 */

import * as fs from "fs";
import * as path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, setLogLevel, collection, doc, getDocs, setDoc, query, orderBy } from "firebase/firestore";
import { Comment, PlatformType, SentimentType, NationalEvent, RecognizedEntity, EntityCategory, EntityTopicInsight } from "../src/types/index.ts";
import { SOCCER_SEEDS } from "./soccerSeeds.ts";
import { extractEntitiesRuleBased, compileEntityTopicInsights } from "./nerEngine.ts";

export interface DBPost {
  id: string;
  source: PlatformType;
  account: string;   // Author / handle
  content: string;   // Text
  language: 'ar' | 'en';
  timestamp: string;
  likes: number;
  comments: number;  // comments / replies count
  shares: number;
  topic: string;
  sentiment: SentimentType;
  sentimentScore: number;
}

export interface DBSentimentResult {
  post_id: string;
  sentiment: SentimentType;
  confidence: number;
  emotions: string[];
  topics: string[];
}

export interface DBMentionedEntity {
  id: string;
  word: string;
  type: 'person' | 'organization' | 'location';
  frequency: number;
}

export interface DBTrend {
  keyword: string;
  frequency: number;
  growth_rate: number; // Percentage
  category: 'sports' | 'economy' | 'tourism' | 'infrastructure' | 'utilities' | 'culture';
}

// Ensure database folders exist
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const COMMENTS_FILE = path.join(DATA_DIR, "comments_db.json");
const TRENDS_FILE = path.join(DATA_DIR, "trends_db.json");
const ENTITIES_FILE = path.join(DATA_DIR, "entities_db.json");
const ENTITY_INSIGHTS_FILE = path.join(DATA_DIR, "entity_insights_db.json");
const ACCOUNTS_FILE = path.join(DATA_DIR, "jordan_accounts.json");
const EVENTS_FILE = path.join(DATA_DIR, "events_db.json");

// Local variable holding current state in memory for speed & offline fallback
let commentsCache: Comment[] = [];
let trendsCache: DBTrend[] = [];
let entitiesCache: DBMentionedEntity[] = [];
let entityInsightsCache: EntityTopicInsight[] = [];
let eventsCache: NationalEvent[] = [];

// Load Firebase configuration safely
let firebaseConfig: any = null;
let db: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.error("Firebase config file not available. Proceeding with Heuristic database fallbacks.");
}

// ------------------------------------------------------------------------
// Firestore Strict Error Handling
// ------------------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export interface FirestoreQuotaState {
  isQuotaExhausted: boolean;
  quotaExhaustedAt: number | null;
  retryAfter: number | null;
  loggedWarning: boolean;
  quotaMetric: string;
}

export const firestoreQuotaState: FirestoreQuotaState = {
  isQuotaExhausted: false,
  quotaExhaustedAt: null,
  retryAfter: null,
  loggedWarning: false,
  quotaMetric: 'Free daily read units per project (free tier database)'
};

/**
 * Detects if a FirebaseError is caused by free-tier daily read/write quota exhaustion.
 */
export function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const code = String((err as any)?.code || '').toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    code.includes('quota') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily read units') ||
    msg.includes('resource-exhausted') ||
    msg.includes('resource_exhausted') ||
    msg.includes('cannot exceed free quota limits') ||
    msg.includes('quota metric')
  );
}

/**
 * Trips the circuit breaker so that the app immediately stops hammering Firestore
 * and seamlessly switches to the high-availability local JSON and in-memory cache.
 */
export function tripFirestoreQuotaCircuitBreaker(error: unknown, context: string) {
  firestoreQuotaState.isQuotaExhausted = true;
  firestoreQuotaState.quotaExhaustedAt = Date.now();
  // Set 1-hour backoff window before probing Firestore again
  firestoreQuotaState.retryAfter = Date.now() + 60 * 60 * 1000;

  if (!firestoreQuotaState.loggedWarning) {
    console.warn(
      `[DATABASE MANAGER] Notice: Firestore daily free-tier quota limit reached. ` +
      `Zero-downtime circuit breaker activated: switching smoothly to High-Fidelity Local JSON Storage & In-Memory Mode. ` +
      `(Context: ${context}). All queries, seeds, and analytics are served locally with 0ms latency.`
    );
    firestoreQuotaState.loggedWarning = true;
  }
}

/**
 * Determines whether we should attempt a network call to Firestore or use local storage.
 */
export function shouldAttemptFirestore(): boolean {
  if (!db) return false;
  if (!firestoreQuotaState.isQuotaExhausted) return true;

  // If backoff window has elapsed, allow one test probe
  if (firestoreQuotaState.retryAfter && Date.now() > firestoreQuotaState.retryAfter) {
    firestoreQuotaState.loggedWarning = false;
    return true;
  }
  return false;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    tripFirestoreQuotaCircuitBreaker(error, `${operationType} ${path || ''}`);
    return; // Do not throw for quota errors — seamlessly serve local storage
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: false,
      isAnonymous: false,
    },
    operationType,
    path
  };
  console.warn('[DATABASE MANAGER] Non-fatal Firestore operation notice: ', JSON.stringify(errInfo));
}

// Suppress internal gRPC idle stream disconnect warnings
try {
  setLogLevel('silent');
} catch (e) {
  // ignore
}

// Intercept harmless internal gRPC idle stream timeout logs on stderr as defense-in-depth
try {
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = function (chunk: any, encoding?: any, callback?: any): boolean {
    const str = typeof chunk === 'string' ? chunk : chunk?.toString?.() || '';
    if (
      str.includes('Disconnecting idle stream') ||
      str.includes('Timed out waiting for new targets') ||
      (str.includes('@firebase/firestore') && str.includes('CANCELLED'))
    ) {
      return true; // gracefully swallow benign idle stream timeout notice
    }
    return originalStderrWrite(chunk, encoding, callback);
  };
} catch (e) {
  // ignore
}

// Initialize Firestore if config matches
if (firebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    db = initializeFirestore(
      app,
      {
        ignoreUndefinedProperties: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
    console.log("[FIREBASE MANAGER] Connected to Google Cloud Firestore on Database ID:", firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.error("[FIREBASE MANAGER] Failed to boot client module:", err);
  }
}

// Initialize or load fallback data
function initLocalDatabase() {
  // Load comments
  if (fs.existsSync(COMMENTS_FILE)) {
    try {
      const data = fs.readFileSync(COMMENTS_FILE, "utf-8");
      commentsCache = JSON.parse(data);
    } catch (e) {
      console.error("Failed to read comments fallback database:", e);
      commentsCache = [];
    }
  }

  // Load trends
  if (fs.existsSync(TRENDS_FILE)) {
    try {
      const data = fs.readFileSync(TRENDS_FILE, "utf-8");
      trendsCache = JSON.parse(data);
    } catch (e) {
      console.error("Failed to read trends fallback database:", e);
      trendsCache = [];
    }
  } else {
    // Seed default trends
    trendsCache = [
      { keyword: "المنسف", frequency: 124, growth_rate: 15.4, category: "culture" },
      { keyword: "تلفريك عجلون", frequency: 98, growth_rate: 22.1, category: "tourism" },
      { keyword: "الباص السريع", frequency: 85, growth_rate: -4.5, category: "infrastructure" },
      { keyword: "النشامى", frequency: 182, growth_rate: 45.8, category: "sports" },
      { keyword: "البترا", frequency: 72, growth_rate: 8.2, category: "tourism" },
      { keyword: "سند", frequency: 44, growth_rate: 12.0, category: "infrastructure" },
      { keyword: "رواتب", frequency: 65, growth_rate: 18.2, category: "economy" },
      { keyword: "الاسعار", frequency: 95, growth_rate: 30.5, category: "economy" },
      { keyword: "المياه", frequency: 54, growth_rate: 14.1, category: "utilities" },
      { keyword: "وادي رم", frequency: 60, growth_rate: 9.3, category: "tourism" }
    ];
    saveTrends();
  }

  // Load entities
  if (fs.existsSync(ENTITIES_FILE)) {
    try {
      const data = fs.readFileSync(ENTITIES_FILE, "utf-8");
      entitiesCache = JSON.parse(data);
    } catch (e) {
      console.error("Failed to read entities fallback database:", e);
      entitiesCache = [];
    }
  } else {
    entitiesCache = [
      { id: "e1", word: "الأردن", type: "location", frequency: 154 },
      { id: "e2", word: "البترا", type: "location", frequency: 68 },
      { id: "e3", word: "عمان", type: "location", frequency: 92 },
      { id: "e4", word: "النشامى", type: "organization", frequency: 125 },
      { id: "e5", word: "اليونسكو", type: "organization", frequency: 45 },
      { id: "e6", word: "وزارة المياه", type: "organization", frequency: 32 },
      { id: "e7", word: "عجلون", type: "location", frequency: 55 }
    ];
    saveEntities();
  }

  // Trigger sync of accounts if cloud is ready and healthy
  if (shouldAttemptFirestore()) {
    syncAccountsFromFirestore().catch(e => {
      if (isQuotaError(e)) {
        tripFirestoreQuotaCircuitBreaker(e, "initLocalDatabase:syncAccounts");
      }
    });
  }

  // Load events
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      eventsCache = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to read events fallback database:", e);
      eventsCache = [];
    }
  }

  if (eventsCache.length === 0) {
    eventsCache = [
      { id: "event-1", date: "2026-03-15", label: "Energy Accord", title: "National Hydrogen & Renewable Pact", desc: "Sovereign commitment into green hydrogen grids & solar energy cells in Southern Badia, motivating employment index spikes.", icon: "⚡", sentimentEffect: "positive" },
      { id: "event-2", date: "2026-04-05", label: "BRT Phase 2", title: "Amman-Zarqa BRT Ingress Expansion", desc: "Launch of high-frequency commuter buses lowering standard travel overhead, triggering immense transport optimization.", icon: "🚌", sentimentEffect: "positive" },
      { id: "event-3", date: "2026-04-22", label: "Tourism Shift", title: "National Tourism Strategy Launch", desc: "Deployment of royal tourism stimulus vectors across Petra, Ajloun, & Wadi Rum, marking record-high digital visa registrations.", icon: "🇯🇴", sentimentEffect: "positive" },
      { id: "event-4", date: "2026-05-12", label: "Economic Vision", title: "National Modernization Report", desc: "Continuous economic goals review aligning 12 governorate vocational pipelines directly with private sector investments.", icon: "📈", sentimentEffect: "neutral" },
      { id: "event-5", date: "2026-05-25", label: "Independence", title: "79th Jordan Independence Day", desc: "Universal cultural processions & traditional celebrations boosting optimism indices across all monitored social feeds.", icon: "🇯🇴", sentimentEffect: "positive" },
      { id: "event-6", date: "2026-06-01", label: "Petra Ticket", title: "Petra Digital Gateway Transition", desc: "Sovereign transition of physical tickets to secure e-ports at UNESCO sites, eliminating previous vendor bottlenecks.", icon: "🎟️", sentimentEffect: "positive" },
      { id: "event-7", date: "2026-06-05", label: "Agri-Tech Order", title: "Jordan Valley Irrigation Reform", desc: "Royal directive addressing food security, deploying sub-surface smart drip-net technology to farming districts.", icon: "🌱", sentimentEffect: "neutral" }
    ];
    try {
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventsCache, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save default events locally:", e);
    }
  }

  // Trigger sync of events to Firestore if cloud is ready and healthy
  if (shouldAttemptFirestore()) {
    syncEventsToFirestore().catch(e => {
      if (isQuotaError(e)) {
        tripFirestoreQuotaCircuitBreaker(e, "initLocalDatabase:syncEvents");
      }
    });
  }

  // Prepend fresh sports comments dynamically if not already present
  const hasSportSeed = commentsCache.some(c => c.id && c.id.startsWith("sport-seed-"));
  if (!hasSportSeed) {
    const taggedSeeds = SOCCER_SEEDS.map(s => ({
      ...s,
      provenance: {
        sourceId: 'user_input' as const,
        kind: 'social_comment' as const,
        nativeUrl: null,
        fetchedAt: s.timestamp || new Date().toISOString(),
        collectedLive: false,
      },
      nlpInstrument: 'lexicon_rules' as const
    }));
    commentsCache = [...taggedSeeds, ...commentsCache];
  }

  // Ensure field integrity without rewriting timestamps or inventing source data
  if (commentsCache.length > 0) {
    commentsCache.forEach((comment) => {
      if (!comment.provenance) {
        comment.provenance = {
          sourceId: 'user_input',
          kind: 'social_comment',
          nativeUrl: null,
          fetchedAt: comment.timestamp || new Date().toISOString(),
          collectedLive: false,
        };
      }
      if (comment.likeCount === undefined) {
        comment.likeCount = typeof comment.likes === 'number' ? comment.likes : null;
      }
      if (comment.replyCount === undefined) {
        comment.replyCount = typeof comment.shares === 'number' ? comment.shares : null;
      }
      if (!comment.nlpInstrument) {
        comment.nlpInstrument = 'lexicon_rules';
      }
      if (!comment.classifiedEntities || comment.classifiedEntities.length === 0) {
        comment.classifiedEntities = extractEntitiesRuleBased(
          comment.text,
          comment.themeId,
          comment.sentiment,
          comment.sentimentScore
        );
      }
      if (!comment.namedEntities || comment.namedEntities.length === 0) {
        comment.namedEntities = (comment.classifiedEntities || []).map(e => e.name);
      }
      if (!comment.topic) {
        comment.topic = "General Discussion";
      }
      if (!comment.platform) {
        comment.platform = "X";
      }
    });

    // Sort descending so the latest is always first in feed
    commentsCache.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    saveComments();

    // Compile and cache entity topic insights
    entityInsightsCache = compileEntityTopicInsights(commentsCache);
    saveEntityInsights();

    console.log(`[DATABASE MANAGER] Initialized ${commentsCache.length} comments & ${entityInsightsCache.length} entity topic insights in cache.`);
  }
}

function saveComments() {
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(commentsCache, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write comments fallback database:", e);
  }
}

function saveTrends() {
  try {
    fs.writeFileSync(TRENDS_FILE, JSON.stringify(trendsCache, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write trends to fallback database:", e);
  }
}

function saveEntities() {
  try {
    fs.writeFileSync(ENTITIES_FILE, JSON.stringify(entitiesCache, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write entities to fallback database:", e);
  }
}

function saveEntityInsights() {
  try {
    fs.writeFileSync(ENTITY_INSIGHTS_FILE, JSON.stringify(entityInsightsCache, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write entity insights to fallback database:", e);
  }
}

async function syncAccountsFromFirestore(): Promise<void> {
  if (shouldAttemptFirestore()) {
    try {
      const accountsCol = collection(db, "accounts");
      const snapshot = await getDocs(accountsCol);
      if (!snapshot.empty) {
        const accounts: Record<string, string[]> = {};
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.handles) {
            accounts[docSnap.id] = data.handles;
          }
        });
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
        console.log("[FIREBASE MANAGER] Successfully synchronized accounts registry with Google Cloud Firestore.");
      }
    } catch (err) {
      if (isQuotaError(err)) {
        tripFirestoreQuotaCircuitBreaker(err, "syncAccountsFromFirestore");
      } else {
        console.warn("[FIREBASE MANAGER] Accounts collections sync notice:", err);
      }
    }
  }
}

function saveEvents() {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventsCache, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write events fallback database:", e);
  }
}

async function syncEventsToFirestore(): Promise<void> {
  if (shouldAttemptFirestore()) {
    try {
      const eventsCol = collection(db, "events");
      const snapshot = await getDocs(eventsCol);
      if (snapshot.empty) {
        console.log("[FIREBASE MANAGER] Seeding events collection in Firestore...");
        for (const evt of eventsCache) {
          if (!shouldAttemptFirestore()) break;
          const docRef = doc(db, "events", evt.id);
          await setDoc(docRef, evt);
        }
        console.log("[FIREBASE MANAGER] Firestore events collection seeded successfully.");
      } else {
        const fbEvents: NationalEvent[] = [];
        snapshot.forEach(docSnap => {
          fbEvents.push(docSnap.data() as NationalEvent);
        });
        fbEvents.sort((a, b) => a.date.localeCompare(b.date));
        eventsCache = fbEvents;
        saveEvents();
        console.log("[FIREBASE MANAGER] Successfully synchronized events from Firestore.");
      }
    } catch (err) {
      if (isQuotaError(err)) {
        tripFirestoreQuotaCircuitBreaker(err, "syncEventsToFirestore");
      } else {
        console.warn("[FIREBASE MANAGER] Events collection sync notice:", err);
      }
    }
  }
}

// Run basic initializer
initLocalDatabase();

// Expose Database APIs with full fallback mechanisms
/**
 * Recursively strips undefined fields from an object so Firestore setDoc does not throw
 * "Unsupported field value: undefined".
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export const databaseManager = {
  /**
   * Retrieves all Comments / Posts
   */
  async getComments(): Promise<Comment[]> {
    if (shouldAttemptFirestore()) {
      const pathValue = "comments";
      try {
        const commentsCol = collection(db, pathValue);
        const snapshot = await getDocs(commentsCol);
        const fbComments: Comment[] = [];
        snapshot.forEach(docSnap => {
          fbComments.push(docSnap.data() as Comment);
        });
        
        if (fbComments.length > 0) {
          // Sort by timestamp descending
          fbComments.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          commentsCache = fbComments;
          saveComments();
          firestoreQuotaState.isQuotaExhausted = false;
          return fbComments;
        }
      } catch (err) {
        if (isQuotaError(err)) {
          tripFirestoreQuotaCircuitBreaker(err, "getComments");
        } else {
          console.warn("[DATABASE MANAGER] Firestore comments fetch notice, using local cache:", err);
        }
      }
    }
    return commentsCache;
  },

  /**
   * Adds or updates a comment in the database
   */
  async addComment(comment: Comment): Promise<void> {
    // Add to local cache file first
    const existingIndex = commentsCache.findIndex(c => c.id === comment.id);
    if (existingIndex > -1) {
      commentsCache[existingIndex] = comment;
    } else {
      commentsCache.unshift(comment);
    }
    if (commentsCache.length > 1000) {
      commentsCache = commentsCache.slice(0, 1000);
    }
    saveComments();

    // Persist to Firestore if available and quota healthy
    if (shouldAttemptFirestore()) {
      const commentPath = `comments/${comment.id}`;
      try {
        const sanitized = cleanForFirestore(comment);
        const docRef = doc(db, "comments", comment.id);
        await setDoc(docRef, sanitized);
        console.log("[DATABASE MANAGER] Firestore successfully wrote ID:", comment.id);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, commentPath);
      }
    }

    // Increment entities frequencies if present
    if (comment.namedEntities && comment.namedEntities.length > 0) {
      comment.namedEntities.forEach(ent => {
        const found = entitiesCache.find(e => e.word.toLowerCase() === ent.toLowerCase());
        if (found) {
          found.frequency += 1;
        } else {
          entitiesCache.push({
            id: `entity-${Date.now()}-${Math.floor(Math.random() * 100)}`,
            word: ent,
            type: "location",
            frequency: 1
          });
        }
      });
      entitiesCache.sort((a, b) => b.frequency - a.frequency);
      entitiesCache = entitiesCache.slice(0, 100);
      saveEntities();
    }
  },

  /**
   * Bulk ingest multiple comments
   */
  async bulkAddComments(comments: Comment[]): Promise<void> {
    comments.forEach(c => {
      const idx = commentsCache.findIndex(existing => existing.id === c.id);
      if (idx > -1) {
        commentsCache[idx] = c;
      } else {
        commentsCache.unshift(c);
      }
    });

    if (commentsCache.length > 1000) {
      commentsCache = commentsCache.slice(0, 1000);
    }
    saveComments();

    // Sync to Firestore in background tasks if available and quota healthy
    if (shouldAttemptFirestore()) {
      const CHUNK_SIZE = 25;
      for (let i = 0; i < comments.length; i += CHUNK_SIZE) {
        if (!shouldAttemptFirestore()) break;
        const chunk = comments.slice(i, i + CHUNK_SIZE);
        try {
          await Promise.all(
            chunk.map(async (comment) => {
              const commentPath = `comments/${comment.id}`;
              try {
                const sanitized = cleanForFirestore(comment);
                const docRef = doc(db!, "comments", comment.id);
                await setDoc(docRef, sanitized);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, commentPath);
              }
            })
          );
        } catch (batchErr) {
          if (isQuotaError(batchErr)) {
            tripFirestoreQuotaCircuitBreaker(batchErr, "bulkAddComments");
            break;
          }
        }
      }
    }
  },

  /**
   * Clears database and resets with standard archive
   */
  async resetDatabaseWithSeed(seeds: Comment[]): Promise<void> {
    commentsCache = [...seeds];
    saveComments();

    if (shouldAttemptFirestore()) {
      const CHUNK_SIZE = 25;
      for (let i = 0; i < seeds.length; i += CHUNK_SIZE) {
        if (!shouldAttemptFirestore()) break;
        const chunk = seeds.slice(i, i + CHUNK_SIZE);
        try {
          await Promise.all(
            chunk.map(async (comment) => {
              try {
                const sanitized = cleanForFirestore(comment);
                const docRef = doc(db!, "comments", comment.id);
                await setDoc(docRef, sanitized);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `comments/${comment.id}`);
              }
            })
          );
        } catch (batchErr) {
          if (isQuotaError(batchErr)) {
            tripFirestoreQuotaCircuitBreaker(batchErr, "resetDatabaseWithSeed");
            break;
          }
        }
      }
    }
  },

  /**
   * Saves accounts list dynamically to Firestore to sync across services
   */
  async saveAccountsToFirestore(accounts: Record<string, string[]>): Promise<void> {
    if (shouldAttemptFirestore()) {
      try {
        for (const [category, handles] of Object.entries(accounts)) {
          if (!shouldAttemptFirestore()) break;
          const categoryPath = `accounts/${category}`;
          try {
            const docRef = doc(db, "accounts", category);
            await setDoc(docRef, { handles });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, categoryPath);
          }
        }
        console.log("[FIREBASE MANAGER] Successfully synchronized accounts registry to Firestore cloud doc.");
      } catch (err) {
        if (isQuotaError(err)) {
          tripFirestoreQuotaCircuitBreaker(err, "saveAccountsToFirestore");
        } else {
          console.warn("[FIREBASE MANAGER] Accounts registry cloud replication notice:", err);
        }
      }
    }
  },

  /**
   * Gets specific trending words
   */
  async getTrends(): Promise<DBTrend[]> {
    return trendsCache;
  },

  /**
   * Save / overwrite trends
   */
  async saveTrends(trends: DBTrend[]): Promise<void> {
    trendsCache = trends;
    saveTrends();
  },

  /**
   * Gets list of extracted entities and frequencies
   */
  async getEntities(): Promise<DBMentionedEntity[]> {
    return entitiesCache;
  },

  /**
   * Retrieves full Named Entity Recognition (NER) and Topic Correlation insights
   */
  async getEntityInsights(): Promise<EntityTopicInsight[]> {
    if (entityInsightsCache.length === 0 && commentsCache.length > 0) {
      entityInsightsCache = compileEntityTopicInsights(commentsCache);
      saveEntityInsights();
    }
    return entityInsightsCache;
  },

  /**
   * Synchronizes recognized entities into Firestore /entities collection
   */
  async syncEntityInsightsToFirestore(insights?: EntityTopicInsight[]): Promise<void> {
    const list = insights || entityInsightsCache;
    if (shouldAttemptFirestore() && list.length > 0) {
      const topEntities = list.slice(0, 30);
      const CHUNK_SIZE = 10;
      for (let i = 0; i < topEntities.length; i += CHUNK_SIZE) {
        if (!shouldAttemptFirestore()) break;
        const chunk = topEntities.slice(i, i + CHUNK_SIZE);
        try {
          await Promise.all(
            chunk.map(async (ent) => {
              const entityPath = `entities/${ent.id}`;
              try {
                const sanitized = cleanForFirestore(ent);
                const docRef = doc(db!, "entities", ent.id);
                await setDoc(docRef, sanitized);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, entityPath);
              }
            })
          );
        } catch (err) {
          if (isQuotaError(err)) {
            tripFirestoreQuotaCircuitBreaker(err, "syncEntityInsightsToFirestore");
            break;
          }
        }
      }
      console.log(`[DATABASE MANAGER] Successfully synced ${topEntities.length} NER entities to Firestore.`);
    }
  },

  /**
   * Retrieves all major National Events or policy announcements
   */
  async getEvents(): Promise<NationalEvent[]> {
    if (shouldAttemptFirestore()) {
      const pathValue = "events";
      try {
        const eventsCol = collection(db, pathValue);
        const snapshot = await getDocs(eventsCol);
        const fbEvents: NationalEvent[] = [];
        snapshot.forEach(docSnap => {
          fbEvents.push(docSnap.data() as NationalEvent);
        });
        
        if (fbEvents.length > 0) {
          fbEvents.sort((a,b) => a.date.localeCompare(b.date));
          eventsCache = fbEvents;
          saveEvents();
          return fbEvents;
        }
      } catch (err) {
        if (isQuotaError(err)) {
          tripFirestoreQuotaCircuitBreaker(err, "getEvents");
        } else {
          console.warn("[DATABASE MANAGER] Firestore events read notice, using local cache:", err);
        }
      }
    }
    return eventsCache;
  },

  /**
   * Adds or updates a major event in the database
   */
  async addEvent(event: NationalEvent): Promise<void> {
    const existingIndex = eventsCache.findIndex(evt => evt.id === event.id);
    if (existingIndex > -1) {
      eventsCache[existingIndex] = event;
    } else {
      eventsCache.push(event);
    }
    eventsCache.sort((a,b) => a.date.localeCompare(b.date));
    saveEvents();

    if (shouldAttemptFirestore()) {
      const eventPath = `events/${event.id}`;
      try {
        const docRef = doc(db, "events", event.id);
        await setDoc(docRef, event);
        console.log("[DATABASE MANAGER] Firestore successfully wrote Event ID:", event.id);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, eventPath);
      }
    }
  },

  /**
   * Real-time storage health and quota diagnostics
   */
  getStatus() {
    return {
      firestoreConfigured: !!db,
      quotaExhausted: firestoreQuotaState.isQuotaExhausted,
      storageMode: firestoreQuotaState.isQuotaExhausted ? "LOCAL_STORAGE_FALLBACK" : (db ? "FIRESTORE_CLOUD" : "LOCAL_ONLY"),
      commentsCount: commentsCache.length,
      eventsCount: eventsCache.length,
      entitiesCount: entitiesCache.length,
      quotaMetric: firestoreQuotaState.quotaMetric,
      retryAfter: firestoreQuotaState.retryAfter
    };
  }
};
