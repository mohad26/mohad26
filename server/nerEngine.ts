/**
 * Advanced Jordanian Multilingual Named Entity Recognition (NER) & Topic Modeling Engine.
 * Re-exports isomorphic NER gazetteers and functions from src/utils/ner,
 * and adds server-side Gemini-powered contextual disambiguation and hybrid pipelines.
 */

import { GoogleGenAI } from "@google/genai";
import { RecognizedEntity, EntityCategory, EntityTopicInsight, Comment, SentimentType } from "../src/types/index.ts";
import { 
  JORDAN_ENTITIES_GAZETTEER, 
  GazetteerEntry,
  normalizeArabicForNER, 
  extractEntitiesRuleBased, 
  compileEntityTopicInsights,
  filterEntityInsights,
  ENTITY_TYPE_LABELS
} from "../src/utils/ner";

export { 
  JORDAN_ENTITIES_GAZETTEER, 
  normalizeArabicForNER, 
  extractEntitiesRuleBased, 
  compileEntityTopicInsights,
  filterEntityInsights,
  ENTITY_TYPE_LABELS
};
export type { GazetteerEntry };

/**
 * Gemini Contextual Multilingual NER Enhancer
 * Uses gemini-2.5-flash to extract subtle dialectal entities, nicknames, and context sentiment.
 */
export async function extractEntitiesWithGemini(
  text: string,
  aiClient: GoogleGenAI | null,
  contextThemeId?: string
): Promise<RecognizedEntity[]> {
  if (!aiClient || !text || text.trim().length < 5) {
    return [];
  }

  try {
    const prompt = `Perform Named Entity Recognition (NER) on this Jordanian social media comment.
Extract and classify entities into three types ONLY:
- "person" (public figures, officials, ministers, athletes, monarchs)
- "organization" (ministries, municipalities, agencies, funds, companies, clubs)
- "location" (Jordanian cities, governorates, heritage sites, districts)

Return a clean JSON array matching:
[
  {
    "name": "Arabic standard name",
    "nameEn": "English standard name",
    "type": "person" | "organization" | "location",
    "confidence": float 0.0-1.0,
    "salience": float 0.0-1.0,
    "sentiment": "positive" | "neutral" | "negative",
    "sentimentScore": float -1.0 to 1.0
  }
]

Comment: "${text}"`;

    const aiRes = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a senior computational linguist specializing in Arabic Dialect Named Entity Recognition for Jordan."
      }
    });

    const parsed = JSON.parse(aiRes.text || "[]");
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: any) => item.name && ['person', 'organization', 'location'].includes(item.type))
        .map((item: any) => ({
          name: String(item.name).trim(),
          nameEn: item.nameEn ? String(item.nameEn).trim() : undefined,
          type: item.type as EntityCategory,
          confidence: typeof item.confidence === 'number' ? Math.min(1.0, Math.max(0.1, item.confidence)) : 0.92,
          salience: typeof item.salience === 'number' ? item.salience : 0.6,
          sentiment: ['positive', 'neutral', 'negative'].includes(item.sentiment) ? item.sentiment : 'neutral',
          sentimentScore: typeof item.sentimentScore === 'number' ? Math.min(1.0, Math.max(-1.0, item.sentimentScore)) : 0.0
        }));
    }
  } catch (err) {
    // Failover silently to rule-based NER
  }

  return [];
}

/**
 * Hybrid NER Ingestion Pipeline
 * Merges high-precision gazetteer patterns with Gemini LLM context where available.
 */
export async function extractEntitiesHybrid(
  text: string,
  aiClient: GoogleGenAI | null,
  contextThemeId?: string,
  commentSentiment: SentimentType = "neutral",
  sentimentScore: number = 0.0
): Promise<RecognizedEntity[]> {
  const ruleEntities = extractEntitiesRuleBased(text, contextThemeId, commentSentiment, sentimentScore);

  if (!aiClient) {
    return ruleEntities;
  }

  try {
    const geminiEntities = await extractEntitiesWithGemini(text, aiClient, contextThemeId);
    if (!geminiEntities || geminiEntities.length === 0) {
      return ruleEntities;
    }

    const merged = new Map<string, RecognizedEntity>();

    ruleEntities.forEach(ent => {
      merged.set(normalizeArabicForNER(ent.name), ent);
    });

    geminiEntities.forEach(gEnt => {
      const norm = normalizeArabicForNER(gEnt.name);
      if (!merged.has(norm)) {
        merged.set(norm, gEnt);
      } else {
        const existing = merged.get(norm)!;
        existing.confidence = Math.max(existing.confidence, gEnt.confidence);
        if (gEnt.salience) existing.salience = gEnt.salience;
      }
    });

    return Array.from(merged.values());
  } catch (e) {
    return ruleEntities;
  }
}
