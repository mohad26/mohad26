/**
 * Arabic Dialect & MSA NLP Engine + Codebook v1 Classification & Gemini Router.
 * Implements mathematical trends calculation, strict provenance, and codebook alignment.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Comment, PlatformType, SentimentType, Provenance } from "../src/types";
import { DBTrend } from "./db";
import codebook from "../config/codebook_v1.json";

export const CODEBOOK_VERSION = codebook.version; // "v1.0.0"

// Quota & Cooldown management state
export let geminiQuotaExhausted = false;
export let lastQuotaFailureTime = 0;
export const GROUNDING_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown on HTTP 429

export let totalRequestsUsed = 0;

export function setQuotaState(exhausted: boolean) {
  geminiQuotaExhausted = exhausted;
  if (exhausted) {
    lastQuotaFailureTime = Date.now();
  } else {
    lastQuotaFailureTime = 0;
    totalRequestsUsed = 0;
  }
}

export function handleGeminiError(e: any, context: string) {
  console.log(`[Gemini Handler] Failover active in [${context}] due to transient API rate/quota limits.`);
  const errMsg = e?.message || "";
  if (
    e?.code === 429 ||
    e?.status === 429 ||
    e?.status === "RESOURCE_EXHAUSTED" ||
    e?.response?.status === 429 ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("429")
  ) {
    geminiQuotaExhausted = true;
    lastQuotaFailureTime = Date.now();
  }
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  
  if (geminiQuotaExhausted) {
    if (Date.now() - lastQuotaFailureTime > GROUNDING_COOLDOWN_MS) {
      console.log("Grounding cooldown period elapsed. Resetting circuit breaker.");
      geminiQuotaExhausted = false;
    } else {
      return null;
    }
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-jordaninsight',
      }
    }
  });
}

/**
 * Classifies text against Codebook v1 using exact seed word boundaries.
 */
export function classifyThemeLexicon(text: string): { themeId: string; confidence: number } {
  const lowerText = text.toLowerCase();
  for (const theme of codebook.themes) {
    if (theme.id === "unclassified") continue;
    for (const seed of theme.seedTerms) {
      const escaped = seed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\s|\\b)${escaped}(?:$|\\s|\\b)`, 'i');
      if (regex.test(text) || lowerText.includes(seed.toLowerCase())) {
        return { themeId: theme.id, confidence: 0.85 };
      }
    }
  }
  return { themeId: "unclassified", confidence: 0.0 };
}

/**
 * High-Fidelity Local Lexicon NLP Engine with Codebook v1.
 */
export function cleanAndPreprocessLocal(text: string): { 
  cleanedText: string; 
  language: 'ar' | 'en'; 
  tokens: string[]; 
  namedEntities: string[]; 
  keyPhrases: string[]; 
  topic: string; 
  themeId: string;
  codebookVersion: string;
  themeConfidence: number;
  sentiment: SentimentType; 
  score: number;
  sentimentConfidence: number;
} {
  const arabicRegex = /[\u0600-\u06FF]/;
  const isArabic = arabicRegex.test(text);
  const lang = isArabic ? 'ar' : 'en';

  let cleaned = text
    .replace(/https?:\/\/\S+|www\.\S+/g, '')
    .replace(/@\w+/g, '')
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '')
    .trim();

  let processed = cleaned;
  if (isArabic) {
    // Normalization: Tashkeel removal, Hamza & Alif/Ya, and convention ة -> ه
    processed = processed
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه") // Convention: ة -> ه
      .replace(/ـ/g, "");
  } else {
    processed = processed.toLowerCase();
  }

  const stopWordsAr = ["في", "من", "على", "هذا", "التي", "الذي", "ان", "انها", "هو", "هي", "لا", "ما", "مع", "كان", "كانت", "يا", "بس", "وين", "لكن", "عن", "إلى", "إن", "هذه", "ثم", "أو", "حتى"];
  const stopWordsEn = ["the", "and", "a", "an", "is", "of", "to", "for", "in", "on", "with", "but", "very", "was", "were", "this", "it", "so", "some", "at", "about", "by", "from"];
  
  const rawWords = processed.split(/\s+/).map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ""));
  const tokens = rawWords.filter(w => {
    if (w.length < 3) return false;
    return isArabic ? !stopWordsAr.includes(w) : !stopWordsEn.includes(w.toLowerCase());
  });

  // Codebook v1 classification
  const themeRes = classifyThemeLexicon(text);

  // Sentiment Lexicons
  const posLexAr = ["رائع", "ممتاز", "خيالي", "جميل", "مبروك", "بطل", "كفو", "بجنن", "الاعظم", "فخور", "تنظيم", "تطور", "دافي", "كريم", "امن", "سلام", "مبدع", "حب", "إيجابي", "ممتازة", "حلو"];
  const negLexAr = ["مؤسف", "سوء", "تراجع", "مشاكل", "مرعب", "تعبنا", "غلاء", "غريب", "حفر", "جفاف", "اهمال", "تاخير", "غالي", "شحيح", "صعب", "معاناة", "سيء", "فشل", "مؤلمة", "خسارة", "ضرر"];

  const posLexEn = ["dream", "great", "supportive", "awesome", "proud", "amazing", "beautiful", "love", "wonderful", "safe", "excellent", "perfect", "good"];
  const negLexEn = ["expensive", "poor", "traffic", "mess", "problem", "disappointed", "struggle", "inflation", "hard", "worry", "bad", "slow", "ruin"];

  const negationsAr = ["مش", "ليس", "لا", "غير", "بدون", "ما", "مافي", "عدم"];
  const negationsEn = ["not", "no", "never", "without", "isn't", "don't", "didn't", "can't"];

  const words = rawWords;
  const isNegatedAt = (index: number): boolean => {
    const checkNegs = isArabic ? negationsAr : negationsEn;
    const windowStart = Math.max(0, index - 2);
    for (let i = windowStart; i < index; i++) {
      if (checkNegs.includes(words[i].toLowerCase())) return true;
    }
    return false;
  };

  let matchedWordsCount = 0;
  let sentimentScore = 0.0;

  if (isArabic) {
    posLexAr.forEach(kw => {
      const idx = words.findIndex(w => w.includes(kw));
      if (idx !== -1) {
        matchedWordsCount++;
        sentimentScore += isNegatedAt(idx) ? -0.50 : 0.45;
      }
    });
    negLexAr.forEach(kw => {
      const idx = words.findIndex(w => w.includes(kw));
      if (idx !== -1) {
        matchedWordsCount++;
        sentimentScore += isNegatedAt(idx) ? 0.35 : -0.50;
      }
    });
  } else {
    posLexEn.forEach(kw => {
      const idx = words.findIndex(w => w.toLowerCase().includes(kw));
      if (idx !== -1) {
        matchedWordsCount++;
        sentimentScore += isNegatedAt(idx) ? -0.50 : 0.45;
      }
    });
    negLexEn.forEach(kw => {
      const idx = words.findIndex(w => w.toLowerCase().includes(kw));
      if (idx !== -1) {
        matchedWordsCount++;
        sentimentScore += isNegatedAt(idx) ? 0.35 : -0.50;
      }
    });
  }

  // FIX: If no sentiment words matched, unmatched returns 0.0 neutral, not positive 0.35
  if (matchedWordsCount === 0) {
    sentimentScore = 0.0;
  } else {
    sentimentScore = Math.max(-1.0, Math.min(1.0, sentimentScore));
  }
  
  let sentiment: SentimentType = "neutral";
  if (sentimentScore > 0.2) sentiment = "positive";
  else if (sentimentScore < -0.2) sentiment = "negative";

  const entityWords = isArabic
    ? ["البترا", "عمان", "العقبة", "النشامى", "الزرقاء", "صويلح", "إربد", "عجلون", "الأردن", "جرش"]
    : ["Petra", "Amman", "Aqaba", "Rum", "Jordan", "Jerash", "Nashama", "Ajloun"];
     
  const namedEntities = rawWords.filter(w => entityWords.some(ew => ew.toLowerCase() === w.toLowerCase() || ew === w));
  const uniqueEntities = Array.from(new Set(namedEntities)).slice(0, 4);

  // Label theme for topic display
  const matchingThemeObj = codebook.themes.find(t => t.id === themeRes.themeId);
  const topicLabel = matchingThemeObj ? matchingThemeObj.labels.en : "Unclassified / General";

  return {
    cleanedText: processed,
    language: lang,
    tokens: tokens.slice(0, 8),
    namedEntities: uniqueEntities.length ? uniqueEntities : [isArabic ? "الأردن" : "Jordan"],
    keyPhrases: [processed.split(" ").slice(0, 3).join(" ")].filter(Boolean),
    topic: topicLabel,
    themeId: themeRes.themeId,
    codebookVersion: CODEBOOK_VERSION,
    themeConfidence: themeRes.confidence,
    sentiment,
    score: Number(sentimentScore.toFixed(2)),
    sentimentConfidence: matchedWordsCount > 0 ? 0.8 : 0.5,
  };
}

/**
 * Batch analysis using Gemini with Codebook v1 schema constraints.
 */
export async function analyzeCommentsBatch(rawItems: {
  author: string;
  handle: string;
  platform: PlatformType;
  text: string;
  likes?: number;
  shares?: number;
  url?: string | null;
  provenance?: any;
}[]): Promise<Comment[]> {
  const result: Comment[] = [];
  const ai = getGeminiClient();

  if (!ai || rawItems.length === 0) {
    return rawItems.map((item, index) => {
      const local = cleanAndPreprocessLocal(item.text);
      const defaultProv: Provenance = item.provenance || {
        sourceId: 'user_input',
        kind: 'social_comment',
        nativeUrl: item.url || null,
        fetchedAt: new Date().toISOString(),
        collectedLive: true,
      };

      return {
        id: `comment-local-${Date.now()}-${index}`,
        author: item.author,
        handle: item.handle,
        platform: item.platform,
        text: item.text,
        cleanedText: local.cleanedText,
        language: local.language,
        sentiment: local.sentiment,
        sentimentScore: local.score,
        topic: local.topic,
        themeId: local.themeId,
        codebookVersion: local.codebookVersion,
        themeConfidence: local.themeConfidence,
        timestamp: new Date().toISOString(),
        likeCount: item.likes ?? null,
        replyCount: item.shares ?? null,
        tokens: local.tokens,
        namedEntities: local.namedEntities,
        keyPhrases: local.keyPhrases,
        provenance: defaultProv,
        nlpInstrument: 'lexicon_rules',
        sentimentConfidence: local.sentimentConfidence,
      };
    });
  }

  const validThemeIds = codebook.themes.map(t => t.id);
  const textsToAnalyze = rawItems.map((item, idx) => `[ID: ${idx}] Post: "${item.text}"`).join("\n");

  const prompt = `Analyze the following Jordanian public posts against Codebook v1 (${CODEBOOK_VERSION}).
Available Theme IDs: ${validThemeIds.join(', ')}.

Return a JSON array where each item matches:
{
  "idx": number,
  "language": "ar" | "en",
  "cleanedText": string,
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": float between -1.0 and 1.0,
  "themeId": one of [${validThemeIds.map(t => `'${t}'`).join(', ')}],
  "confidence": float between 0.0 and 1.0
}

Posts to analyze:
${textsToAnalyze}`;

  try {
    totalRequestsUsed++;
    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert NLP researcher classifying Jordanian citizen dialogue according to Codebook v1 rules."
      }
    });

    const parsed = JSON.parse(aiResponse.text || "[]");
    if (Array.isArray(parsed)) {
      rawItems.forEach((item, index) => {
        const itemAnalysis = parsed.find((p: any) => p.idx === index) || {};
        const local = cleanAndPreprocessLocal(item.text);

        const themeId = validThemeIds.includes(itemAnalysis.themeId) ? itemAnalysis.themeId : local.themeId;
        const matchingTheme = codebook.themes.find(t => t.id === themeId);

        const defaultProv: Provenance = item.provenance || {
          sourceId: 'user_input',
          kind: 'social_comment',
          nativeUrl: item.url || null,
          fetchedAt: new Date().toISOString(),
          collectedLive: true,
        };

        result.push({
          id: `comment-gemini-${Date.now()}-${index}`,
          author: item.author,
          handle: item.handle,
          platform: item.platform,
          text: item.text,
          cleanedText: itemAnalysis.cleanedText || local.cleanedText,
          language: itemAnalysis.language || local.language,
          sentiment: itemAnalysis.sentiment || local.sentiment,
          sentimentScore: itemAnalysis.sentimentScore ?? local.score,
          topic: matchingTheme ? matchingTheme.labels.en : local.topic,
          themeId,
          codebookVersion: CODEBOOK_VERSION,
          themeConfidence: itemAnalysis.confidence ?? 0.9,
          timestamp: new Date().toISOString(),
          likeCount: item.likes ?? null,
          replyCount: item.shares ?? null,
          tokens: local.tokens,
          namedEntities: local.namedEntities,
          keyPhrases: local.keyPhrases,
          provenance: defaultProv,
          nlpInstrument: 'gemini_llm',
          sentimentConfidence: 0.95,
        });
      });
      return result;
    }
  } catch (err) {
    handleGeminiError(err, "Batch Ingestion Gemini call");
  }

  // Fallback
  return rawItems.map((item, index) => {
    const local = cleanAndPreprocessLocal(item.text);
    const defaultProv: Provenance = item.provenance || {
      sourceId: 'user_input',
      kind: 'social_comment',
      nativeUrl: item.url || null,
      fetchedAt: new Date().toISOString(),
      collectedLive: true,
    };

    return {
      id: `comment-fallback-${Date.now()}-${index}`,
      author: item.author,
      handle: item.handle,
      platform: item.platform,
      text: item.text,
      cleanedText: local.cleanedText,
      language: local.language,
      sentiment: local.sentiment,
      sentimentScore: local.score,
      topic: local.topic,
      themeId: local.themeId,
      codebookVersion: local.codebookVersion,
      themeConfidence: local.themeConfidence,
      timestamp: new Date().toISOString(),
      likeCount: item.likes ?? null,
      replyCount: item.shares ?? null,
      tokens: local.tokens,
      namedEntities: local.namedEntities,
      keyPhrases: local.keyPhrases,
      provenance: defaultProv,
      nlpInstrument: 'lexicon_rules',
      sentimentConfidence: local.sentimentConfidence,
    };
  });
}

/**
 * MATHEMATICAL TRENDS CALCULATOR (Requirement A)
 * - Counts term occurrences in 7-day current window vs 7-day prior window in actual corpus.
 * - growth_rate = (current - prior) / max(prior, 1) * 100.
 * - Suppresses terms with total (prior + current) < 10.
 * - Gemini ONLY generates the bilingual Arabic/English display labels.
 */
export async function updateTrendingKeywordsFromComments(comments: Comment[]): Promise<DBTrend[]> {
  if (!comments || comments.length === 0) return [];

  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const currentCutoff = now - SEVEN_DAYS_MS;
  const priorCutoff = now - (2 * SEVEN_DAYS_MS);

  const currentWindowComments = comments.filter(c => {
    const t = new Date(c.timestamp).getTime();
    return t >= currentCutoff;
  });

  const priorWindowComments = comments.filter(c => {
    const t = new Date(c.timestamp).getTime();
    return t >= priorCutoff && t < currentCutoff;
  });

  // Extract candidate tokens/phrases across current and prior windows
  const currentCounts: Record<string, number> = {};
  const priorCounts: Record<string, number> = {};

  const extractTerms = (c: Comment) => {
    const text = (c.cleanedText || c.text || '').toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length >= 3);
    const set = new Set<string>();
    words.forEach(w => set.add(w));
    return Array.from(set);
  };

  currentWindowComments.forEach(c => {
    extractTerms(c).forEach(term => {
      currentCounts[term] = (currentCounts[term] || 0) + 1;
    });
  });

  priorWindowComments.forEach(c => {
    extractTerms(c).forEach(term => {
      priorCounts[term] = (priorCounts[term] || 0) + 1;
    });
  });

  // Collect candidate terms with current + prior >= 10
  const candidateTerms: { term: string; current: number; prior: number; total: number; growthRate: number }[] = [];
  const allTerms = new Set([...Object.keys(currentCounts), ...Object.keys(priorCounts)]);

  allTerms.forEach(term => {
    const curr = currentCounts[term] || 0;
    const pri = priorCounts[term] || 0;
    const total = curr + pri;
    if (total >= 10) { // Requirement: Suppress any term with prior+current < 10
      const growthRate = Number((((curr - pri) / Math.max(pri, 1)) * 100).toFixed(1));
      candidateTerms.push({ term, current: curr, prior: pri, total, growthRate });
    }
  });

  // Sort by total occurrences descending
  candidateTerms.sort((a, b) => b.total - a.total);
  const topCandidates = candidateTerms.slice(0, 8);

  if (topCandidates.length === 0) {
    return [];
  }

  // Ask Gemini ONLY for bilingual Arabic/English label pairs and category mapping for our computed terms
  const ai = getGeminiClient();
  let labelMappings: Record<string, { keyword: string; keywordAr: string; category: string }> = {};

  if (ai) {
    try {
      const termList = topCandidates.map(tc => tc.term).join(', ');
      const prompt = `Provide clean bilingual research labels (English & Arabic) and policy category for these exact terms extracted from Jordanian public discourse: [${termList}].
Category must be exactly one of: 'sports', 'economy', 'tourism', 'infrastructure', 'utilities', 'culture'.

Return a JSON array:
[
  {
    "term": "string",
    "keyword": "short English label",
    "keywordAr": "short Arabic label",
    "category": "sports" | "economy" | "tourism" | "infrastructure" | "utilities" | "culture"
  }
]`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsed = JSON.parse(aiRes.text || "[]");
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          if (p.term) {
            labelMappings[p.term] = {
              keyword: p.keyword || p.term,
              keywordAr: p.keywordAr || p.term,
              category: ['sports', 'economy', 'tourism', 'infrastructure', 'utilities', 'culture'].includes(p.category) ? p.category : 'culture'
            };
          }
        });
      }
    } catch (e) {
      handleGeminiError(e, "Trends Label Mapping");
    }
  }

  // Build final trends with EXACT computed frequency and growth_rate
  const trends: DBTrend[] = topCandidates.map(tc => {
    const mapped = labelMappings[tc.term] || {
      keyword: tc.term,
      keywordAr: tc.term,
      category: 'culture' as const
    };

    return {
      keyword: mapped.keyword,
      keywordAr: mapped.keywordAr,
      frequency: tc.current, // Real current 7-day count
      growth_rate: tc.growthRate, // Real computed growth rate percentage
      category: mapped.category as any,
    };
  });

  return trends;
}
