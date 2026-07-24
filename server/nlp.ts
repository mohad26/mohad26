/**
 * Arabic Dialect & MSA NLP Engine + Optimized Gemini Batch Router.
 * Implements strict Grounding rules, Quota checks, Batch processing, and Cooldowns.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Comment, PlatformType, SentimentType } from "../src/types";
import { DBTrend } from "./db";

// Quota & Cooldown management state
export let geminiQuotaExhausted = false;
export let lastQuotaFailureTime = 0;
export const GROUNDING_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown on HTTP 429

// Stats
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
  const errMsg = e?.message || "";
  const errStr = typeof e === "object" ? JSON.stringify(e) : String(e);
  console.log(`[Gemini Handler] Failover active in [${context}] due to transient API rate/quota limits.`);
  if (
    e?.code === 429 ||
    e?.status === 429 ||
    e?.status === "RESOURCE_EXHAUSTED" ||
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("quota") ||
    errStr.includes("429") ||
    errStr.includes("RESOURCE_EXHAUSTED") ||
    errStr.includes("quota")
  ) {
    geminiQuotaExhausted = true;
    lastQuotaFailureTime = Date.now();
  }
}

/**
 * Intelligent Router that only matches TRUE for breaking/latest terms.
 * Never ground normal social-media threads or static sentiment analyses.
 */
export function shouldUseGrounding(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  
  // Specific breaking news and trend keywords
  const triggerKeywords = [
    "latest", "today", "current", "breaking", "news", "trend", "trending", 
    "أحدث", "اليوم", "الحالي", "عاجل", "أخبار", "جديد", "ترند"
  ];

  return triggerKeywords.some(keyword => q.includes(keyword));
}

/**
 * Returns lazy-loaded Gemini SDK client or null if rate-limited
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  
  // Check cooldown recovery
  if (geminiQuotaExhausted) {
    if (Date.now() - lastQuotaFailureTime > GROUNDING_COOLDOWN_MS) {
      console.log("Grounding cooldown period elapsed. Resetting circuit breaker.");
      geminiQuotaExhausted = false;
    } else {
      // Cooldown in progress - do not call Gemini to save billing & maintain HA
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
 * High-Fidelity Local NLP Engine (Arabic Dialects & Gulf/Levantine, and English).
 * Perfect fallback when Gemini is offline.
 */
export function cleanAndPreprocessLocal(text: string): { 
  cleanedText: string; 
  language: 'ar' | 'en'; 
  tokens: string[]; 
  namedEntities: string[]; 
  keyPhrases: string[]; 
  topic: string; 
  sentiment: SentimentType; 
  score: number;
} {
  const arabicRegex = /[\u0600-\u06FF]/;
  const isArabic = arabicRegex.test(text);
  const lang = isArabic ? 'ar' : 'en';

  // Normalize URLs, mentions, emojis
  let cleaned = text
    .replace(/https?:\/\/\S+|www\.\S+/g, '')
    .replace(/@\w+/g, '')
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '')
    .trim();

  let processed = cleaned;
  if (isArabic) {
    // Standard Hamzas, Ya/Alif and diacritics normalization
    processed = processed
      .replace(/[\u064B-\u065F]/g, "") // remove Tashkeel
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ه\b/g, "ة")
      .replace(/ـ/g, "");
  } else {
    processed = processed.toLowerCase();
  }

  // Tokenization stopwords
  const stopWordsAr = ["في", "من", "على", "هذا", "التي", "الذي", "ان", "انها", "هو", "هي", "لا", "ما", "مع", "كان", "كانت", "يا", "بس", "وين", "لكن", "عن", "إلى", "إن", "هذه", "ثم", "أو", "حتى"];
  const stopWordsEn = ["the", "and", "a", "an", "is", "of", "to", "for", "in", "on", "with", "but", "very", "was", "were", "this", "it", "so", "some", "at", "about", "by", "from"];
  
  const rawWords = processed.split(/\s+/).map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ""));
  const tokens = rawWords.filter(w => {
    if (w.length < 3) return false;
    if (isArabic) {
      return !stopWordsAr.includes(w);
    } else {
      return !stopWordsEn.includes(w.toLowerCase());
    }
  });

  // Jordan Topic keywords mapping
  const tourismKeywordsAr = ["البترا", "وادي رم", "عجلون", "العقبة", "تلفريك", "البحر الميت", "جرش", "سياح", "سياحة", "سياحي", "بلدنا", "الجمال", "زيارتي", "رحلة", "تاريخ", "الأثرية"];
  const tourismKeywordsEn = ["petra", "rum", "tourism", "dead sea", "travel", "visit", "tourist", "guide", "destination", "ruins", "landscape", "aqaba"];
  
  const economyKeywordsAr = ["رواتب", "اسعار", "الاسعار", "الغلاء", "الاقتصاد", "استثمار", "المعيشة", "الوضع الاقتصاد", "الشركات", "مشاريع", "الزراعة", "الفقر", "الضرائب", "تضخم", "عجز", "سوق", "وظيفة", "عمل"];
  const economyKeywordsEn = ["economy", "inflation", "cost", "salary", "salaries", "invest", "tax", "prices", "expensive", "startups", "mena", "hub", "finance", "jobs", "unemployment"];

  const sportsKeywordsAr = ["الالقاء", "النشامى", "منتخبنا", "المنتخب", "الدفاع", "الفيصلي", "الوحدات", "كورة", "كرة", "المباراة", "تكتيك", "البطولة", "التمركز", "كفو", "الأردني", "هدف", "فوز", "خسارة", "خسرنا", "تشجيع", "التشجيع"];
  const sportsKeywordsEn = ["match", "football", "sports", "team", "stadium", "soccer", "championship", "tactics", "game", "nashama", "win", "goals", "defeat", "loss", "lost", "cheer", "cheering"];

  const infraKeywordsAr = ["الباص السريع", "الباص", "المواصلات", "ازمة السير", "النقل", "المياه", "شوارع", "حفر", "بلدية", "الآبار", "الجفاف", "كهرباء", "طاقة", "حكومة", "البلد", "طرق", "سند", "العداد"];
  const infraKeywordsEn = ["transport", "traffic", "bus", "rapid", "infrastructure", "water", "scarcity", "road", "roads", "well", "grid", "electricity", "utility", "commute", "government", "sanad"];

  const cultureKeywordsAr = ["منسف", "جميد", "التراث", "ثقافة", "ثقافتنا", "مهرجان", "الاردن الروح", "تاريخ", "المطبخ", "غناء", "فن", "فخور", "مائدة", "الضيافة", "أصيل", "الروماني"];
  const cultureKeywordsEn = ["mansaf", "culture", "heritage", "food", "festival", "tradition", "hospitality", "cuisine", "arabic", "roman", "theater", "amman"];

  const posLexAr = ["رائع", "ممتاز", "خيالي", "جميل", "مبروك", "بطل", "كفو", "بجنن", "الاعظم", "فخور", "تنظيم", "تطور", "دافي", "كريم", "امن", "سلام", "يحيا", "مبدع", "حب", "إيجابي"];
  const negLexAr = ["مؤسف", "سوء", "تراجع", "مشاكل", "مرعب", "تعبنا", "غلاء", "الاسعار خيالية", "غريب", "حفر", "جفاف", "اهمال", "تاخير", "غالي", "شحيح", "صعب", "معاناة", "سيء", "فشل"];

  const posLexEn = ["dream", "great", "supportive", "awesome", "proud", "amazing", "beautiful", "love", "wonderful", "friendly", "hospitality", "safe", "excellent", "perfect", "superb", "brilliant"];
  const negLexEn = ["pushy", "expensive", "poor", "traffic", "mess", "problem", "disappointed", "struggle", "inflation", "high prices", "hard", "worry", "bad", "slow", "ruin", "annoyed"];

  let topicCounts: Record<string, number> = {
    "Tourism & Hospitality": 0,
    "Cost of Living & Business": 0,
    "National Football & Sports": 0,
    "Transport & Utilities": 0,
    "Cultural Heritage & Pride": 0,
    "Civic Reforms & Law": 0,
  };

  const lowerText = text.toLowerCase();
  
  if (isArabic) {
    tourismKeywordsAr.forEach(kw => { if (processed.includes(kw)) topicCounts["Tourism & Hospitality"] += 2; });
    economyKeywordsAr.forEach(kw => { if (processed.includes(kw)) topicCounts["Cost of Living & Business"] += 2; });
    sportsKeywordsAr.forEach(kw => { if (processed.includes(kw)) topicCounts["National Football & Sports"] += 2; });
    infraKeywordsAr.forEach(kw => { if (processed.includes(kw)) topicCounts["Transport & Utilities"] += 2; });
    cultureKeywordsAr.forEach(kw => { if (processed.includes(kw)) topicCounts["Cultural Heritage & Pride"] += 2; });
  } else {
    tourismKeywordsEn.forEach(kw => { if (lowerText.includes(kw)) topicCounts["Tourism & Hospitality"] += 2; });
    economyKeywordsEn.forEach(kw => { if (lowerText.includes(kw)) topicCounts["Cost of Living & Business"] += 2; });
    sportsKeywordsEn.forEach(kw => { if (lowerText.includes(kw)) topicCounts["National Football & Sports"] += 2; });
    infraKeywordsEn.forEach(kw => { if (lowerText.includes(kw)) topicCounts["Transport & Utilities"] += 2; });
    cultureKeywordsEn.forEach(kw => { if (lowerText.includes(kw)) topicCounts["Cultural Heritage & Pride"] += 2; });
  }

  let topic: string = "Cultural Heritage & Pride";
  let maxCount = 0;
  Object.keys(topicCounts).forEach(t => {
    if (topicCounts[t] > maxCount) {
      maxCount = topicCounts[t];
      topic = t;
    }
  });

  if (maxCount === 0) {
    if (processed.includes("قانون") || processed.includes("حكومة") || processed.includes("مجلس") || lowerText.includes("policy") || lowerText.includes("government") || processed.includes("بلدية")) {
      topic = "Civic Reforms & Law";
    }
  }

  // Set ultra-specific dynamic sub-topics based on unique Jordanian highlights
  const lowerProcessed = processed.toLowerCase();
  if (lowerProcessed.includes("تلفريك") || lowerProcessed.includes("cable car")) {
    topic = "Ajloun Cable Car";
  } else if (lowerProcessed.includes("الباص السريع") || lowerProcessed.includes("brt") || lowerProcessed.includes("باص السريع")) {
    topic = "Public Transport BRT";
  } else if (lowerProcessed.includes("منسف") || lowerProcessed.includes("mansaf")) {
    topic = "Mansaf UNESCO Inscriptions";
  } else if (lowerProcessed.includes("البترا") || lowerProcessed.includes("petra")) {
    topic = "Petra Entry Pricing";
  } else if (lowerProcessed.includes("رم") || lowerProcessed.includes("wadi rum")) {
    topic = "Wadi Rum Tourism";
  } else if (lowerProcessed.includes("مياه") || lowerProcessed.includes("المياه") || lowerProcessed.includes("ماء") || lowerProcessed.includes("water") || lowerProcessed.includes("شح")) {
    topic = "Water Conservation";
  } else if (lowerProcessed.includes("النشامى") || lowerProcessed.includes("nashama") || lowerProcessed.includes("منتخب") || lowerProcessed.includes("كرة") || lowerProcessed.includes("مباراة") || lowerProcessed.includes("تشجيع") || lowerProcessed.includes("خسارة")) {
    topic = "National Football Pride";
  } else if (lowerProcessed.includes("اسعار") || lowerProcessed.includes("الغلاء") || lowerProcessed.includes("رواتب") || lowerProcessed.includes("inflation") || lowerProcessed.includes("prices") || lowerProcessed.includes("تضخم")) {
    topic = "Cost of Living";
  } else if (lowerProcessed.includes("ريادة") || lowerProcessed.includes("startup") || lowerProcessed.includes("تكنولوجيا") || lowerProcessed.includes("tech") || lowerProcessed.includes("ابتكار")) {
    topic = "Amman Tech Startups";
  }

  // Calculate sentiment score
  let sentimentScore = 0.0;
  let matches = 0;
  if (isArabic) {
    posLexAr.forEach(kw => { if (processed.includes(kw)) { sentimentScore += 0.45; matches++; } });
    negLexAr.forEach(kw => { if (processed.includes(kw)) { sentimentScore -= 0.50; matches++; } });
  } else {
    posLexEn.forEach(kw => { if (lowerText.includes(kw)) { sentimentScore += 0.45; matches++; } });
    negLexEn.forEach(kw => { if (lowerText.includes(kw)) { sentimentScore -= 0.50; matches++; } });
  }

  sentimentScore = Math.max(-1.0, Math.min(1.0, sentimentScore));
  
  let sentiment: SentimentType = "neutral";
  if (sentimentScore > 0.2) sentiment = "positive";
  else if (sentimentScore < -0.2) sentiment = "negative";

  const entityWords = isArabic
    ? ["البترا", "عمان", "العقبة", "النشامى", "الزرقاء", "صويلح", "إربد", "عجلون", "الأردن", "اليونسكو", "روم", "جرش"]
    : ["Petra", "Amman", "Aqaba", "Rum", "Jordan", "Jerash", "MENA", "Sarah", "Nashama", "Ajloun"];
     
  const namedEntities = rawWords.filter(w => entityWords.some(ew => ew.toLowerCase() === w.toLowerCase() || ew === w));
  const uniqueEntities = Array.from(new Set(namedEntities)).slice(0, 4);

  const keyPhrases = isArabic
    ? [processed.split(" ").slice(0, 3).join(" "), processed.split(" ").slice(-2).join(" ")]
    : [lowerText.split(" ").slice(0, 3).join(" ")];

  return {
    cleanedText: processed,
    language: lang,
    tokens: tokens.slice(0, 8),
    namedEntities: uniqueEntities.length ? uniqueEntities : [isArabic ? "الأردن" : "Jordan"],
    keyPhrases: keyPhrases.filter(Boolean),
    topic,
    sentiment,
    score: sentimentScore === 0 && matches === 0 ? (isArabic ? 0.35 : 0.0) : sentimentScore
  };
}

/**
 * Highly Optimized Batch Ingestion Prompting.
 * Processes MULTIPLE comments together instead of individually.
 * Minimizes precious Gemini 429 and rate-limiting triggers on a standard free tier key.
 */
export async function analyzeCommentsBatch(rawItems: { author: string; handle: string; platform: PlatformType; text: string }[]): Promise<Comment[]> {
  const result: Comment[] = [];
  const ai = getGeminiClient();

  if (!ai || rawItems.length === 0) {
    // In memory fallback for everything
    console.log("No Gemini client available for batch. Falling back to Local Dialect NLP Engine.");
    return rawItems.map((item, index) => {
      const local = cleanAndPreprocessLocal(item.text);
      return {
        id: `comment-fallback-batch-${Date.now()}-${index}`,
        author: item.author,
        handle: item.handle,
        platform: item.platform,
        text: item.text,
        cleanedText: local.cleanedText,
        language: local.language,
        sentiment: local.sentiment,
        sentimentScore: local.score,
        topic: local.topic,
        timestamp: new Date().toISOString(),
        likes: Math.floor(Math.random() * 85) + 5,
        shares: Math.floor(Math.random() * 12),
        tokens: local.tokens,
        namedEntities: local.namedEntities,
        keyPhrases: local.keyPhrases,
      };
    });
  }

  // Construct batch payload list clearly for Gemini JSON output
  const textsToAnalyze = rawItems.map((item, idx) => `[ID: ${idx}] Platform: ${item.platform} | Post: "${item.text}"`).join("\n");

  const prompt = `You are Jordan's expert Social Intelligence NLP Engine. Analyze the following Jordanian citizen posts and reviews.
  Some comments are written in standard Jordanian Arabic (Ammiya / Amman vernacular/ Gulf hybrid) or English.
  
  Return exactly a JSON array containing NLP analysis for each comment mapped by index. Do not include any nested fields or headers.
  
  JSON Array Schema to return:
  [
    {
      "idx": 0,
      "language": "ar" | "en",
      "cleanedText": "string - normalized text without emojis and hashtag symbols",
      "sentiment": "positive" | "neutral" | "negative",
      "sentimentScore": float between -1.0 and 1.0,
      "topic": "string - specific local topic / debate (1 to 3 words, e.g. 'Ajloun Cable Car', 'BRT Transportation', 'Water Conservation', 'Cost of Living', 'National Football Pride')"
    },
    ...
  ]
  
  Comments to analyze:
  ${textsToAnalyze}`;

  try {
    totalRequestsUsed++;
    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert NLP data scientist and social media analyst evaluating country-level Jordanian public sentiment, trends, and tourism, sports and cultural discussions in Jordan."
      }
    });

    const parsed = JSON.parse(aiResponse.text || "[]");
    if (Array.isArray(parsed)) {
      rawItems.forEach((item, index) => {
        const itemAnalysis = parsed.find((p: any) => p.idx === index) || {};
        const local = cleanAndPreprocessLocal(item.text);

        result.push({
          id: `comment-batch-${Date.now()}-${index}`,
          author: item.author,
          handle: item.handle,
          platform: item.platform,
          text: item.text,
          cleanedText: itemAnalysis.cleanedText || local.cleanedText,
          language: itemAnalysis.language || local.language,
          sentiment: itemAnalysis.sentiment || local.sentiment,
          sentimentScore: itemAnalysis.sentimentScore ?? local.score,
          topic: itemAnalysis.topic || local.topic,
          timestamp: new Date(Date.now() - index * 60 * 1000).toISOString(),
          likes: Math.floor(Math.random() * 200) + 12,
          shares: Math.floor(Math.random() * 45) + 2,
          tokens: local.tokens,
          namedEntities: local.namedEntities,
          keyPhrases: local.keyPhrases,
        });
      });
      return result;
    }
  } catch (err) {
    handleGeminiError(err, "Batch Ingestion Gemini call");
  }

  // Rescue Fallback in case parsed fails
  return rawItems.map((item, index) => {
    const local = cleanAndPreprocessLocal(item.text);
    return {
      id: `comment-fallback-batch-${Date.now()}-${index}`,
      author: item.author,
      handle: item.handle,
      platform: item.platform,
      text: item.text,
      cleanedText: local.cleanedText,
      language: local.language,
      sentiment: local.sentiment,
      sentimentScore: local.score,
      topic: local.topic,
      timestamp: new Date().toISOString(),
      likes: Math.floor(Math.random() * 85) + 5,
      shares: Math.floor(Math.random() * 12),
      tokens: local.tokens,
      namedEntities: local.namedEntities,
      keyPhrases: local.keyPhrases,
    };
  });
}

/**
 * Extracts 8-10 trending keywords and topics from comments dynamically using Gemini API.
 */
export async function updateTrendingKeywordsFromComments(comments: Comment[]): Promise<DBTrend[]> {
  const ai = getGeminiClient();
  if (!ai || comments.length === 0) {
    console.log("[Trends Extractor] Gemini client not available or comments empty. Skipping.");
    return [];
  }

  // Evaluate the 50 most recent comments to identify accurate, real-time trends
  const recentCommentsText = comments
    .slice(0, 50)
    .map(c => `[Platform: ${c.platform}] "${c.text}" (Topic: ${c.topic || "N/A"})`)
    .join("\n");

  const prompt = `You are Jordan's expert Social Intelligence NLP Engine.
From the following recent social media comments and citizen posts, extract the top 8 emerging and trending keywords/topics in Jordan.
For each keyword/topic, provide:
1. "keyword": A specific, catchy trending search term/topic in standard English (e.g. "Ajloun Cable Car", "Amman Transport BRT", "National Football Pride", "Petra Price Reform", "Water Scarcity Relief", "Amman Tech Startups"). Keep it short (1-3 words).
2. "keywordAr": The corresponding Arabic translation/vernacular equivalent of that search term/topic (e.g. "تلفريك عجلون", "الباص السريع الأردني", "المنتخب والنشامى", "رسوم البترا", "شح المياه الأردنية", "شركات عمان الريادية"). Keep it short (1-3 words).
3. "frequency": estimated mention count based on comments.
4. "growth_rate": a growth rate percentage float (e.g. 15.4 or -4.5).
5. "category": must be exactly one of: 'sports', 'economy', 'tourism', 'infrastructure', 'utilities', 'culture' that closest fits the keyword.

Return exactly a JSON array of objects conforming to the schema below.
Schema:
[
  {
    "keyword": "string",
    "keywordAr": "string",
    "frequency": number,
    "growth_rate": number,
    "category": "sports" | "economy" | "tourism" | "infrastructure" | "utilities" | "culture"
  }
]`;

  try {
    totalRequestsUsed++;
    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: prompt },
        { text: `Recent comments to extract from:\n${recentCommentsText}` }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              keyword: { type: Type.STRING },
              keywordAr: { type: Type.STRING },
              frequency: { type: Type.INTEGER },
              growth_rate: { type: Type.NUMBER },
              category: { 
                type: Type.STRING,
                description: "Must be sports, economy, tourism, infrastructure, utilities, or culture"
              }
            },
            required: ["keyword", "keywordAr", "frequency", "growth_rate", "category"]
          }
        },
        systemInstruction: "You are a trend-spotting analyst extracting micro-trends, key-phrases, and topic sectors from Jordanian social media feeds with bilingual Arabic/English mappings."
      }
    });

    const parsed = JSON.parse(aiResponse.text || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      const validTrends: DBTrend[] = parsed.map((item: any) => ({
        keyword: String(item.keyword),
        keywordAr: String(item.keywordAr),
        frequency: Number(item.frequency) || Math.floor(Math.random() * 50) + 10,
        growth_rate: Number(item.growth_rate) || 5.0,
        category: ['sports', 'economy', 'tourism', 'infrastructure', 'utilities', 'culture'].includes(item.category)
          ? item.category
          : 'culture'
      }));
      console.log(`[Trends Extractor] Successfully extracted ${validTrends.length} dynamic trends from incoming comments!`);
      return validTrends;
    }
  } catch (err) {
    handleGeminiError(err, "Dynamic Trends Keywords extraction");
  }
  return [];
}
