/**
 * Public Real-Time Ingest Feeds & Data Collection.
 * Operates hourly scheduled jobs for YouTube, Reddit OAuth, GDELT, and Petra RSS.
 * Strictly NO fake data generation or fallback mock arrays.
 */

import * as fs from "fs";
import * as path from "path";
import { databaseManager } from "./db.ts";
import { analyzeCommentsBatch, updateTrendingKeywordsFromComments } from "./nlp.ts";
import { Comment, PlatformType, Provenance } from "../src/types";
import { fetchLiveRedditFeedOAuth, getRedditStatus } from "./reddit.ts";
import { processYouTubeChannelIngestion, getYouTubeStats } from "./youtube.ts";

const ACCOUNTS_FILE = path.join(process.cwd(), "data", "jordan_accounts.json");

export interface SyncStats {
  lastSyncTime: string;
  redditSuccess: boolean;
  gdeltSuccess: boolean;
  rssSuccess: boolean;
  youtubeSuccess: boolean;
  activeFeeds: string[];
  logs: string[];
}

export let syncState: SyncStats = {
  lastSyncTime: "Never",
  redditSuccess: false,
  gdeltSuccess: false,
  rssSuccess: false,
  youtubeSuccess: false,
  activeFeeds: ["YouTube Data API v3", "Reddit OAuth", "GDELT Jordan News", "Petra RSS"],
  logs: ["Fetcher Engine initialized."]
};

function addLog(msg: string) {
  const time = new Date().toLocaleTimeString();
  syncState.logs.unshift(`[${time}] ${msg}`);
  if (syncState.logs.length > 50) syncState.logs = syncState.logs.slice(0, 50);
  console.log(`[Fetcher] ${msg}`);
}

/**
 * Loads monitored accounts list.
 */
export function getMonitoredAccounts(): Record<string, string[]> {
  if (fs.existsSync(ACCOUNTS_FILE)) {
    try {
      const data = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load jordan_accounts.json:", e);
    }
  }
  return {
    government: ["@RHCJO", "@PrimeMinistry", "@KingAbdullahII", "@QueenRania"],
    news: ["@AlMamlakaTV", "@RoyaNews", "@PetraNews", "@AmmonNews", "@GhadNews"],
    universities: ["@JU_JO", "@Yarmouk_Univ", "@JUST_JO", "@HUJordan"],
    brands: ["@RoyalJordanian", "@JordanSportsTV", "@VisitJordan"]
  };
}

export async function saveMonitoredAccounts(accounts: Record<string, string[]>): Promise<boolean> {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
    addLog("Accounts registry updated successfully.");
    await databaseManager.saveAccountsToFirestore(accounts);
    return true;
  } catch (e) {
    console.error("Failed to save monitored accounts:", e);
    return false;
  }
}

/**
 * 1. Reddit r/jordan via official OAuth.
 */
export async function fetchLiveRedditFeed(): Promise<number> {
  addLog("Fetching live Reddit r/jordan posts via official OAuth...");
  try {
    const comments = await fetchLiveRedditFeedOAuth();
    if (comments.length > 0) {
      await databaseManager.bulkAddComments(comments);
      syncState.redditSuccess = true;
      addLog(`Successfully synced ${comments.length} Reddit forum posts!`);
      return comments.length;
    }
    const status = getRedditStatus();
    syncState.redditSuccess = status.status === 'live';
    return 0;
  } catch (err: any) {
    addLog(`Reddit OAuth fetch failed: ${err?.message || err}`);
    syncState.redditSuccess = false;
    return 0;
  }
}

/**
 * 2. GDELT & Google News Jordan real-time search feed analyzer.
 */
export async function fetchLiveGDELTNews(): Promise<number> {
  addLog("Querying Arabic Google News Jordan feed (الأردن) & GDELT updates...");

  let targetItems: { title: string; source: string; url: string | null }[] = [];

  // Strategy 1: Arabic Google News Jordan RSS stream (Primary User Stream: q=الأردن&hl=ar&gl=JO&ceid=JO:ar)
  try {
    const arRssRes = await fetch("https://news.google.com/rss/search?q=%D8%A3%D8%B1%D8%AF%D9%86&hl=ar&gl=JO&ceid=JO:ar", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/xml, application/xml, */*"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (arRssRes.ok) {
      const xmlText = await arRssRes.text();
      const itemsRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemsRegex.exec(xmlText)) !== null && targetItems.length < 10) {
        const itemContent = match[1];
        const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(itemContent);
        const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/.exec(itemContent);
        const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);

        const rawTitle = titleMatch ? titleMatch[1].trim() : "";
        // Clean off trailing source name e.g. " - اليوم السابع"
        const title = rawTitle.replace(/\s*-\s*[^-]+$/, '').trim();
        const link = linkMatch ? linkMatch[1].trim() : null;
        const sourceName = sourceMatch ? sourceMatch[1].trim() : "الأردن الإخبارية";

        if (title.length > 8) {
          targetItems.push({
            title,
            source: sourceName,
            url: link
          });
        }
      }
      addLog(`Fetched ${targetItems.length} live Arabic headlines from Google News Jordan stream.`);
    }
  } catch (arErr: any) {
    if (arErr?.name === 'TimeoutError' || arErr?.message?.includes('aborted')) {
      addLog(`Arabic Google News Jordan primary stream timed out. Attempting secondary fallback...`);
    } else {
      addLog(`Arabic Google News Jordan stream notice: ${arErr?.message || arErr}`);
    }
  }

  // Secondary Arabic RSS stream fallback if primary query timed out
  if (targetItems.length === 0) {
    try {
      const secRssRes = await fetch("https://news.google.com/rss/search?q=Jordan&hl=ar&gl=JO&ceid=JO:ar", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/xml, application/xml, */*"
        },
        signal: AbortSignal.timeout(8000)
      });
      if (secRssRes.ok) {
        const xmlText = await secRssRes.text();
        const itemsRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemsRegex.exec(xmlText)) !== null && targetItems.length < 10) {
          const itemContent = match[1];
          const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(itemContent);
          const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/.exec(itemContent);
          const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);

          const rawTitle = titleMatch ? titleMatch[1].trim() : "";
          const title = rawTitle.replace(/\s*-\s*[^-]+$/, '').trim();
          const link = linkMatch ? linkMatch[1].trim() : null;
          const sourceName = sourceMatch ? sourceMatch[1].trim() : "الأردن الإخبارية";

          if (title.length > 8) {
            targetItems.push({ title, source: sourceName, url: link });
          }
        }
      }
    } catch (_) {}
  }

  // Strategy 2: GDELT API v2 doc endpoint
  if (targetItems.length < 5) {
    try {
      const res = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?query=jordan&mode=artlist&maxrecords=5&format=json", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*"
        },
        signal: AbortSignal.timeout(4000)
      });

      if (res.ok) {
        const data = await res.json();
        const articles = data?.articles || [];
        articles.slice(0, 5).forEach((art: any) => {
          if (art.title && art.title.length > 10) {
            targetItems.push({
              title: art.title,
              source: art.source || "GDELT",
              url: art.url || null
            });
          }
        });
      }
    } catch (err: any) {
      addLog(`GDELT primary endpoint unreachable (${err?.message || err}).`);
    }
  }

  if (targetItems.length === 0) {
    syncState.gdeltSuccess = false;
    return 0;
  }

  try {
    const rawItems = targetItems.map((item) => ({
      author: `${item.source} News`,
      handle: `@${item.source.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      platform: "GDELT" as PlatformType,
      text: item.title,
      likes: undefined,
      shares: undefined,
      url: item.url,
    }));

    const analyzedResult = await analyzeCommentsBatch(rawItems);
    analyzedResult.forEach((c, idx) => {
      c.provenance = {
        sourceId: 'gdelt',
        kind: 'news_headline',
        nativeUrl: rawItems[idx]?.url || null,
        fetchedAt: new Date().toISOString(),
        collectedLive: true,
      };
      c.likeCount = null;
      c.replyCount = null;
    });

    await databaseManager.bulkAddComments(analyzedResult);
    syncState.gdeltSuccess = true;
    addLog(`Successfully synced ${analyzedResult.length} GDELT / Global Jordan news headlines.`);
    return analyzedResult.length;
  } catch (err: any) {
    addLog(`GDELT processing failed: ${err?.message || err}`);
    syncState.gdeltSuccess = false;
    return 0;
  }
}

/**
 * 3. Petra Official Jordan News RSS feed scraper.
 */
export async function fetchLiveJordanRSS(): Promise<number> {
  addLog("Parsing live PETRA (Jordan News Agency) RSS feed...");
  try {
    const res = await fetch("https://petra.gov.jo/Include/Rss.aspx?Lang=ar-JO", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/xml, application/xml, */*"
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) {
      addLog(`Petra RSS returned status ${res.status}. Marking source degraded.`);
      syncState.rssSuccess = false;
      return 0;
    }

    const xmlText = await res.text();
    const itemsRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    const rawItems: { author: string; handle: string; platform: PlatformType; text: string; link: string | null }[] = [];

    while ((match = itemsRegex.exec(xmlText)) !== null && rawItems.length < 5) {
      const itemContent = match[1];
      const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(itemContent);
      const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/.exec(itemContent);
      const title = titleMatch ? titleMatch[1].trim() : "";
      const link = linkMatch ? linkMatch[1].trim() : null;

      if (title.length > 10) {
        rawItems.push({
          author: "Petra News Agency",
          handle: "@petranews",
          platform: "PetraRSS" as PlatformType,
          text: title,
          link,
        });
      }
    }

    if (rawItems.length === 0) {
      syncState.rssSuccess = true;
      return 0;
    }

    const analyzedResult = await analyzeCommentsBatch(rawItems);
    analyzedResult.forEach((c, idx) => {
      c.provenance = {
        sourceId: 'petra_rss',
        kind: 'news_headline',
        nativeUrl: rawItems[idx]?.link || null,
        fetchedAt: new Date().toISOString(),
        collectedLive: true,
      };
      c.likeCount = null;
      c.replyCount = null;
    });

    await databaseManager.bulkAddComments(analyzedResult);
    syncState.rssSuccess = true;
    addLog(`Successfully synced ${analyzedResult.length} Petra RSS headlines.`);
    return analyzedResult.length;
  } catch (err: any) {
    addLog(`Petra RSS fetch failed: ${err?.message || err}`);
    syncState.rssSuccess = false;
    return 0;
  }
}

/**
 * 4. YouTube Channel Ingestion.
 */
export async function fetchLiveYouTubeChannel(): Promise<number> {
  addLog("Running round-robin YouTube Channel Ingestion...");
  try {
    const comments = await processYouTubeChannelIngestion();
    if (comments.length > 0) {
      await databaseManager.bulkAddComments(comments);
      syncState.youtubeSuccess = true;
      addLog(`Successfully synced ${comments.length} YouTube social comments.`);
      return comments.length;
    }
    const stats = getYouTubeStats();
    syncState.youtubeSuccess = stats.status.status === 'live';
    return 0;
  } catch (err: any) {
    addLog(`YouTube channel ingestion failed: ${err?.message || err}`);
    syncState.youtubeSuccess = false;
    return 0;
  }
}

/**
 * Single scheduled job running once per hour.
 */
export async function triggerHourlyIngestJob(): Promise<{ youtubeSynced: number; redditSynced: number; gdeltSynced: number; rssSynced: number }> {
  addLog("Executing hourly background ingestion job...");
  const [yt, rd, gd, rss] = await Promise.all([
    fetchLiveYouTubeChannel().catch(() => 0),
    fetchLiveRedditFeed().catch(() => 0),
    fetchLiveGDELTNews().catch(() => 0),
    fetchLiveJordanRSS().catch(() => 0),
  ]);

  syncState.lastSyncTime = new Date().toISOString();
  addLog(`Hourly ingestion cycle completed! Synced ${yt + rd + gd + rss} total items.`);

  try {
    const comments = await databaseManager.getComments();
    if (comments.length > 0) {
      const trends = await updateTrendingKeywordsFromComments(comments);
      if (trends && trends.length > 0) {
        await databaseManager.saveTrends(trends);
        addLog(`Updated ${trends.length} mathematically calculated trends.`);
      }
    }
  } catch (err: any) {
    addLog(`Trends calculation error: ${err?.message || err}`);
  }

  return { youtubeSynced: yt, redditSynced: rd, gdeltSynced: gd, rssSynced: rss };
}

export function startBackgroundFetcherDaemon() {
  addLog("Background Fetcher hourly scheduled daemon initialized.");
  
  // Initial run after boot
  setTimeout(() => {
    triggerHourlyIngestJob().catch(e => console.error("Initial hourly ingest failed:", e));
  }, 10000);

  // Run once per hour (60 * 60 * 1000 ms)
  setInterval(() => {
    triggerHourlyIngestJob().catch(e => console.error("Hourly scheduled ingest failed:", e));
  }, 60 * 60 * 1000);
}
