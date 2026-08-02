/**
 * JordanInsight Server - Real-Time Jordanian Social Intelligence Platform
 * Operates hourly scheduled ingestion, Codebook v1 classification,
 * Meta Content Library imports, and strict provenance-backed research analytics.
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { databaseManager } from "./server/db.ts";
import { globalCache, TTL_SENTIMENT, TTL_TRENDS } from "./server/cache.ts";
import { 
  getGeminiClient, 
  handleGeminiError, 
  cleanAndPreprocessLocal, 
  geminiQuotaExhausted, 
  totalRequestsUsed, 
  setQuotaState,
  updateTrendingKeywordsFromComments,
  CODEBOOK_VERSION
} from "./server/nlp.ts";
import { 
  startBackgroundFetcherDaemon, 
  triggerHourlyIngestJob, 
  syncState, 
  getMonitoredAccounts, 
  saveMonitoredAccounts 
} from "./server/fetchers.ts";
import { getYouTubeStats } from "./server/youtube.ts";
import { getRedditStatus } from "./server/reddit.ts";
import { processMetaImport, getMetaBatches } from "./server/metaImport.ts";
import { Comment, PlatformType, Provenance } from "./src/types";
import codebook from "./config/codebook_v1.json";

const app = express();
app.use(express.json({ limit: '10mb' })); // Allow CSV/JSON import payloads
const PORT = Number(process.env.PORT) || 3000;

// Initialize background ingestion crawlers
startBackgroundFetcherDaemon();

async function runAsyncTrendsUpdate() {
  try {
    const comments = await databaseManager.getComments();
    const latestTrends = await updateTrendingKeywordsFromComments(comments);
    if (latestTrends && latestTrends.length > 0) {
      await databaseManager.saveTrends(latestTrends);
      console.log("[ASYNCHRONOUS TRENDS UPDATE] Updated mathematical trends successfully.");
    }
  } catch (e) {
    console.error("Async dynamic trends extraction failed:", e);
  }
}

// GET all comments
app.get("/api/comments", async (req, res) => {
  try {
    const comments = await databaseManager.getComments();
    res.json({ comments });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch comments profile." });
  }
});

// POST single comment analysis (user input intake)
app.post("/api/comments", async (req, res) => {
  const { author, handle, platform, text, governorate } = req.body;
  if (!text || !author || !handle || !platform) {
    res.status(400).json({ error: "Missing required fields (author, handle, platform, text)" });
    return;
  }

  const timestamp = new Date().toISOString();
  const id = `comment-user-${Date.now()}`;

  // Local Preprocessing Fallback
  const localAnalysis = cleanAndPreprocessLocal(text);

  const provenance: Provenance = {
    sourceId: 'user_input',
    kind: 'social_comment',
    nativeUrl: null,
    fetchedAt: timestamp,
    collectedLive: true,
  };

  const ai = getGeminiClient();

  if (ai) {
    try {
      const validThemeIds = codebook.themes.map(t => t.id);
      const prompt = `Analyze this social media comment concerning Jordan against Codebook v1 (${CODEBOOK_VERSION}).
Available Theme IDs: ${validThemeIds.join(', ')}.

Return JSON adhering exactly to:
{
  "language": "ar" | "en",
  "cleanedText": "string",
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": float between -1.0 and 1.0,
  "themeId": one of [${validThemeIds.map(t => `'${t}'`).join(', ')}],
  "confidence": float between 0.0 and 1.0
}

Comment to analyze: "${text}"`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are an expert NLP data scientist and social media analyst evaluating country-level Jordanian public sentiment.",
        }
      });

      const responseText = aiResponse.text;
      if (responseText) {
        const parsed = JSON.parse(responseText.trim());
        const themeId = validThemeIds.includes(parsed.themeId) ? parsed.themeId : localAnalysis.themeId;
        const matchingTheme = codebook.themes.find(t => t.id === themeId);

        const comment: Comment = {
          id,
          author,
          handle,
          platform: platform as PlatformType,
          text,
          cleanedText: parsed.cleanedText || localAnalysis.cleanedText,
          language: parsed.language || localAnalysis.language,
          sentiment: parsed.sentiment || localAnalysis.sentiment,
          sentimentScore: parsed.sentimentScore ?? localAnalysis.score,
          topic: matchingTheme ? matchingTheme.labels.en : localAnalysis.topic,
          themeId,
          codebookVersion: CODEBOOK_VERSION,
          themeConfidence: parsed.confidence ?? 0.9,
          timestamp,
          likeCount: null,
          replyCount: null,
          tokens: localAnalysis.tokens,
          namedEntities: localAnalysis.namedEntities,
          keyPhrases: localAnalysis.keyPhrases,
          governorate: governorate || undefined,
          provenance,
          nlpInstrument: 'gemini_llm',
          sentimentConfidence: 0.95,
        };

        await databaseManager.addComment(comment);
        globalCache.delete("system:trends");
        runAsyncTrendsUpdate().catch(err => console.error(err));

        res.json({ success: true, comment });
        return;
      }
    } catch (e: any) {
      handleGeminiError(e, "Single Ingestion Classification");
    }
  }

  // Fallback to Lexicon Rules
  const comment: Comment = {
    id,
    author,
    handle,
    platform: platform as PlatformType,
    text,
    cleanedText: localAnalysis.cleanedText,
    language: localAnalysis.language,
    sentiment: localAnalysis.sentiment,
    sentimentScore: localAnalysis.score,
    topic: localAnalysis.topic,
    themeId: localAnalysis.themeId,
    codebookVersion: localAnalysis.codebookVersion,
    themeConfidence: localAnalysis.themeConfidence,
    timestamp,
    likeCount: null,
    replyCount: null,
    tokens: localAnalysis.tokens,
    namedEntities: localAnalysis.namedEntities,
    keyPhrases: localAnalysis.keyPhrases,
    governorate: governorate || undefined,
    provenance,
    nlpInstrument: 'lexicon_rules',
    sentimentConfidence: localAnalysis.sentimentConfidence,
  };

  await databaseManager.addComment(comment);
  globalCache.delete("system:trends");
  runAsyncTrendsUpdate().catch(err => console.error(err));

  res.json({ success: true, comment });
});

// POST Manual Hourly Ingestion Trigger
app.post("/api/comments/bulk-ingest", async (req, res) => {
  try {
    const stats = await triggerHourlyIngestJob();
    const totalSynced = stats.youtubeSynced + stats.redditSynced + stats.gdeltSynced + stats.rssSynced;
    const comments = await databaseManager.getComments();
    res.json({
      success: true,
      count: totalSynced,
      comments: comments.slice(0, totalSynced || 5),
      source: "Hourly Ingestion Job (YouTube, Reddit OAuth, GDELT, Petra RSS)"
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to trigger hourly ingestion job." });
  }
});

// GET Corpus Stats Requirement D
app.get("/api/corpus-stats", async (req, res) => {
  try {
    const comments = await databaseManager.getComments();
    const total = comments.length;

    const bySource: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let classifiedCount = 0;
    let arCount = 0;
    let enCount = 0;

    let earliest: string | null = null;
    let latest: string | null = null;

    comments.forEach(c => {
      const src = c.provenance?.sourceId || 'unknown';
      const kind = c.provenance?.kind || 'unknown';

      bySource[src] = (bySource[src] || 0) + 1;
      byKind[kind] = (byKind[kind] || 0) + 1;

      if (c.themeId && c.themeId !== 'unclassified') {
        classifiedCount++;
      }

      if (c.language === 'ar') arCount++;
      else if (c.language === 'en') enCount++;

      if (c.timestamp) {
        if (!earliest || c.timestamp < earliest) earliest = c.timestamp;
        if (!latest || c.timestamp > latest) latest = c.timestamp;
      }
    });

    res.json({
      totalComments: total,
      bySource,
      byKind,
      dateRange: {
        start: earliest,
        end: latest,
      },
      codebookVersion: CODEBOOK_VERSION,
      classifiedPercentage: total > 0 ? Number(((classifiedCount / total) * 100).toFixed(1)) : 0,
      languageBreakdown: {
        arCount,
        enCount,
        arPercentage: total > 0 ? Number(((arCount / total) * 100).toFixed(1)) : 0,
        enPercentage: total > 0 ? Number(((enCount / total) * 100).toFixed(1)) : 0,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate corpus statistics." });
  }
});

// GET Sources Health Status (UI Banner support)
app.get("/api/sources-status", (req, res) => {
  const ytStats = getYouTubeStats();
  const rdStats = getRedditStatus();

  res.json({
    youtube: ytStats,
    reddit: rdStats,
    gdelt: {
      sourceId: 'gdelt',
      status: syncState.gdeltSuccess ? 'live' : 'degraded',
      lastSuccess: syncState.lastSyncTime !== 'Never' ? syncState.lastSyncTime : null,
    },
    petra_rss: {
      sourceId: 'petra_rss',
      status: syncState.rssSuccess ? 'live' : 'degraded',
      lastSuccess: syncState.lastSyncTime !== 'Never' ? syncState.lastSyncTime : null,
    },
    meta_import: {
      sourceId: 'meta_import',
      status: 'live',
      batchesCount: getMetaBatches().length,
    }
  });
});

// POST Admin Meta Content Library Import
app.post("/api/admin/import-meta", async (req, res) => {
  try {
    const { rawRows, columnMapping, exportDate, mclQueryNote } = req.body;
    const result = await processMetaImport({
      rawRows,
      columnMapping,
      exportDate,
      mclQueryNote,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        errors: result.errors,
      });
      return;
    }

    res.json({
      success: true,
      batchId: result.batchId,
      importedCount: result.importedCount,
      duplicatesCount: result.duplicatesCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Meta import failed: ${err.message}` });
  }
});

// GET Meta Import Batches History
app.get("/api/admin/import-meta/batches", (req, res) => {
  res.json({ batches: getMetaBatches() });
});

// GET System Health & Telemetry
app.get("/api/system-status", (req, res) => {
  res.json({
    quotaExhausted: geminiQuotaExhausted,
    activeSource: geminiQuotaExhausted ? "Lexicon NLP Engine" : "Gemini 2.5 Flash",
    requestsUsed: totalRequestsUsed,
    remainingMinutes: geminiQuotaExhausted ? 30 : 0
  });
});

// POST Reset system quota limits
app.post("/api/system-status/reset", async (req, res) => {
  setQuotaState(false);
  triggerHourlyIngestJob()
    .then(() => runAsyncTrendsUpdate())
    .catch(err => console.error("Immediate ingestion retry after reset failed:", err));

  res.json({ success: true, quotaExhausted: false });
});

// GET sync diagnostics
app.get("/api/sync-status", (req, res) => {
  res.json(syncState);
});

// GET official Jordan supervised accounts list
app.get("/api/accounts", (req, res) => {
  res.json(getMonitoredAccounts());
});

// GET official Jordan national events list
app.get("/api/events", async (req, res) => {
  try {
    const events = await databaseManager.getEvents();
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve events from database." });
  }
});

// POST update Jordan accounts list
app.post("/api/accounts", async (req, res) => {
  const accounts = req.body;
  if (!accounts || typeof accounts !== "object") {
    res.status(400).json({ error: "Invalid accounts schema structure supplied" });
    return;
  }
  const success = await saveMonitoredAccounts(accounts);
  if (success) {
    res.json({ success: true, accounts });
  } else {
    res.status(500).json({ error: "Failed to save monitored accounts to database." });
  }
});

// GET trends KPI
app.get("/api/trends", async (req, res) => {
  const cacheKey = "system:trends";
  
  if (globalCache.exists(cacheKey)) {
    res.json(globalCache.get(cacheKey));
    return;
  }

  try {
    const comments = await databaseManager.getComments();
    const totalComments = comments.length;
    let totalScore = 0;
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    comments.forEach(c => {
      totalScore += c.sentimentScore;
      if (c.sentiment === "positive") positive++;
      else if (c.sentiment === "neutral") neutral++;
      else if (c.sentiment === "negative") negative++;
    });

    const averageSentiment = totalComments > 0 ? totalScore / totalComments : 0;

    // Compile Platform Stats
    const platformGroups: Record<string, { count: number; sumScore: number }> = {};
    comments.forEach(c => {
      const p = c.platform || 'Other';
      if (!platformGroups[p]) platformGroups[p] = { count: 0, sumScore: 0 };
      platformGroups[p].count++;
      platformGroups[p].sumScore += c.sentimentScore;
    });

    const platformStats = Object.keys(platformGroups).map(platform => ({
      platform,
      count: platformGroups[platform].count,
      avgSentiment: platformGroups[platform].count > 0 
        ? platformGroups[platform].sumScore / platformGroups[platform].count 
        : 0
    }));

    // Compile Topic Stats
    const topicGroups: Record<string, { count: number; sumScore: number }> = {};
    comments.forEach(c => {
      const t = c.topic || "General";
      if (!topicGroups[t]) topicGroups[t] = { count: 0, sumScore: 0 };
      topicGroups[t].count++;
      topicGroups[t].sumScore += c.sentimentScore;
    });

    const topicStats = Object.keys(topicGroups).map(topic => ({
      topic,
      count: topicGroups[topic].count,
      avgSentiment: topicGroups[topic].count > 0 
        ? topicGroups[topic].sumScore / topicGroups[topic].count 
        : 0
    }));

    // Daily Sentiment Trends
    const dailyGroups: Record<string, { positive: number; neutral: number; negative: number; sumScore: number; count: number }> = {};
    comments.forEach(c => {
      const day = c.timestamp.split("T")[0];
      if (!dailyGroups[day]) {
        dailyGroups[day] = { positive: 0, neutral: 0, negative: 0, sumScore: 0, count: 0 };
      }
      dailyGroups[day].count++;
      dailyGroups[day].sumScore += c.sentimentScore;
      if (c.sentiment === "positive") dailyGroups[day].positive++;
      else if (c.sentiment === "neutral") dailyGroups[day].neutral++;
      else if (c.sentiment === "negative") dailyGroups[day].negative++;
    });

    const dailyTrend = Object.keys(dailyGroups).sort().map(date => ({
      date,
      positive: dailyGroups[date].positive,
      neutral: dailyGroups[date].neutral,
      negative: dailyGroups[date].negative,
      averageScore: Number((dailyGroups[date].sumScore / dailyGroups[date].count).toFixed(2)),
      count: dailyGroups[date].count
    }));

    // Word frequency
    const arabicWordFreq: Record<string, number> = {};
    const englishWordFreq: Record<string, number> = {};

    comments.forEach(c => {
      if (c.tokens) {
        c.tokens.forEach(tok => {
          const cleanTok = tok.replace(/[^\w\u0600-\u06FF]/g, "");
          if (cleanTok.length < 3) return;
          if (c.language === 'ar') {
            arabicWordFreq[cleanTok] = (arabicWordFreq[cleanTok] || 0) + 1;
          } else {
            englishWordFreq[cleanTok.toLowerCase()] = (englishWordFreq[cleanTok.toLowerCase()] || 0) + 1;
          }
        });
      }
    });

    const topArabicWords = Object.entries(arabicWordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([text, value]) => ({ text, value }));

    const topEnglishWords = Object.entries(englishWordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([text, value]) => ({ text, value }));

    const keywordTrends = await databaseManager.getTrends();

    const responsePayload = {
      kpi: {
        totalComments,
        averageSentiment: Number(averageSentiment.toFixed(2)),
        sentimentDistribution: { positive, neutral, negative },
        platformStats,
        topicStats
      },
      trends: dailyTrend,
      wordcloud: {
        ar: topArabicWords,
        en: topEnglishWords
      },
      keywordTrends
    };

    globalCache.set(cacheKey, responsePayload, TTL_TRENDS);
    res.json(responsePayload);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to compile trend statistics." });
  }
});

// POST research report using Gemini (Requirement E: HTTP 503 on failure, no invented reports)
app.post("/api/research-report", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    res.status(400).json({ error: "Missing topic parameter" });
    return;
  }

  const cacheKey = `report:${topic}`;
  if (globalCache.exists(cacheKey)) {
    res.json({ success: true, report: globalCache.get(cacheKey) });
    return;
  }

  const comments = await databaseManager.getComments();
  const filtered = comments.filter(c => (c.topic || '').toLowerCase() === topic.toLowerCase() || (c.text || '').toLowerCase().includes(topic.toLowerCase()));
  const contextComments = filtered.slice(0, 10).map(c => `- [${c.platform}] [Source: ${c.provenance?.sourceId}] "${c.text}" (Sentiment: ${c.sentiment}, score: ${c.sentimentScore})`).join("\n");

  const ai = getGeminiClient();

  if (!ai) {
    res.status(503).json({
      error: "Gemini API unavailable or quota limit reached. Intelligence reports require live model classification and cannot be manufactured locally.",
      degraded: true,
    });
    return;
  }

  try {
    const systemPrompt = "You are Jordan's senior state analyst and director of public research.";
    const prompt = `Generate an intelligence report focusing on the topic: "${topic}".
Below are verified citizen posts collected from monitored sources:

${contextComments || "No active matching comments found in database."}

Structure your report in Markdown with these EXACT headings:

### Executive Summary

### Key Findings

### Public Sentiment Analysis

### Top Emerging Issues

### Risk Assessment

### Stakeholder Analysis

### Media Narrative Analysis

### Strategic Recommendations

### Policy Recommendations

### Forecast for the Next 30–90 Days

Write in an objective, formal advisory tone. Output raw markdown starting with '### Executive Summary' directly without preamble.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    const reportText = response.text;
    if (reportText) {
      globalCache.set(cacheKey, reportText, 2 * 60 * 60);
      res.json({ success: true, report: reportText });
      return;
    }
  } catch (e: any) {
    handleGeminiError(e, "Gemini report generation");
  }

  res.status(503).json({
    error: "Gemini API failed to generate research report. Service degraded.",
    degraded: true,
  });
});

// Serve assets setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jordan Sentiment Analytics Server running on http://localhost:${PORT}`);
  });
}

startServer();
