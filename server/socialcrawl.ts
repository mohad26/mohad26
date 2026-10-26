/**
 * SocialCrawl Jordan Research Pipeline Engine
 * Implements:
 * - Exact Jordan Discovery Query across 8 sources (from_date: 2026-08-09 to 2026-09-08)
 * - Exponential backoff retry logic strictly on error.type:
 *   [RATE_LIMITED, CONCURRENCY_LIMIT, UPSTREAM_ERROR, SERVICE_UNAVAILABLE, INTERNAL_ERROR]
 * - Credit tracking (starting, used, remaining, request counters, cache hits)
 * - Pagination loop (pagination.has_more, pagination.next_cursor)
 * - Platform-specific comment retrieval (Reddit, YouTube, TikTok, Threads, Instagram, Twitter, LinkedIn, Facebook, Rumble)
 * - Graceful handling of posts with no comments, disabled comments, or errors
 * - Preservation of raw API responses in data/raw/<platform>/
 * - Table 1 (Posts) & Table 2 (Comments) normalization & deduplication
 * - 20-Category Jordan Issue Classification Layer
 * - Relevance Filtering (HIGH, MEDIUM, LOW)
 * - Language detection (Arabic, English, Arabic-English Mixed) + confidence
 * - Sentiment & Emotion analysis (conservative Arabic rules, criticism targeting)
 * - Geographic analysis (content mentions vs author location)
 * - Time-series aggregation & unusual spike detection
 * - Influential content rankings
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { databaseManager } from "./db.ts";
import { Comment, PlatformType } from "../src/types.ts";

export const SOCIALCRAWL_API_KEY = process.env.SOCIALCRAWL_API_KEY || "sc_HXA0EXWY5OjgAgNQX8Tuf0BgnyC8TZ1pjKkVuXNRc58";
export const SOCIALCRAWL_BASE_URL = "https://www.socialcrawl.dev/v1";

// EXACT DISCOVERY QUERY REQUIRED BY USER (Do not simplify or modify)
export const JORDAN_DISCOVERY_QUERY = '("Hashemite Kingdom of Jordan" OR Jordan OR الاردن OR الأردن OR Amman OR عمان OR Irbid OR إربد OR Zarqa OR الزرقاء OR Aqaba OR العقبة)';
export const DEFAULT_FROM_DATE = "2026-08-09";
export const DEFAULT_TO_DATE = "2026-09-08";
export const DEFAULT_SOURCES = "reddit,twitter-ai-search,youtube,tiktok,instagram,threads,linkedin,rumble";

export interface PipelineRunOptions {
  query?: string;
  from_date?: string;
  to_date?: string;
  sources?: string;
  maxCommentFetches?: number;
  skipComments?: boolean;
}

// Retryable error types according to SocialCrawl spec
export const RETRYABLE_ERROR_TYPES = new Set([
  "RATE_LIMITED",
  "CONCURRENCY_LIMIT",
  "UPSTREAM_ERROR",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_ERROR"
]);

// 20 Research-Oriented Issue Categories (Section 17)
export type JordanIssueCategory =
  | "Politics & Governance"
  | "Economy & Cost of Living"
  | "Employment & Unemployment"
  | "Education"
  | "Healthcare"
  | "Tourism"
  | "Water & Environment"
  | "Energy"
  | "Infrastructure & Transport"
  | "Technology & Digital Transformation"
  | "AI & Innovation"
  | "Business & Investment"
  | "Social Issues"
  | "Youth"
  | "Refugees & Migration"
  | "Foreign Policy & International Relations"
  | "Security"
  | "Culture & Identity"
  | "Sports"
  | "Other Jordan-related issue"
  | "Other / Not clearly Jordan-related";

export interface ResearchPost {
  post_id: string;
  platform: string;
  post_url: string;
  author_name: string;
  author_handle: string;
  author_id?: string;
  published_at: string;
  title: string;
  text: string;
  language: 'Arabic' | 'English' | 'Arabic-English Mixed' | 'Other';
  language_confidence: number;
  likes: number;
  comments_count: number;
  shares: number;
  views: number;
  engagement_total: number;
  search_query: string;
  search_from_date: string;
  search_to_date: string;
  retrieved_at: string;
  source_metadata: any;
  comments_status: 'available' | 'unavailable' | 'none' | 'error';
  
  // Research Classification Layer
  category: JordanIssueCategory;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  sentiment_score: number; // -1.0 to +1.0
  emotions: string[];
  criticism_target?: 'government' | 'specific_policy' | 'institution' | 'political_actor' | 'country' | 'general_frustration' | 'none';
  geographic_mentions: string[];
  author_location?: string;
  analysis_translation?: string;
}

export interface ResearchComment {
  comment_id: string;
  post_id: string;
  platform: string;
  post_url: string;
  comment_author: string;
  comment_author_handle: string;
  comment_author_id?: string;
  comment_text: string;
  comment_published_at: string;
  parent_comment_id?: string | null;
  likes: number;
  reply_count: number;
  language: 'Arabic' | 'English' | 'Arabic-English Mixed' | 'Other';
  language_confidence: number;
  retrieved_at: string;
  source_metadata: any;
  
  // Research Classification Layer
  category: JordanIssueCategory;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  sentiment_score: number;
  emotions: string[];
  criticism_target?: string;
  geographic_mentions: string[];
  analysis_translation?: string;
}

export interface PipelineTelemetry {
  api_connection: 'SUCCESS' | 'FAILED' | 'UNTESTED';
  starting_credits: number;
  credits_used: number;
  credits_remaining: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  cached_requests: number;
  retried_requests: number;
  last_request_id?: string;
  last_run_timestamp?: string;
  current_query?: string;
  synced_to_app?: number;
  logs: {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    platform?: string;
    endpoint?: string;
    message: string;
    details?: any;
  }[];
}

// File paths
const DATA_DIR = path.join(process.cwd(), "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const POSTS_FILE = path.join(DATA_DIR, "posts_db.json");
const COMMENTS_FILE = path.join(DATA_DIR, "research_comments_db.json");
const STATE_FILE = path.join(DATA_DIR, "socialcrawl_pipeline_state.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
  const platforms = ["search_everywhere", "reddit", "youtube", "tiktok", "threads", "instagram", "twitter", "linkedin", "facebook", "rumble"];
  for (const p of platforms) {
    const pDir = path.join(RAW_DIR, p);
    if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
  }
}

// Initial state
let telemetry: PipelineTelemetry = {
  api_connection: 'UNTESTED',
  starting_credits: 100,
  credits_used: 0,
  credits_remaining: 100,
  total_requests: 0,
  successful_requests: 0,
  failed_requests: 0,
  cached_requests: 0,
  retried_requests: 0,
  current_query: JORDAN_DISCOVERY_QUERY,
  synced_to_app: 0,
  logs: []
};

function loadState() {
  ensureDirs();
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      telemetry = { ...telemetry, ...data };
    } catch (e) {
      // ignore
    }
  }
}

function saveState() {
  ensureDirs();
  fs.writeFileSync(STATE_FILE, JSON.stringify(telemetry, null, 2), "utf-8");
}

function logMessage(level: 'INFO' | 'WARN' | 'ERROR', message: string, platform?: string, endpoint?: string, details?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    platform,
    endpoint,
    message,
    details
  };
  telemetry.logs.unshift(entry);
  if (telemetry.logs.length > 200) telemetry.logs = telemetry.logs.slice(0, 200);
  console.log(`[SocialCrawl][${level}] ${platform ? `[${platform}] ` : ""}${message}`);
  saveState();
}

/**
 * Executes an HTTP call to SocialCrawl with official retry logic branching on error.type
 */
export async function fetchSocialCrawl(
  endpointPath: string, 
  platformKey: string = "general", 
  params: Record<string, string> = {},
  maxRetries = 3
): Promise<any> {
  loadState();
  const urlObj = new URL(endpointPath.startsWith("http") ? endpointPath : `${SOCIALCRAWL_BASE_URL}${endpointPath}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      urlObj.searchParams.set(k, v);
    }
  }

  const url = urlObj.toString();
  let attempt = 0;
  let delay = 1000; // 1s initial delay

  while (attempt <= maxRetries) {
    attempt++;
    telemetry.total_requests++;
    
    try {
      logMessage('INFO', `Request attempt ${attempt}: ${url}`, platformKey, endpointPath);
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "x-api-key": SOCIALCRAWL_API_KEY,
          "Accept": "application/json"
        }
      });

      const json = await res.json();

      // Track credits from response envelope
      if (typeof json.credits_remaining === "number") {
        telemetry.credits_remaining = json.credits_remaining;
      }
      if (typeof json.credits_used === "number") {
        telemetry.credits_used += json.credits_used;
      }
      if (json.cached === true) {
        telemetry.cached_requests++;
      }
      if (json.request_id) {
        telemetry.last_request_id = json.request_id;
      }

      if (json.success === true) {
        telemetry.successful_requests++;
        telemetry.api_connection = 'SUCCESS';
        
        // Save raw API response to disk
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const safeId = json.request_id || crypto.randomUUID();
          const pDir = path.join(RAW_DIR, platformKey);
          if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
          const rawFile = path.join(pDir, `${timestamp}_${safeId}.json`);
          fs.writeFileSync(rawFile, JSON.stringify(json, null, 2), "utf-8");
        } catch (saveErr) {
          console.error("Failed to save raw API json:", saveErr);
        }

        saveState();
        return json;
      }

      // Check error type
      const errType = json.error?.type || "UNKNOWN_ERROR";
      logMessage('WARN', `API returned error: ${errType} (${json.error?.message})`, platformKey, endpointPath, { attempt, error: json.error });

      // Check if retryable based strictly on error.type
      if (RETRYABLE_ERROR_TYPES.has(errType) && attempt <= maxRetries) {
        telemetry.retried_requests++;
        logMessage('INFO', `Retrying ${errType} with backoff delay ${delay}ms...`, platformKey, endpointPath, { attempt });
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // exponential backoff
        continue;
      }

      // Non-retryable error
      telemetry.failed_requests++;
      saveState();
      return json;

    } catch (networkErr: any) {
      logMessage('ERROR', `Network error: ${networkErr.message}`, platformKey, endpointPath, { attempt });
      if (attempt <= maxRetries) {
        telemetry.retried_requests++;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      telemetry.failed_requests++;
      saveState();
      throw networkErr;
    }
  }

  saveState();
  return null;
}

/**
 * Verify SocialCrawl API connection & credits balance (Section 6)
 */
export async function verifyApiConnection() {
  loadState();
  try {
    const res = await fetchSocialCrawl("/credits/balance", "meta");
    if (res && res.success) {
      telemetry.api_connection = 'SUCCESS';
      telemetry.credits_remaining = res.data?.balance ?? res.credits_remaining ?? 100;
      telemetry.starting_credits = telemetry.credits_remaining + telemetry.credits_used;
      saveState();
      return {
        connection: "SUCCESS",
        credits_remaining: telemetry.credits_remaining,
        credits_used: telemetry.credits_used,
        request_id: res.request_id,
        balance: res.data?.balance
      };
    } else {
      telemetry.api_connection = 'FAILED';
      saveState();
      return {
        connection: "FAILED",
        credits_remaining: telemetry.credits_remaining,
        credits_used: telemetry.credits_used,
        error: res?.error || "Unknown API error"
      };
    }
  } catch (err: any) {
    telemetry.api_connection = 'FAILED';
    saveState();
    return {
      connection: "FAILED",
      credits_remaining: telemetry.credits_remaining,
      credits_used: telemetry.credits_used,
      error: err.message
    };
  }
}

// -------------------------------------------------------------
// RESEARCH CLASSIFICATION LAYER (Sections 17-20, 24)
// -------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<JordanIssueCategory, string[]> = {
  "Politics & Governance": ["حكومة", "مجلس النواب", "الملك", "البرلمان", "وزارة", "انتخابات", "دستور", "أحزاب", "بشر الخصاونة", "جعفر حسان", "الديوان الملكي", "ولي العهد", "الأمير حسين", "parliament", "king abdullah", "government", "crown prince", "election", "cabinet"],
  "Economy & Cost of Living": ["غلاء", "أسعار", "ضريبة", "تضخم", "رواتب", "معيشة", "قروض", "فوائد", "دينار", "سلة الغذاء", "طفر", "فقر", "غلاء المعيشة", "سعر الدجاج", "سعر اللحمة", "قسط", "سلفة", "تأكل الدخل", "قدرة شرائية", "inflation", "tax", "price", "cost of living", "salary", "economy", "jod", "purchasing power"],
  "Employment & Unemployment": ["بطالة", "وظائف", "تشغيل", "فرص عمل", "ديوان الخدمة", "هيئه الخدمه", "تدريب مهني", "عاطل", "خريجين", "عقد عمل", "خريج", " jobs ", "unemployment", "hiring", "workforce", "career"],
  "Education": ["توجيهي", "جامعة", "مدرسة", "معلم", "مناهج", "وزارة التربية", "الجامعة الأردنية", "اليرموك", "الهاشمية", "تكنو", "جامعة آل البيت", "جامعة مؤتة", "جامعة الطفيلة", "جامعة الحسين", "البلقاء التطبيقية", "tawjihi", "university", "school", "education", "students"],
  "Healthcare": ["مستشفى", "صحة", "تأمين صحي", "أدوية", "طبيب", "مركز صحي", "مدينة الحسين الطبية", "مستشفى البشير", "مستشفى المفرق", "مستشفى الأميرة بسمة", "مستشفى الملك المؤسس", "طوارئ", "علاج", "نقص أدوية", "تحويلات طبية", "hospital", "health", "medical", "doctor", "medicine", "clinic"],
  "Tourism": ["البترا", "وادي رم", "البحر الميت", "عجلون", "جرش", "العقبة", "سياحة", "تلفريك", "أردنا جنة", "فندق", "آثار", "أم الجمال", "المغطس", "قلعة الكرك", "قلعة عجلون", "petra", "wadi rum", "dead sea", "tourism", "travel", "jerash", "visit jordan", "cable car"],
  "Water & Environment": ["مياه", "الماء", "شح المياه", "سد", "سدود", "الناقل الوطني", "انقطاع الماء", "بيئة", "تلوث", "تنك مي", "مياهنا", "شركة اليرموك", "آبار البادية", "شح مياه", "انقطاع مياه", "water", "drought", "dam", "environment", "water shortage"],
  "Energy": ["كهرباء", "طاقة", "بنزين", "سولار", "مشتقات نفطية", "غاز", "طاقة شمسية", "فاتورة الكهرباء", "انقطاع الكهرباء", "كاز", "محروقات", "تسعيرة المحروقات", "electricity", "energy", "fuel", "solar energy", "power bill"],
  "Infrastructure & Transport": ["الباص السريع", "باص عمان", "مواصلات", "طرق", "سير", "ازدحام", "نقل", "مطار الملكة علياء", "جسر", "بلدية", "مجمع صويلح", "محطة الزرقاء", "خط باص", "أجرة", "ترخيص", "حفر", "شوارع", "transport", "brt", "traffic", "roads", "infrastructure", "airport", "amman bus"],
  "Technology & Digital Transformation": ["سند", "sanad", "منصة سند", "تطبيق سند", "تحول رقمي", "أتمتة", "تكنولوجيا", "اتصالات", "أورنج", "زين", "أمنية", "خدمات إلكترونية", "digital transformation", "telecom", "it sector", "information technology", "e-government"],
  "AI & Innovation": ["ذكاء اصطناعي", "ابتكار", "ريادة أعمال", "شركات ناشئة", "حاضنة", "نموذج ذكاء", "artificial intelligence", "startup", "innovation", "genai", "deeptech"],
  "Business & Investment": ["استثمار", "تجارة", "صناعة", "غرفة تجارة", "شركات", "بورصة عمان", "منطقة حرة", "عقبة اقتصادية", "صادرات", "صناعيين", "business", "investment", "trade", "chamber of commerce"],
  "Social Issues": [
    "الضمان الاجتماعي", "الضمان", "صندوق المعونة", "معونة وطنية", "تكافل", "دعم نقدي", "حماية اجتماعية", 
    "تعديل قانون الضمان", "التقاعد المبكر", "رواتب تقاعدية", "اقتطاعات الضمان", "أموال الضمان", "ديون الضمان",
    "عجز", "تعويض", "حرمان من المعونة", "الدعم التكميلي", "سكن كريم", "أسر عفيفة", "فقر", "مظلة الأمان", 
    "شبكة الأمان", "عنف أسري", "حقوق المرأة", "معونة الشتاء", "بطاقة الخير", "social protection", "social security", 
    "pension", "welfare", "subsidies", "early retirement", "ssc jordan", "national aid fund"
  ],
  "Youth": ["شباب", "مبادرات شبابية", "رياديين", "أندية شبابية", "طاقات شبابية", "تمكين الشباب", "youth", "young jordanians"],
  "Refugees & Migration": ["لاجئين", "مخيم الزعتري", "سوريين", "أونروا", "مفوضية اللاجئين", "هجرة", "نزوح", "مخيمات", "refugees", "zaatari", "unhcr", "unrwa", "migration"],
  "Foreign Policy & International Relations": ["سياسة خارجية", "علاقات دولية", "قمة", "مساعدات غزة", "إنزال جوي", "جامعة الدول العربية", "فلسطين", "سلام", "اتفاقية", "foreign policy", "diplomacy", "international relations", "gaza air drops"],
  "Security": ["أمن", "جيش", "قوات مسلحة", "أمن عام", "مخابرات", "حرس الحدود", "مخدرات", "تهريب", "قاعدة عسكرية", "نشامى الجيش", "military", "army", "security", "border guard", "police"],
  "Culture & Identity": ["هوية", "تراث", "منسف", "شماغ", "نشامى", "دحية", "مهرجان جرش", "أغاني وطنية", "بدو", "فلكلور", "أكلات أردنية", "culture", "heritage", "mansaf", "nashama", "identity"],
  "Sports": ["فيصلي", "وحدات", "نشامى كورة", "كرة قدم", "كأس آسيا", "حسين عموتة", "جمال سلامي", "موسى التعمري", "يزن النعيمات", "اتحاد كرة القدم", "الدوري الأردني", "sports", "football", "soccer", "asian cup"],
  "Other Jordan-related issue": ["الأردن", "أردني", "عمان", "المملكة", "jordan", "jordanian", "amman"],
  "Other / Not clearly Jordan-related": []
};

const GEOGRAPHIC_ENTITIES = [
  { name: "Amman", tokens: ["عمان", "عمّان", "amman", "العاصمة", "دابوق", "عبدون", "الصويفية", "الجبيهة", "شفا بدران", "طريق المطار", "صويلح", "ماركا", "المقابلين", "طبربور"] },
  { name: "Irbid", tokens: ["إربد", "اربد", "irbid", "عروس الشمال", "الرمثا", "بني كنانة", "الأغوار الشمالية", "الكورة", "المزار الشمالي", "طيبة إربد", "جامعة اليرموك"] },
  { name: "Zarqa", tokens: ["الزرقاء", "الزرقا", "zarqa", "الرصيفة", "الهاشمية", "حي معصوم", "محطة الزرقاء", "ياجوز"] },
  { name: "Aqaba", tokens: ["العقبة", "العقبه", "aqaba", "ثغر الأردن الباسم", "أيلة", "ميناء العقبة", "الشاطئ الجنوبي", "الديسة"] },
  { name: "Salt / Balqa", tokens: ["السلط", "البلقاء", "salt", "balqa", "الفحيص", "ماحص", "دير علا", "الشونة الجنوبية", "عين الباشا", "البقعة"] },
  { name: "Jerash", tokens: ["جرش", "jerash", "سوف", "ساكب", "مهرجان جرش", "غابات دبين"] },
  { name: "Ajloun", tokens: ["عجلون", "ajloun", "تلفريك عجلون", "قلعة عجلون", "عنجرة", "كفرنجة", "صخرة", "غابات عجلون"] },
  { name: "Madaba", tokens: ["مأدبا", "مادبا", "madaba", "ذيبان", "جبل نيبو", "المكاور", "ماعين"] },
  { name: "Karak", tokens: ["الكرك", "karak", "مؤتة", "المزار الجنوبي", "القطرانة", "الأغوار الجنوبية", "غور الصافي", "قلعة الكرك", "جامعة مؤتة"] },
  { name: "Tafilah", tokens: ["الطفيلة", "الطفيله", "tafilah", "ضانا", "بصيرا", "الحسا", "عين البيضاء", "جامعة الطفيلة"] },
  { name: "Ma'an", tokens: ["معان", "maan", "الشوبك", "القاسمية", "إيل", "الجفر", "جامعة الحسين بن طلال"] },
  { name: "Mafraq", tokens: ["المفرق", "مفرق", "mafraq", "البادية الشمالية", "بادية الشمال", "الرويشد", "الصفاوي", "الزعتري", "مخيم الزعتري", "بلعما", "رحاب", "المنشية", "جامعة آل البيت", "مستشفى المفرق", "أم الجمال", "الخالدية", "صبحا", "حدود جابر"] },
  { name: "Petra", tokens: ["البترا", "البتراء", "petra", "وادي موسى"] },
  { name: "Wadi Rum", tokens: ["وادي رم", "wadi rum", "رم"] },
  { name: "Dead Sea", tokens: ["البحر الميت", "dead sea", "سياحة البحر الميت"] }
];

export function detectLanguage(text: string): { language: 'Arabic' | 'English' | 'Arabic-English Mixed' | 'Other'; confidence: number } {
  if (!text) return { language: 'Other', confidence: 0 };
  const arabicRegex = /[\u0600-\u06FF]/g;
  const englishRegex = /[a-zA-Z]/g;

  const arabicChars = (text.match(arabicRegex) || []).length;
  const englishChars = (text.match(englishRegex) || []).length;
  const totalLetters = arabicChars + englishChars;

  if (totalLetters === 0) return { language: 'Other', confidence: 0.5 };

  const arabicRatio = arabicChars / totalLetters;
  const englishRatio = englishChars / totalLetters;

  if (arabicRatio > 0.25 && englishRatio > 0.25) {
    return { language: 'Arabic-English Mixed', confidence: Number(Math.min(arabicRatio, englishRatio).toFixed(2)) + 0.5 };
  } else if (arabicRatio >= 0.6) {
    return { language: 'Arabic', confidence: Number(arabicRatio.toFixed(2)) };
  } else if (englishRatio >= 0.6) {
    return { language: 'English', confidence: Number(englishRatio.toFixed(2)) };
  } else {
    return { language: arabicRatio >= englishRatio ? 'Arabic' : 'English', confidence: 0.6 };
  }
}

export function detectRelevance(text: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!text) return 'LOW';
  const lower = text.toLowerCase();
  
  // Incidental / shoe / sneaker detection (LOW relevance)
  if (lower.includes("jordan 9") || lower.includes("air jordan") || lower.includes("retro") || lower.includes("space jam") || lower.includes("viral toy") || lower.includes("sneakers")) {
    return 'LOW';
  }

  // High indicator keywords
  const highIndicators = [
    "hashemite kingdom of jordan", "المملكة الأردنية الهاشمية", "المجلس الاقتصادي والاجتماعي",
    "الحكومة الأردنية", "الملك عبد الله", "النشامى", "مجلس النواب", "الشعب الأردني", "عمان الغربية",
    "البترا", "وادي رم", "مستشفى", "توجيهي", "الباص السريع", "الضمان الاجتماعي", "الأردن", "الأردنيين",
    "محافظة", "إربد", "الزرقاء", "العقبة", "jordanian", "amman"
  ];

  let matches = 0;
  for (const ind of highIndicators) {
    if (lower.includes(ind)) matches++;
  }

  if (matches >= 2 || lower.includes("hashemite kingdom of jordan") || lower.includes("المملكة الأردنية الهاشمية")) {
    return 'HIGH';
  } else if (matches === 1 || lower.includes("jordan") || lower.includes("الاردن")) {
    return 'MEDIUM';
  }

  return 'LOW';
}

export function classifyIssueCategory(text: string): JordanIssueCategory {
  if (!text) return "Other / Not clearly Jordan-related";
  const lower = text.toLowerCase();

  // Check relevance first
  const rel = detectRelevance(text);
  if (rel === 'LOW') {
    return "Other / Not clearly Jordan-related";
  }

  // Direct high-priority sector heuristics to avoid "Other" or "Unclassified"
  if (lower.includes("ضمان") || lower.includes("معونة") || lower.includes("تكافل") || lower.includes("تقاعد") || lower.includes("حماية اجتماعية") || lower.includes("أسر عفيفة") || lower.includes("pension") || lower.includes("welfare")) {
    return "Social Issues";
  }
  if (lower.includes("مياه") || lower.includes("شح المياه") || lower.includes("سد") || lower.includes("تنك مي") || lower.includes("آبار") || lower.includes("الناقل الوطني")) {
    return "Water & Environment";
  }
  if (lower.includes("باص") || lower.includes("سريع") || lower.includes("مواصلات") || lower.includes("أزمة") || lower.includes("طرق") || lower.includes("سير")) {
    return "Infrastructure & Transport";
  }
  if (lower.includes("مستشفى") || lower.includes("صحة") || lower.includes("دواء") || lower.includes("أدوية") || lower.includes("طبيب") || lower.includes("مركز صحي")) {
    return "Healthcare";
  }
  if (lower.includes("توجيهي") || lower.includes("جامعة") || lower.includes("مدرسة") || lower.includes("تعليم") || lower.includes("طالب")) {
    return "Education";
  }
  if (lower.includes("بطالة") || lower.includes("وظائف") || lower.includes("تشغيل") || lower.includes("فرص عمل") || lower.includes("ديوان الخدمة") || lower.includes("عاطل")) {
    return "Employment & Unemployment";
  }
  if (lower.includes("تلفريك") || lower.includes("بترا") || lower.includes("رم") || lower.includes("سياحة") || lower.includes("عجلون") || lower.includes("جرش") || lower.includes("العقبة") || lower.includes("أم الجمال")) {
    return "Tourism";
  }
  if (lower.includes("سند") || lower.includes("sanad") || lower.includes("تحول رقمي") || lower.includes("أتمتة") || lower.includes("خدمات إلكترونية")) {
    return "Technology & Digital Transformation";
  }

  let bestCategory: JordanIssueCategory = "Other Jordan-related issue";
  let maxMatches = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === "Other / Not clearly Jordan-related" || cat === "Other Jordan-related issue") continue;
    let count = 0;
    for (const kw of keywords) {
      if (kw.length <= 4) {
        const regex = new RegExp(`(^|[^a-zA-Z0-9\u0600-\u06FF])${kw}([^a-zA-Z0-9\u0600-\u06FF]|$)`, "i");
        if (regex.test(lower)) count++;
      } else if (lower.includes(kw.toLowerCase())) {
        count++;
      }
    }
    if (count > maxMatches) {
      maxMatches = count;
      bestCategory = cat as JordanIssueCategory;
    }
  }

  return bestCategory;
}

export function detectGeographicMentions(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const mentioned: string[] = [];

  for (const geo of GEOGRAPHIC_ENTITIES) {
    for (const tok of geo.tokens) {
      if (lower.includes(tok.toLowerCase())) {
        if (!mentioned.includes(geo.name)) {
          mentioned.push(geo.name);
        }
        break;
      }
    }
  }

  return mentioned;
}

export function analyzeSentimentAndEmotion(text: string): {
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  sentimentScore: number;
  emotions: string[];
  criticismTarget?: 'government' | 'specific_policy' | 'institution' | 'political_actor' | 'country' | 'general_frustration' | 'none';
} {
  if (!text) return { sentiment: 'Neutral', sentimentScore: 0, emotions: [] };
  const lower = text.toLowerCase();

  const positiveTerms = [
    "مبروك", "رائع", "كفو", "نشامى", "فخر", "إنجاز", "ممتاز", "عاش", "الله يحمي", "تسلم", "أجمل", 
    "امن وامان", "حب", "جميل", "great", "proud", "love", "amazing", "success", "blessed", "progress", 
    "تطور", "خطوة مباركة", "شكرا", "يسلموا", "الله يعطيهم العافية", "خدمة ممتازة", "جهود مشكورة"
  ];

  const negativeTerms = [
    "فساد", "غلاء", "طفر", "سرقة", "كذابين", "خراب", "حسبي الله", "ظلم", "فاشل", "كارثة", "اعتداء", 
    "قصف", "قتل", "حرب", "خيانة", "anger", "crisis", "attack", "killed", "corrupt", "failed", "disaster", 
    "expensive", "اقتطاع", "اقتطاعات", "خصم", "خصومات", "مجحف", "ما بكفي", "مش مكفي", "شحده", "مأساة", 
    "تعبنا", "قهر", "حرامية", "نصب", "احتيال", "استغلال", "تضييق", "مهزلة", "مسخرة", "نقص", "جوع", 
    "بهدلة", "ضياع", "حسرة", "انقطاع", "وعود كاذبة", "لا حياة لمن تنادي", "استهتار", "رديء", "سيء", 
    "بدون فائدة", "خراب بيوت", "صعوبة", "إحباط", "تطنيش", "مماطلة", "بيروقراطية معقدة", "ما استفدنا", 
    "حكي فاضي", "شروط تعجيزية", "سلب", "نهب", "تآكل", "حرمان", "تأخير", "مماطل", "كفى", "غير مقبول", 
    "وقف الدعم", "تخفيض الرواتب", "رفع الأسعار", "تدهور", "نقص الأدوية", "شح المياه", "معاناة"
  ];

  const mixedTerms = ["ولكن", "لكن", "مع ذلك", "بس", "however", "although", "but"];

  // Emotion lexicons (Section 20)
  const emotionMap: Record<string, string[]> = {
    "anger": ["غضب", "حسبي الله", "حقيرين", "عار", "سخط", "حرامية", "مهزلة", "anger", "rage", "furious"],
    "concern": ["قلق", "خوف", "توتر", "ساتر", "يا رب تستر", "concern", "worry", "tense"],
    "frustration": ["زهقنا", "قرفنا", "تعبنا", "كفاية", "طفر", "تعبنا", "ما بكفي", "frustration", "tired", "annoying"],
    "optimism": ["أمل", "خير", "إن شاء الله", "مستقبل", "تفاؤل", "optimism", "hopeful", "bright"],
    "satisfaction": ["الحمد لله", "راضيين", "ممتاز", "كويس", "satisfaction", "content", "satisfied"],
    "fear": ["مرعب", "خايفين", "فزع", "fear", "scared", "terrified"],
    "disappointment": ["خيبة أمل", "كنا متوقعين أحسن", "خذلان", "حكي فاضي", "disappointed", "letdown"],
    "hope": ["يا رب", "نأمل", "فرصة", "بإذن الله", "hope", "wish"],
    "sarcasm/irony": ["يا سلام", "ما شاء الله على الإنجاز", "طبعا طبعا", "sarcasm", "sure sure", "lmao"]
  };

  let posCount = 0;
  for (const t of positiveTerms) if (lower.includes(t)) posCount++;

  let negCount = 0;
  for (const t of negativeTerms) if (lower.includes(t)) negCount++;

  const hasMixed = mixedTerms.some(t => lower.includes(t));

  const emotions: string[] = [];
  for (const [em, tokens] of Object.entries(emotionMap)) {
    if (tokens.some(tok => lower.includes(tok))) {
      emotions.push(em);
    }
  }

  // Distinguish criticism targets (Section 20)
  let criticismTarget: 'government' | 'specific_policy' | 'institution' | 'political_actor' | 'country' | 'general_frustration' | 'none' = 'none';

  if (negCount > 0) {
    if (lower.includes("حكومة") || lower.includes("رئيس الوزراء") || lower.includes("الوزراء") || lower.includes("cabinet")) {
      criticismTarget = 'government';
    } else if (lower.includes("ضريبة") || lower.includes("قانون") || lower.includes("تسعيرة") || lower.includes("سياسة") || lower.includes("قرار") || lower.includes("تقاعد") || lower.includes("اقتطاع")) {
      criticismTarget = 'specific_policy';
    } else if (lower.includes("مستشفى") || lower.includes("أمانة") || lower.includes("بلدية") || lower.includes("شركة") || lower.includes("جامعة") || lower.includes("ضمان") || lower.includes("صندوق المعونة")) {
      criticismTarget = 'institution';
    } else if (lower.includes("نائب") || lower.includes("وزير") || lower.includes("مسؤول")) {
      criticismTarget = 'political_actor';
    } else if (lower.includes("بلد") || lower.includes("البلاد")) {
      criticismTarget = 'general_frustration';
    } else {
      criticismTarget = 'general_frustration';
    }
  }

  // Dedicated handling for Social Protection (Social Security, National Aid Fund, Pensions)
  // Per user requirement: Citizen feedback regarding social protection is predominantly critical in reality
  const isSocialProtectionIssue = lower.includes("ضمان") || lower.includes("معونة") || lower.includes("تكافل") || lower.includes("تقاعد") || lower.includes("أسر عفيفة");
  const hasGrievanceTerm = [
    "خصم", "اقتطاع", "اقتطاعات", "قليل", "ضعيف", "ما بكفي", "مش مكفي", "ظلم", "حرمان", "وقف", 
    "تأخير", "مماطلة", "رفض", "تعديل", "سنوات الخدمة", "شروط", "صعب", "معقد", "حسبي الله", 
    "غلاء", "طفر", "تآكل", "فقر", "ديون", "أموال الضمان"
  ].some(g => lower.includes(g));

  let sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed' = 'Neutral';
  let score = 0;

  if (isSocialProtectionIssue && (hasGrievanceTerm || negCount > 0)) {
    sentiment = 'Negative';
    score = Number(Math.max(-0.95, -0.45 - (negCount + 1) * 0.15).toFixed(2));
    criticismTarget = 'specific_policy';
    if (!emotions.includes("frustration")) emotions.push("frustration");
    if (!emotions.includes("disappointment")) emotions.push("disappointment");
  } else if (posCount > 0 && negCount > 0) {
    sentiment = 'Mixed';
    score = Number(((posCount - negCount) / (posCount + negCount)).toFixed(2));
  } else if (posCount > negCount) {
    sentiment = 'Positive';
    score = Number(Math.min(1.0, 0.3 + posCount * 0.25).toFixed(2));
  } else if (negCount > posCount) {
    sentiment = 'Negative';
    score = Number(Math.max(-1.0, -0.3 - negCount * 0.25).toFixed(2));
  } else {
    sentiment = 'Neutral';
    score = 0;
  }

  return { sentiment, sentimentScore: score, emotions, criticismTarget };
}

// -------------------------------------------------------------
// POSTS & COMMENTS NORMALIZATION AND RETRIEVAL
// -------------------------------------------------------------

export function loadNormalizedPosts(): ResearchPost[] {
  ensureDirs();
  if (fs.existsSync(POSTS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(POSTS_FILE, "utf-8"));
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function saveNormalizedPosts(posts: ResearchPost[]) {
  ensureDirs();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
}

export function loadNormalizedComments(): ResearchComment[] {
  ensureDirs();
  if (fs.existsSync(COMMENTS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function saveNormalizedComments(comments: ResearchComment[]) {
  ensureDirs();
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), "utf-8");
}

/**
 * Normalizes an item from Search Everywhere into a Table 1 Post
 */
export function normalizeSearchEverywhereItem(item: any, query: string, fromDate: string, toDate: string): ResearchPost {
  const sourceItem = (item.source_items && item.source_items[0]) ? item.source_items[0] : {};
  const platform = item.source || sourceItem.source || "web";
  const postUrl = item.url || sourceItem.url || item.candidate_id || "";
  const postId = item.item_id || sourceItem.item_id || crypto.createHash("md5").update(`${platform}:${postUrl}`).digest("hex");
  const authorName = sourceItem.author || item.author || "Citizen Contributor";
  const authorHandle = `@${authorName.toLowerCase().replace(/\s+/g, "_")}`;
  const publishedAt = sourceItem.published_at || item.published_at || new Date().toISOString();
  const title = item.title || sourceItem.title || "";
  const text = sourceItem.body || item.snippet || item.title || "";
  const fullContent = `${title}\n${text}`.trim();

  // Engagement metrics
  const likes = sourceItem.engagement?.likes ?? item.engagement ?? 0;
  const commentsCount = sourceItem.engagement?.comments ?? 0;
  const shares = sourceItem.engagement?.shares ?? 0;
  const views = sourceItem.engagement?.views ?? 0;
  const engagementTotal = likes + commentsCount + shares;

  // Language & Relevance
  const langResult = detectLanguage(fullContent);
  const relevance = detectRelevance(fullContent);
  const category = classifyIssueCategory(fullContent);
  const geoMentions = detectGeographicMentions(fullContent);
  const sentimentResult = analyzeSentimentAndEmotion(fullContent);

  return {
    post_id: postId,
    platform,
    post_url: postUrl,
    author_name: authorName,
    author_handle: authorHandle,
    author_id: sourceItem.author_id,
    published_at: publishedAt,
    title,
    text: fullContent,
    language: langResult.language,
    language_confidence: langResult.confidence,
    likes,
    comments_count: commentsCount,
    shares,
    views,
    engagement_total: engagementTotal,
    search_query: query,
    search_from_date: fromDate,
    search_to_date: toDate,
    retrieved_at: new Date().toISOString(),
    source_metadata: sourceItem.metadata || {},
    comments_status: commentsCount > 0 ? 'available' : 'none',
    category,
    relevance,
    sentiment: sentimentResult.sentiment,
    sentiment_score: sentimentResult.sentimentScore,
    emotions: sentimentResult.emotions,
    criticism_target: sentimentResult.criticismTarget,
    geographic_mentions: geoMentions
  };
}

/**
 * Normalizes comments from platform endpoints (Reddit, TikTok, YouTube, Threads, etc.)
 */
export function normalizePlatformComments(
  rawComments: any[], 
  post: ResearchPost
): ResearchComment[] {
  const normalizedList: ResearchComment[] = [];

  function walkComments(list: any[], parentId: string | null = null) {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      // Different envelope shapes: { comment: { ... } } or { text, ... }
      const c = entry.comment || entry;
      if (!c) continue;

      const rawText = c.text || c.body || c.text_original || "";
      if (!rawText || rawText.trim().length === 0) continue;

      const commentId = c.id || crypto.createHash("md5").update(`${post.platform}:${post.post_id}:${rawText}:${c.published_at || ""}`).digest("hex");
      const author = c.author?.username || c.author?.display_name || c.author || "Anonymous";
      const authorHandle = `@${author.replace(/^@/, "")}`;
      const publishedAt = c.published_at || new Date().toISOString();
      const likes = c.engagement?.likes ?? c.likes ?? 0;
      const replyCount = c.engagement?.replies ?? c.replies?.length ?? 0;

      const lang = detectLanguage(rawText);
      const rel = detectRelevance(rawText);
      const cat = classifyIssueCategory(rawText);
      const geo = detectGeographicMentions(rawText);
      const sent = analyzeSentimentAndEmotion(rawText);

      normalizedList.push({
        comment_id: commentId,
        post_id: post.post_id,
        platform: post.platform,
        post_url: post.post_url,
        comment_author: author,
        comment_author_handle: authorHandle,
        comment_author_id: c.author?.id || c.author_id,
        comment_text: rawText,
        comment_published_at: publishedAt,
        parent_comment_id: c.parent_id || parentId,
        likes,
        reply_count: replyCount,
        language: lang.language,
        language_confidence: lang.confidence,
        retrieved_at: new Date().toISOString(),
        source_metadata: c.ext || {},
        category: cat === "Other / Not clearly Jordan-related" ? post.category : cat,
        relevance: rel === "LOW" && post.relevance !== "LOW" ? "MEDIUM" : rel,
        sentiment: sent.sentiment,
        sentiment_score: sent.sentimentScore,
        emotions: sent.emotions,
        criticism_target: sent.criticismTarget,
        geographic_mentions: geo
      });

      // Recurse replies if nested
      if (entry.replies && Array.isArray(entry.replies)) {
        walkComments(entry.replies, commentId);
      } else if (c.replies && Array.isArray(c.replies)) {
        walkComments(c.replies, commentId);
      }
    }
  }

  walkComments(rawComments);
  return normalizedList;
}

/**
 * Fetch comments for a specific post using its platform endpoint
 */
export async function fetchCommentsForPost(post: ResearchPost): Promise<ResearchComment[]> {
  const platform = post.platform.toLowerCase();
  const url = post.post_url;

  if (!url || !url.startsWith("http")) {
    post.comments_status = "unavailable";
    return [];
  }

  let endpoint = "";
  let platformDir = platform;
  const params: Record<string, string> = { url };

  if (platform.includes("reddit")) {
    endpoint = "/reddit/post/comments";
    platformDir = "reddit";
  } else if (platform.includes("youtube")) {
    endpoint = "/youtube/video/comments";
    platformDir = "youtube";
    params["order"] = "newest";
  } else if (platform.includes("tiktok")) {
    endpoint = "/tiktok/post/comments";
    platformDir = "tiktok";
  } else if (platform.includes("threads")) {
    endpoint = "/threads/post/comments";
    platformDir = "threads";
    params["limit"] = "25";
  } else if (platform.includes("instagram")) {
    endpoint = "/instagram/post/comments";
    platformDir = "instagram";
    params["sort"] = "recent";
  } else if (platform.includes("twitter") || platform.includes("x")) {
    endpoint = "/twitter/tweet/replies";
    platformDir = "twitter";
  } else if (platform.includes("facebook")) {
    endpoint = "/facebook/post/comments";
    platformDir = "facebook";
  } else if (platform.includes("linkedin")) {
    endpoint = "/linkedin/post/comments";
    platformDir = "linkedin";
    params["page"] = "1";
    params["sort_order"] = "recent";
  } else {
    post.comments_status = "unavailable";
    return [];
  }

  try {
    logMessage('INFO', `Fetching comments for ${post.platform} post: ${url}`, platformDir, endpoint);
    const response = await fetchSocialCrawl(endpoint, platformDir, params);
    
    if (response && response.success) {
      let rawList: any[] = [];
      if (Array.isArray(response.data)) {
        rawList = response.data;
      } else if (response.data && Array.isArray(response.data.items)) {
        rawList = response.data.items;
      } else if (response.data && Array.isArray(response.data.comments)) {
        rawList = response.data.comments;
      }

      if (rawList.length > 0) {
        post.comments_status = "available";
        const normalized = normalizePlatformComments(rawList, post);
        return normalized;
      } else {
        post.comments_status = "none";
        return [];
      }
    } else {
      post.comments_status = "unavailable";
      return [];
    }
  } catch (err: any) {
    post.comments_status = "error";
    logMessage('WARN', `Comments retrieval failed for ${url}: ${err.message}`, platformDir, endpoint);
    return [];
  }
}

/**
 * Synchronizes discovered SocialCrawl posts and comments into the core application database
 * (databaseManager.bulkAddComments), ensuring the main dashboards, policy sectors, analytics,
 * and Jordan Map reflect 100% of the live scraped research data.
 */
export async function syncSocialCrawlToApplication(
  postsInput?: ResearchPost[],
  commentsInput?: ResearchComment[]
): Promise<{ syncedCommentsCount: number; syncedPostsCount: number; totalInApp: number }> {
  const posts = postsInput || loadNormalizedPosts();
  const comments = commentsInput || loadNormalizedComments();

  const mappedComments: Comment[] = [];

  // Helper to map category to app policy sector and theme
  const mapCategoryToTheme = (cat: string, text: string): { topic: string; themeId: string } => {
    const lower = text.toLowerCase();
    if (
      cat === "Social Issues" ||
      lower.includes("ضمان") ||
      lower.includes("معونة") ||
      lower.includes("تكافل") ||
      lower.includes("تقاعد") ||
      lower.includes("أسر عفيفة") ||
      lower.includes("حماية اجتماعية")
    ) {
      return { topic: "Social Protection", themeId: "social_protection" };
    }
    if (cat === "Water & Environment" || lower.includes("مياه") || lower.includes("سد") || lower.includes("تنك مي") || lower.includes("آبار")) {
      return { topic: "Energy & Water", themeId: "energy_water" };
    }
    if (cat === "Infrastructure & Transport" || lower.includes("باص") || lower.includes("مواصلات") || lower.includes("سريع")) {
      return { topic: "Public Transport", themeId: "public_transport" };
    }
    if (cat === "Healthcare" || lower.includes("مستشفى") || lower.includes("صحة") || lower.includes("دواء") || lower.includes("أدوية")) {
      return { topic: "Healthcare", themeId: "healthcare" };
    }
    if (cat === "Tourism" || lower.includes("سياحة") || lower.includes("بترا") || lower.includes("رم") || lower.includes("تلفريك")) {
      return { topic: "Tourism", themeId: "tourism" };
    }
    if (cat === "Education" || lower.includes("جامعة") || lower.includes("مدرسة") || lower.includes("توجيهي")) {
      return { topic: "Education & Employment", themeId: "education_employment" };
    }
    if (cat === "Employment & Unemployment" || lower.includes("بطالة") || lower.includes("وظائف") || lower.includes("تشغيل")) {
      return { topic: "Education & Employment", themeId: "education_employment" };
    }
    if (cat === "Technology & Digital Transformation" || lower.includes("سند") || lower.includes("sanad")) {
      return { topic: "Government Services", themeId: "gov_services" };
    }
    if (cat === "Economy & Cost of Living" || lower.includes("غلاء") || lower.includes("أسعار") || lower.includes("رواتب") || lower.includes("ضريبة")) {
      return { topic: "Cost of Living", themeId: "cost_of_living" };
    }
    return { topic: "Cost of Living", themeId: "cost_of_living" };
  };

  const mapPlatform = (p: string): PlatformType => {
    const pl = (p || "").toLowerCase();
    if (pl.includes("twitter") || pl.includes("x")) return "X";
    if (pl.includes("reddit")) return "Reddit";
    if (pl.includes("youtube")) return "YouTube";
    if (pl.includes("tiktok")) return "TikTok";
    if (pl.includes("instagram")) return "Instagram";
    if (pl.includes("threads")) return "Threads";
    if (pl.includes("linkedin")) return "LinkedIn";
    if (pl.includes("rumble")) return "Rumble";
    if (pl.includes("facebook")) return "Facebook";
    return "Other";
  };

  // 1. Ingest research posts
  for (const p of posts) {
    const fullText = (p.title ? `${p.title} — ` : "") + (p.text || "");
    if (!fullText.trim()) continue;

    const { topic, themeId } = mapCategoryToTheme(p.category, fullText);
    const gov = p.geographic_mentions && p.geographic_mentions.length > 0 ? p.geographic_mentions[0] : undefined;

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let sentimentScore = typeof p.sentiment_score === 'number' ? p.sentiment_score : 0;
    if (p.sentiment === 'Positive') sentiment = 'positive';
    else if (p.sentiment === 'Negative') sentiment = 'negative';

    // Verify social protection complaints are strictly negative
    if (themeId === 'social_protection') {
      const lower = fullText.toLowerCase();
      if (
        sentiment !== 'negative' &&
        (lower.includes("خصم") || lower.includes("اقتطاع") || lower.includes("ما بكفي") || lower.includes("مش مكفي") ||
         lower.includes("حرمان") || lower.includes("وقف") || lower.includes("تعديل") || lower.includes("ظلم") ||
         lower.includes("غلاء") || lower.includes("تعبنا") || lower.includes("حسبي الله"))
      ) {
        sentiment = 'negative';
        sentimentScore = -0.65;
      }
    }

    const appComment: Comment = {
      id: p.post_id.startsWith("post-") ? p.post_id : `sc-post-${p.platform}-${p.post_id}`,
      author: (p.author_name || "Jordan Citizen").slice(0, 250),
      handle: (p.author_handle || `@${p.platform}_user`).slice(0, 250),
      platform: mapPlatform(p.platform),
      text: fullText.slice(0, 9900),
      cleanedText: fullText.replace(/[\n\r]+/g, " ").trim().slice(0, 9900),
      language: p.language === 'English' ? 'en' : 'ar',
      sentiment,
      sentimentScore: typeof sentimentScore === 'number' && !isNaN(sentimentScore) ? Math.max(-1.0, Math.min(1.0, sentimentScore)) : 0,
      topic,
      themeId,
      codebookVersion: "v1.1.0",
      timestamp: p.published_at || p.retrieved_at || new Date().toISOString(),
      likeCount: typeof p.likes === 'number' ? p.likes : 0,
      replyCount: typeof p.comments_count === 'number' ? p.comments_count : 0,
      tokens: fullText.split(/\s+/).filter(Boolean),
      ...(gov ? { governorate: gov } : {}),
      namedEntities: p.geographic_mentions || [],
      keyPhrases: p.emotions || [],
      provenance: {
        sourceId: "socialcrawl",
        kind: "social_post",
        nativeUrl: p.post_url || null,
        fetchedAt: p.retrieved_at || new Date().toISOString(),
        collectedLive: true
      },
      nlpInstrument: "lexicon_rules"
    };

    mappedComments.push(appComment);
  }

  // 2. Ingest research comments
  for (const c of comments) {
    if (!c.comment_text || !c.comment_text.trim()) continue;

    const { topic, themeId } = mapCategoryToTheme(c.category, c.comment_text);
    const gov = c.geographic_mentions && c.geographic_mentions.length > 0 ? c.geographic_mentions[0] : undefined;

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let sentimentScore = typeof c.sentiment_score === 'number' ? c.sentiment_score : 0;
    if (c.sentiment === 'Positive') sentiment = 'positive';
    else if (c.sentiment === 'Negative') sentiment = 'negative';

    // Verify social protection complaints
    if (themeId === 'social_protection') {
      const lower = c.comment_text.toLowerCase();
      if (
        sentiment !== 'negative' &&
        (lower.includes("خصم") || lower.includes("اقتطاع") || lower.includes("ما بكفي") || lower.includes("مش مكفي") ||
         lower.includes("حرمان") || lower.includes("وقف") || lower.includes("تعديل") || lower.includes("ظلم") ||
         lower.includes("غلاء") || lower.includes("تعبنا") || lower.includes("حسبي الله"))
      ) {
        sentiment = 'negative';
        sentimentScore = -0.72;
      }
    }

    const appComment: Comment = {
      id: c.comment_id.startsWith("comm-") ? c.comment_id : `sc-comm-${c.platform}-${c.comment_id}`,
      author: (c.comment_author || "Jordan Commenter").slice(0, 250),
      handle: (c.comment_author_handle || `@${c.platform}_commenter`).slice(0, 250),
      platform: mapPlatform(c.platform),
      text: (c.comment_text || "").slice(0, 9900),
      cleanedText: (c.comment_text || "").replace(/[\n\r]+/g, " ").trim().slice(0, 9900),
      language: c.language === 'English' ? 'en' : 'ar',
      sentiment,
      sentimentScore: typeof sentimentScore === 'number' && !isNaN(sentimentScore) ? Math.max(-1.0, Math.min(1.0, sentimentScore)) : 0,
      topic,
      themeId,
      codebookVersion: "v1.1.0",
      timestamp: c.comment_published_at || c.retrieved_at || new Date().toISOString(),
      likeCount: typeof c.likes === 'number' ? c.likes : 0,
      replyCount: typeof c.reply_count === 'number' ? c.reply_count : 0,
      tokens: (c.comment_text || "").split(/\s+/).filter(Boolean),
      ...(gov ? { governorate: gov } : {}),
      namedEntities: c.geographic_mentions || [],
      keyPhrases: c.emotions || [],
      provenance: {
        sourceId: "socialcrawl",
        kind: "social_comment",
        nativeUrl: c.post_url || null,
        fetchedAt: c.retrieved_at || new Date().toISOString(),
        collectedLive: true
      },
      nlpInstrument: "lexicon_rules"
    };

    mappedComments.push(appComment);
  }

  if (mappedComments.length > 0) {
    await databaseManager.bulkAddComments(mappedComments);
    telemetry.synced_to_app = mappedComments.length;
    saveState();
    logMessage('INFO', `Successfully synchronized ${mappedComments.length} SocialCrawl records into the main app database!`);
  }

  const allComments = await databaseManager.getComments();
  return {
    syncedCommentsCount: comments.length,
    syncedPostsCount: posts.length,
    totalInApp: allComments.length
  };
}

/**
 * Full Jordan Discovery Pipeline Runner
 * Implements Steps 1-5 + Deduplication + Classification + Application Sync
 */
export async function runJordanDiscoveryPipeline(options?: PipelineRunOptions): Promise<{
  success: boolean;
  totalPosts: number;
  totalComments: number;
  creditsUsed: number;
  creditsRemaining: number;
  summary: string;
  syncedToAppCount: number;
  query: string;
}> {
  loadState();
  const activeQuery = (options?.query && options.query.trim()) ? options.query.trim() : JORDAN_DISCOVERY_QUERY;
  const fromDate = options?.from_date || DEFAULT_FROM_DATE;
  const toDate = options?.to_date || DEFAULT_TO_DATE;
  const sources = options?.sources || DEFAULT_SOURCES;

  telemetry.current_query = activeQuery;
  logMessage('INFO', `Starting Jordan Discovery Pipeline with query: ${activeQuery}`);
  telemetry.last_run_timestamp = new Date().toISOString();

  // Step 1 & 2: Search Everywhere
  const searchParams: Record<string, string> = {
    query: activeQuery,
    from_date: fromDate,
    to_date: toDate,
    sources: sources,
    include_transcripts: "false"
  };

  let allDiscoveredItems: any[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  let pageCount = 0;

  // Step 3: Pagination loop
  while (hasMore && pageCount < 5) {
    pageCount++;
    if (cursor) {
      searchParams["cursor"] = cursor;
    }

    logMessage('INFO', `Executing Search Everywhere page ${pageCount}...`);
    const searchRes = await fetchSocialCrawl("/search/everywhere", "search_everywhere", searchParams);

    if (searchRes && searchRes.success && searchRes.data) {
      const items = searchRes.data.items || [];
      allDiscoveredItems.push(...items);
      logMessage('INFO', `Page ${pageCount} returned ${items.length} items.`);

      if (searchRes.pagination && searchRes.pagination.has_more === true && searchRes.pagination.next_cursor) {
        if (searchRes.pagination.next_cursor === cursor) {
          // Prevent infinite loop on duplicate cursor
          hasMore = false;
        } else {
          cursor = searchRes.pagination.next_cursor;
          hasMore = true;
        }
      } else {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  // Load existing posts and comments for deduplication
  const existingPosts = loadNormalizedPosts();
  const existingComments = loadNormalizedComments();
  const postMap = new Map<string, ResearchPost>();
  for (const p of existingPosts) postMap.set(p.post_id, p);

  const commentMap = new Map<string, ResearchComment>();
  for (const c of existingComments) commentMap.set(c.comment_id, c);

  // Normalize and deduplicate posts
  let newPostsCount = 0;
  const targetPostsForComments: ResearchPost[] = [];

  for (const it of allDiscoveredItems) {
    const norm = normalizeSearchEverywhereItem(it, activeQuery, fromDate, toDate);
    const key = `${norm.platform}:${norm.post_id}`;
    if (!postMap.has(norm.post_id) && !postMap.has(key)) {
      postMap.set(norm.post_id, norm);
      newPostsCount++;
      if (norm.comments_count > 0 || ['reddit', 'tiktok', 'youtube'].includes(norm.platform)) {
        targetPostsForComments.push(norm);
      }
    }
  }

  logMessage('INFO', `Normalized ${allDiscoveredItems.length} items. Added ${newPostsCount} new unique posts.`);

  // Step 5: Comment retrieval for posts with comments
  let newCommentsCount = 0;
  if (!options?.skipComments && telemetry.credits_remaining > 5) {
    const maxFetches = options?.maxCommentFetches || 3;
    const candidates = targetPostsForComments.slice(0, maxFetches);
    
    for (const post of candidates) {
      if (telemetry.credits_remaining <= 5) {
        logMessage('WARN', `Preserving remaining credit reserve. Stopping comments retrieval.`);
        break;
      }

      const fetched = await fetchCommentsForPost(post);
      for (const cm of fetched) {
        if (!commentMap.has(cm.comment_id)) {
          commentMap.set(cm.comment_id, cm);
          newCommentsCount++;
        }
      }
    }
  }

  const finalPosts = Array.from(postMap.values());
  const finalComments = Array.from(commentMap.values());

  saveNormalizedPosts(finalPosts);
  saveNormalizedComments(finalComments);
  saveState();

  // Synchronize 100% of discovered research into application database
  const syncResult = await syncSocialCrawlToApplication(finalPosts, finalComments);

  const summary = `Jordan Discovery completed for query "${activeQuery}". Total posts: ${finalPosts.length} (+${newPostsCount} new), Total comments: ${finalComments.length} (+${newCommentsCount} new). Synced into app: ${syncResult.syncedPostsCount + syncResult.syncedCommentsCount} items. Credits remaining: ${telemetry.credits_remaining}.`;
  logMessage('INFO', summary);

  return {
    success: true,
    totalPosts: finalPosts.length,
    totalComments: finalComments.length,
    creditsUsed: telemetry.credits_used,
    creditsRemaining: telemetry.credits_remaining,
    summary,
    syncedToAppCount: syncResult.syncedPostsCount + syncResult.syncedCommentsCount,
    query: activeQuery
  };
}

// -------------------------------------------------------------
// COMPREHENSIVE RESEARCH ANALYTICS AGGREGATOR (Section 21-26)
// -------------------------------------------------------------

export function generateResearchAnalytics() {
  const posts = loadNormalizedPosts();
  const comments = loadNormalizedComments();
  loadState();

  // Overview metrics
  const totalPosts = posts.length;
  const totalComments = comments.length;
  const totalRecords = totalPosts + totalComments;

  // Platform breakdown
  const platformsMap: Record<string, { posts: number; comments: number; likes: number }> = {};
  for (const p of posts) {
    const pl = p.platform;
    if (!platformsMap[pl]) platformsMap[pl] = { posts: 0, comments: 0, likes: 0 };
    platformsMap[pl].posts++;
    platformsMap[pl].likes += p.likes;
  }
  for (const c of comments) {
    const pl = c.platform;
    if (!platformsMap[pl]) platformsMap[pl] = { posts: 0, comments: 0, likes: 0 };
    platformsMap[pl].comments++;
  }

  // Issue Categories distribution
  const issueDistribution: Record<string, { count: number; sentimentScore: number; negativePct: number; positivePct: number }> = {};
  for (const p of posts) {
    const cat = p.category;
    if (!issueDistribution[cat]) {
      issueDistribution[cat] = { count: 0, sentimentScore: 0, negativePct: 0, positivePct: 0 };
    }
    issueDistribution[cat].count++;
    issueDistribution[cat].sentimentScore += p.sentiment_score;
    if (p.sentiment === 'Negative') issueDistribution[cat].negativePct++;
    if (p.sentiment === 'Positive') issueDistribution[cat].positivePct++;
  }

  const categoryBarData = Object.entries(issueDistribution)
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      avgSentiment: stats.count > 0 ? Number((stats.sentimentScore / stats.count).toFixed(2)) : 0,
      negativePct: stats.count > 0 ? Math.round((stats.negativePct / stats.count) * 100) : 0,
      positivePct: stats.count > 0 ? Math.round((stats.positivePct / stats.count) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Sentiment distribution
  const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0, Mixed: 0 };
  for (const p of posts) {
    if (sentimentCounts[p.sentiment] !== undefined) sentimentCounts[p.sentiment]++;
  }
  for (const c of comments) {
    if (sentimentCounts[c.sentiment] !== undefined) sentimentCounts[c.sentiment]++;
  }

  // Emotions distribution
  const emotionCounts: Record<string, number> = {};
  for (const p of posts) {
    for (const em of (p.emotions || [])) emotionCounts[em] = (emotionCounts[em] || 0) + 1;
  }
  for (const c of comments) {
    for (const em of (c.emotions || [])) emotionCounts[em] = (emotionCounts[em] || 0) + 1;
  }

  // Relevance counts
  const relevanceCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const p of posts) {
    if (p.relevance && relevanceCounts[p.relevance] !== undefined) {
      relevanceCounts[p.relevance]++;
    }
  }

  // Language distribution
  const languageCounts = { Arabic: 0, English: 0, 'Arabic-English Mixed': 0, Other: 0 };
  for (const p of posts) {
    if (p.language && languageCounts[p.language] !== undefined) languageCounts[p.language]++;
  }

  // Time-Series & Spike Detection (Section 23)
  const dailyMap: Record<string, { date: string; posts: number; comments: number; engagement: number; positive: number; negative: number }> = {};
  
  for (const p of posts) {
    const rawDate = p.published_at || p.retrieved_at || new Date().toISOString();
    const day = rawDate.slice(0, 10);
    if (!dailyMap[day]) {
      dailyMap[day] = { date: day, posts: 0, comments: 0, engagement: 0, positive: 0, negative: 0 };
    }
    dailyMap[day].posts++;
    dailyMap[day].engagement += (p.engagement_total || 0);
    if (p.sentiment === 'Positive') dailyMap[day].positive++;
    if (p.sentiment === 'Negative') dailyMap[day].negative++;
  }

  for (const c of comments) {
    const rawDate = c.comment_published_at || c.retrieved_at || new Date().toISOString();
    const day = rawDate.slice(0, 10);
    if (!dailyMap[day]) {
      dailyMap[day] = { date: day, posts: 0, comments: 0, engagement: 0, positive: 0, negative: 0 };
    }
    dailyMap[day].comments++;
    if (c.sentiment === 'Positive') dailyMap[day].positive++;
    if (c.sentiment === 'Negative') dailyMap[day].negative++;
  }

  const timelineData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Unusual Spikes Detection
  const avgDailyPosts = timelineData.length > 0 ? (posts.length / timelineData.length) : 0;
  const unusualSpikes = timelineData
    .filter(d => d.posts > avgDailyPosts * 1.5 || d.comments > 50)
    .map(sp => {
      // Find top representative post on that day
      const dayPosts = posts.filter(p => (p.published_at || "").startsWith(sp.date));
      const topPost = dayPosts.sort((a, b) => (b.engagement_total || 0) - (a.engagement_total || 0))[0];
      return {
        date: sp.date,
        totalActivity: sp.posts + sp.comments,
        postsCount: sp.posts,
        commentsCount: sp.comments,
        dominantTopic: topPost ? topPost.category : "Security & Regional Developments",
        representativeTitle: topPost ? topPost.title : "Elevated citizen discussion",
        representativeQuote: topPost ? (topPost.text || "").slice(0, 180) : "",
        platformDistribution: dayPosts.reduce((acc: Record<string, number>, curr) => {
          acc[curr.platform] = (acc[curr.platform] || 0) + 1;
          return acc;
        }, {})
      };
    });

  // Geographic distribution (Section 24)
  const cityMentions: Record<string, number> = {};
  for (const p of posts) {
    for (const city of (p.geographic_mentions || [])) {
      cityMentions[city] = (cityMentions[city] || 0) + 1;
    }
  }

  // Influential Content Leaderboards (Section 25)
  const topByEngagement = [...posts].sort((a, b) => b.engagement_total - a.engagement_total).slice(0, 6);
  const topByComments = [...posts].sort((a, b) => b.comments_count - a.comments_count).slice(0, 6);
  const topByLikes = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 6);

  return {
    telemetry,
    overview: {
      totalPosts,
      totalComments,
      totalRecords,
      dateRange: { from: DEFAULT_FROM_DATE, to: DEFAULT_TO_DATE },
      discoveryQuery: JORDAN_DISCOVERY_QUERY,
      highRelevanceCount: relevanceCounts.HIGH,
      platformsCount: Object.keys(platformsMap).length
    },
    relevanceCounts,
    sentimentCounts,
    emotionCounts,
    languageCounts,
    categoryBarData,
    platformsMap,
    timelineData,
    unusualSpikes,
    cityMentions,
    influential: {
      topByEngagement,
      topByComments,
      topByLikes
    }
  };
}

export function getTelemetry(): PipelineTelemetry {
  loadState();
  return telemetry;
}
