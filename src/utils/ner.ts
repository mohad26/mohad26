/**
 * Universal Named Entity Recognition (NER) and Topic Correlation Utilities.
 * Operates isomorphic in both frontend and backend for high precision entity extraction.
 */

import { RecognizedEntity, EntityCategory, EntityTopicInsight, Comment, SentimentType, PlatformType } from "../types";
import { POLICY_SECTOR_IDS, POLICY_SECTORS_META } from "./analytics";

export const ENTITY_TYPE_LABELS: Record<EntityCategory, { ar: string; en: string; color: string; badgeBg: string }> = {
  person: {
    ar: "شخصية عامة",
    en: "Public Figure / Person",
    color: "text-amber-400",
    badgeBg: "bg-amber-950/40 border-amber-800/40 text-amber-300"
  },
  organization: {
    ar: "مؤسسة / وزارة",
    en: "Organization / Ministry",
    color: "text-cyan-400",
    badgeBg: "bg-cyan-950/40 border-cyan-800/40 text-cyan-300"
  },
  location: {
    ar: "موقع جغرافي",
    en: "Geographic Location",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-950/40 border-emerald-800/40 text-emerald-300"
  }
};

export interface GazetteerEntry {
  canonicalAr: string;
  canonicalEn: string;
  type: EntityCategory;
  aliases: string[];
  primarySectorId?: string;
}

// Comprehensive Jordanian Entity Knowledge Base
export const JORDAN_ENTITIES_GAZETTEER: GazetteerEntry[] = [
  // -------------------------------------------------------------
  // 1. LOCATIONS (Jordanian Governorates, Cities, Sites, Landmarks)
  // -------------------------------------------------------------
  {
    canonicalAr: "عمان",
    canonicalEn: "Amman",
    type: "location",
    aliases: ["عمّان", "عمان", "amman", "العاصمة", "capital", "عمان الغربية", "عمان الشرقية"],
    primarySectorId: "gov_services"
  },
  {
    canonicalAr: "الزرقاء",
    canonicalEn: "Zarqa",
    type: "location",
    aliases: ["الزرقاء", "زرقاء", "zarqa", "مدينة الزرقاء"],
    primarySectorId: "public_transport"
  },
  {
    canonicalAr: "إربد",
    canonicalEn: "Irbid",
    type: "location",
    aliases: ["إربد", "اربد", "irbid", "عروس الشمال"],
    primarySectorId: "education_employment"
  },
  {
    canonicalAr: "العقبة",
    canonicalEn: "Aqaba",
    type: "location",
    aliases: ["العقبة", "عقبة", "aqaba", "ثغر الأردن الباسم"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "البترا",
    canonicalEn: "Petra",
    type: "location",
    aliases: ["البترا", "البتراء", "petra", "المدينة الوردية", "وادي موسى"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "وادي رم",
    canonicalEn: "Wadi Rum",
    type: "location",
    aliases: ["وادي رم", "وادي القمر", "wadi rum", "rum"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "عجلون",
    canonicalEn: "Ajloun",
    type: "location",
    aliases: ["عجلون", "ajloun", "قلعة عجلون", "تلفريك عجلون", "غابات عجلون"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "جرش",
    canonicalEn: "Jerash",
    type: "location",
    aliases: ["جرش", "jerash", "آثار جرش", "مدينة الألف عمود", "مهرجان جرش"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "البلقاء",
    canonicalEn: "Balqa",
    type: "location",
    aliases: ["البلقاء", "بلقاء", "balqa", "السلط", "salt", "الفحيص", "ماحص"],
    primarySectorId: "agriculture"
  },
  {
    canonicalAr: "الكرك",
    canonicalEn: "Karak",
    type: "location",
    aliases: ["الكرك", "كرك", "karak", "قلعة الكرك"],
    primarySectorId: "cost_of_living"
  },
  {
    canonicalAr: "المفرق",
    canonicalEn: "Mafraq",
    type: "location",
    aliases: ["المفرق", "مفرق", "mafraq", "البادية الشمالية", "الرويشد"],
    primarySectorId: "energy_water"
  },
  {
    canonicalAr: "مادبا",
    canonicalEn: "Madaba",
    type: "location",
    aliases: ["مادبا", "madaba", "مدينة الفسيفساء", "جبل نيبو"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "الطفيلة",
    canonicalEn: "Tafilah",
    type: "location",
    aliases: ["الطفيلة", "طفيلة", "tafilah", "محمية ضانا", "ضانا"],
    primarySectorId: "energy_water"
  },
  {
    canonicalAr: "معان",
    canonicalEn: "Ma'an",
    type: "location",
    aliases: ["معان", "maan", "ma'an", "الشوبك", "البتراء"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "صويلح",
    canonicalEn: "Sweileh",
    type: "location",
    aliases: ["صويلح", "sweileh", "مجمع صويلح", "دوار صويلح"],
    primarySectorId: "public_transport"
  },
  {
    canonicalAr: "عبدون",
    canonicalEn: "Abdoun",
    type: "location",
    aliases: ["عبدون", "abdoun", "جسر عبدون", "دوار عبدون"],
    primarySectorId: "cost_of_living"
  },
  {
    canonicalAr: "البحر الميت",
    canonicalEn: "Dead Sea",
    type: "location",
    aliases: ["البحر الميت", "dead sea", "شاطئ عمان السياحي", "أخفض بقعة"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "الرصيفة",
    canonicalEn: "Russeifa",
    type: "location",
    aliases: ["الرصيفة", "رصيفة", "russeifa", "ياجوز"],
    primarySectorId: "public_transport"
  },
  {
    canonicalAr: "الأغوار",
    canonicalEn: "Jordan Valley (Ghor)",
    type: "location",
    aliases: ["الأغوار", "الاغوار", "غور الأردن", "دير علا", "الشونة", "سلة الأردن الغذائية"],
    primarySectorId: "energy_water"
  },

  // -------------------------------------------------------------
  // 2. ORGANIZATIONS (Ministries, Authorities, Funds, Enterprises, Clubs)
  // -------------------------------------------------------------
  {
    canonicalAr: "وزارة المياه والري",
    canonicalEn: "Ministry of Water & Irrigation",
    type: "organization",
    aliases: ["وزارة المياه والري", "وزارة المياه", "سلطة المياه", "سلطة وادي الأردن", "شركة مياهنا", "مياهنا", "مياه اليرموك", "water authority", "miyahuna"],
    primarySectorId: "energy_water"
  },
  {
    canonicalAr: "أمانة عمان الكبرى",
    canonicalEn: "Greater Amman Municipality",
    type: "organization",
    aliases: ["أمانة عمان الكبرى", "أمانة عمان", "امانة عمان", "gam", "amman municipality", "باص عمان"],
    primarySectorId: "gov_services"
  },
  {
    canonicalAr: "المؤسسة العامة للضمان الاجتماعي",
    canonicalEn: "Social Security Corporation (SSC)",
    type: "organization",
    aliases: ["المؤسسة العامة للضمان الاجتماعي", "الضمان الاجتماعي", "الضمان", "ssc", "social security"],
    primarySectorId: "social_protection"
  },
  {
    canonicalAr: "صندوق المعونة الوطنية",
    canonicalEn: "National Aid Fund (NAF)",
    type: "organization",
    aliases: ["صندوق المعونة الوطنية", "صندوق المعونة", "تكافل", "برنامج تكافل", "naf", "national aid fund"],
    primarySectorId: "social_protection"
  },
  {
    canonicalAr: "منصة سند الحكومية",
    canonicalEn: "Sanad Gov Portal",
    type: "organization",
    aliases: ["منصة سند", "سند", "تطبيق سند", "sanad", "sanad app", "sanad portal"],
    primarySectorId: "gov_services"
  },
  {
    canonicalAr: "وزارة الصحة",
    canonicalEn: "Ministry of Health",
    type: "organization",
    aliases: ["وزارة الصحة", "الصحة", "moh", "ministry of health", "مستشفى البشير", "مستشفى الأمير حمزة", "مركز الحسين للسرطان"],
    primarySectorId: "healthcare"
  },
  {
    canonicalAr: "وزارة التربية والتعليم",
    canonicalEn: "Ministry of Education",
    type: "organization",
    aliases: ["وزارة التربية والتعليم", "وزارة التربية", "التربية والتعليم", "توجيهي", "امتحان التوجيهي", "tawjihi"],
    primarySectorId: "education_employment"
  },
  {
    canonicalAr: "وزارة النقل",
    canonicalEn: "Ministry of Transport",
    type: "organization",
    aliases: ["وزارة النقل", "هيئة تنظيم النقل البري", "هيئة النقل", "ltrc"],
    primarySectorId: "public_transport"
  },
  {
    canonicalAr: "الباص سريع التردد",
    canonicalEn: "Bus Rapid Transit (BRT)",
    type: "organization",
    aliases: ["الباص سريع التردد", "الباص السريع", "باص عمان", "brt", "amman brt"],
    primarySectorId: "public_transport"
  },
  {
    canonicalAr: "وزارة الاقتصاد الرقمي والريادة",
    canonicalEn: "Ministry of Digital Economy & Entrepreneurship",
    type: "organization",
    aliases: ["وزارة الاقتصاد الرقمي والريادة", "وزارة الاقتصاد الرقمي", "modee"],
    primarySectorId: "gov_services"
  },
  {
    canonicalAr: "وزارة الطاقة والثروة المعدنية",
    canonicalEn: "Ministry of Energy & Mineral Resources",
    type: "organization",
    aliases: ["وزارة الطاقة والثروة المعدنية", "وزارة الطاقة", "شركة الكهرباء الوطنية", "شركة الكهرباء الأردنية", "نيبكو", "memr"],
    primarySectorId: "energy_water"
  },
  {
    canonicalAr: "وزارة السياحة والآثار",
    canonicalEn: "Ministry of Tourism & Antiquities",
    type: "organization",
    aliases: ["وزارة السياحة والآثار", "وزارة السياحة", "هيئة تنشيط السياحة", "سلطة إقليم البترا", "mota", "jordan tourism board"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "سلطة منطقة العقبة الاقتصادية الخاصة",
    canonicalEn: "Aqaba Special Economic Zone (ASEZA)",
    type: "organization",
    aliases: ["سلطة منطقة العقبة", "سلطة العقبة", "aseza", "مفوضية العقبة"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "وزارة الصناعة والتجارة والتموين",
    canonicalEn: "Ministry of Industry & Trade",
    type: "organization",
    aliases: ["وزارة الصناعة والتجارة والتموين", "وزارة الصناعة والتجارة", "الصناعة والتجارة", "الرقابة التموينية", "السقوف السعرية"],
    primarySectorId: "cost_of_living"
  },
  {
    canonicalAr: "البنك المركزي الأردني",
    canonicalEn: "Central Bank of Jordan (CBJ)",
    type: "organization",
    aliases: ["البنك المركزي الأردني", "البنك المركزي", "cbj", "central bank of jordan", "سعر الفائدة"],
    primarySectorId: "cost_of_living"
  },
  {
    canonicalAr: "هيئة الخدمة والإدارة العامة",
    canonicalEn: "Civil Service & Public Administration Commission",
    type: "organization",
    aliases: ["هيئة الخدمة والإدارة العامة", "ديوان الخدمة المدنية", "ديوان الخدمة", "مخزون التوظيف", "csb"],
    primarySectorId: "education_employment"
  },
  {
    canonicalAr: "منتخب النشامى",
    canonicalEn: "Jordan National Football Team (Al-Nashama)",
    type: "organization",
    aliases: ["منتخب النشامى", "النشامى", "المنتخب الأردني", "الاتحاد الأردني لكرة القدم", "jfa", "nashama"],
    primarySectorId: "sports"
  },
  {
    canonicalAr: "الملكية الأردنية",
    canonicalEn: "Royal Jordanian (RJ)",
    type: "organization",
    aliases: ["الملكية الأردنية", "الملكية", "royal jordanian", "rj"],
    primarySectorId: "tourism"
  },
  {
    canonicalAr: "المجلس الاقتصادي والاجتماعي",
    canonicalEn: "Economic & Social Council of Jordan",
    type: "organization",
    aliases: ["المجلس الاقتصادي والاجتماعي", "لجنة السياسات الاجتماعية", "esc jordan", "economic and social council"],
    primarySectorId: "gov_services"
  },

  // -------------------------------------------------------------
  // 3. PEOPLE (Public Figures, State Officials, Sports/Cultural Icons)
  // -------------------------------------------------------------
  {
    canonicalAr: "الملك عبدالله الثاني",
    canonicalEn: "King Abdullah II",
    type: "person",
    aliases: ["الملك عبدالله الثاني", "الملك عبدالله", "جلالة الملك", "الملك", "سيدنا", "king abdullah", "king abdullah ii"],
    primarySectorId: "gov_services"
  },
  {
    canonicalAr: "الأمير الحسين بن عبدالله",
    canonicalEn: "Crown Prince Hussein",
    type: "person",
    aliases: ["الأمير الحسين بن عبدالله", "الأمير الحسين", "ولي العهد", "سمو ولي العهد", "crown prince hussein", "al hussein"],
    primarySectorId: "education_employment"
  },
  {
    canonicalAr: "الملكة رانيا العبدالله",
    canonicalEn: "Queen Rania",
    type: "person",
    aliases: ["الملكة رانيا العبدالله", "الملكة رانيا", "جلالة الملكة", "queen rania"],
    primarySectorId: "education_employment"
  },
  {
    canonicalAr: "جعفر حسان",
    canonicalEn: "Jafar Hassan (Prime Minister)",
    type: "person",
    aliases: ["جعفر حسان", "د. جعفر حسان", "رئيس الوزراء جعفر حسان", "دولة الرئيس", "jafar hassan"],
    primarySectorId: "gov_services"
  },
  {
    canonicalAr: "بشر الخصاونة",
    canonicalEn: "Bisher Al-Khasawneh",
    type: "person",
    aliases: ["بشر الخصاونة", "د. بشر الخصاونة", "الخصاونة", "bisher khasawneh", "al-khasawneh"],
    primarySectorId: "gov_services"
  },
  {
    canonicalAr: "يوسف الشواربة",
    canonicalEn: "Yousef Al-Shawarbeh (Mayor of Amman)",
    type: "person",
    aliases: ["يوسف الشواربة", "د. يوسف الشواربة", "أمين عمان", "الشواربة", "shawarbeh"],
    primarySectorId: "public_transport"
  },
  {
    canonicalAr: "فراس الهواري",
    canonicalEn: "Firas Al-Hawari (Health Minister)",
    type: "person",
    aliases: ["فراس الهواري", "د. فراس الهواري", "وزير الصحة", "الهواري", "firas hawari"],
    primarySectorId: "healthcare"
  },
  {
    canonicalAr: "رائد أبو السعود",
    canonicalEn: "Raed Abu Al-Saud (Water Minister)",
    type: "person",
    aliases: ["رائد أبو السعود", "المهندس رائد أبو السعود", "وزير المياه", "أبو السعود"],
    primarySectorId: "energy_water"
  },
  {
    canonicalAr: "أحمد الهناندة",
    canonicalEn: "Ahmad Hanandeh (Digital Economy Minister)",
    type: "person",
    aliases: ["أحمد الهناندة", "الهناندة", "وزير الاقتصاد الرقمي", "hanandeh"],
    primarySectorId: "gov_services"
  },
  {
    canonicalAr: "موسى التعمري",
    canonicalEn: "Mousa Al-Tamari",
    type: "person",
    aliases: ["موسى التعمري", "التعمري", "mousa al-tamari", "tamari"],
    primarySectorId: "sports"
  },
  {
    canonicalAr: "يزن النعيمات",
    canonicalEn: "Yazan Al-Naimat",
    type: "person",
    aliases: ["يزن النعيمات", "النعيمات", "yazan naimat", "naimat"],
    primarySectorId: "sports"
  },
  {
    canonicalAr: "الحسين عموتة",
    canonicalEn: "Hussein Ammouta",
    type: "person",
    aliases: ["الحسين عموتة", "عموتة", "المدرب عموتة", "ammouta"],
    primarySectorId: "sports"
  }
];

export function normalizeArabicForNER(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F]/g, "") // Tashkeel
    .replace(/[أإآ]/g, "ا")           // Hamza unification
    .replace(/ى/g, "ي")               // Alef Maksura to Yeh
    .replace(/ة/g, "ه")               // Teh Marbuta to Heh
    .replace(/ـ/g, "")                // Tatweel
    .toLowerCase();
}

export function extractEntitiesRuleBased(
  rawText: string,
  contextThemeId?: string,
  commentSentiment: SentimentType = "neutral",
  sentimentScore: number = 0.0
): RecognizedEntity[] {
  if (!rawText || typeof rawText !== "string") return [];

  const normalizedInput = normalizeArabicForNER(rawText);
  const lowerInput = rawText.toLowerCase();
  const matchedEntities: Map<string, RecognizedEntity> = new Map();

  for (const entry of JORDAN_ENTITIES_GAZETTEER) {
    let matched = false;
    let matchConfidence = 0.90;

    for (const alias of entry.aliases) {
      const normAlias = normalizeArabicForNER(alias);
      
      if (alias.includes(" ")) {
        if (normalizedInput.includes(normAlias) || lowerInput.includes(alias.toLowerCase())) {
          matched = true;
          matchConfidence = 0.96;
          break;
        }
      } else {
        const escaped = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(?:^|[\\s،,\\.!؟?\"'(\\[])(?:[وفبلك]*ال)?${escaped}(?=[\\s،,\\.!؟?\"')\\]]|$)`, 'i');
        if (pattern.test(normalizedInput) || new RegExp(`\\b${escaped}\\b`, 'i').test(lowerInput)) {
          matched = true;
          matchConfidence = 0.92;
          break;
        }
      }
    }

    if (matched) {
      let localSentiment = commentSentiment;
      let localScore = sentimentScore;

      const occurrences = (normalizedInput.match(new RegExp(normalizeArabicForNER(entry.canonicalAr), 'g')) || []).length;
      const salience = Math.min(1.0, 0.4 + (occurrences * 0.2));

      matchedEntities.set(entry.canonicalAr, {
        name: entry.canonicalAr,
        nameEn: entry.canonicalEn,
        type: entry.type,
        confidence: matchConfidence,
        salience: Number(salience.toFixed(2)),
        sentiment: localSentiment,
        sentimentScore: Number(localScore.toFixed(2))
      });
    }
  }

  if (!Array.from(matchedEntities.values()).some(e => e.type === "location")) {
    if (normalizedInput.includes("اردن") || normalizedInput.includes("نشامى") || lowerInput.includes("jordan")) {
      matchedEntities.set("المملكة الأردنية", {
        name: "المملكة الأردنية",
        nameEn: "Hashemite Kingdom of Jordan",
        type: "location",
        confidence: 0.88,
        salience: 0.5,
        sentiment: commentSentiment,
        sentimentScore: sentimentScore
      });
    }
  }

  return Array.from(matchedEntities.values());
}

export function compileEntityTopicInsights(comments: Comment[]): EntityTopicInsight[] {
  if (!comments || comments.length === 0) return [];

  const entityMap: Map<string, {
    canonicalName: string;
    nameEn?: string;
    type: EntityCategory;
    mentions: number;
    scoreSum: number;
    posCount: number;
    neuCount: number;
    negCount: number;
    themes: Map<string, { mentions: number; scoreSum: number }>;
    governorates: Map<string, number>;
    quotes: {
      id: string;
      text: string;
      author: string;
      platform: PlatformType;
      sentiment: SentimentType;
      sentimentScore: number;
      timestamp: string;
    }[];
  }> = new Map();

  comments.forEach(comment => {
    let entities = comment.classifiedEntities;
    if (!entities || entities.length === 0) {
      entities = extractEntitiesRuleBased(
        comment.text, 
        comment.themeId, 
        comment.sentiment, 
        comment.sentimentScore
      );
    }

    const themeId = comment.themeId || "cost_of_living";
    const gov = comment.governorate || "Amman";

    entities.forEach(ent => {
      const key = ent.name.trim();
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          canonicalName: ent.name,
          nameEn: ent.nameEn,
          type: ent.type,
          mentions: 0,
          scoreSum: 0,
          posCount: 0,
          neuCount: 0,
          negCount: 0,
          themes: new Map(),
          governorates: new Map(),
          quotes: []
        });
      }

      const record = entityMap.get(key)!;
      record.mentions += 1;
      const score = ent.sentimentScore ?? comment.sentimentScore;
      record.scoreSum += score;

      const sent = ent.sentiment || comment.sentiment;
      if (sent === "positive") record.posCount++;
      else if (sent === "negative") record.negCount++;
      else record.neuCount++;

      if (!record.themes.has(themeId)) {
        record.themes.set(themeId, { mentions: 0, scoreSum: 0 });
      }
      const tRec = record.themes.get(themeId)!;
      tRec.mentions += 1;
      tRec.scoreSum += score;

      record.governorates.set(gov, (record.governorates.get(gov) || 0) + 1);

      if (record.quotes.length < 4 && comment.text && comment.text.length > 20) {
        record.quotes.push({
          id: comment.id,
          text: comment.text.slice(0, 240),
          author: comment.author,
          platform: comment.platform,
          sentiment: comment.sentiment,
          sentimentScore: comment.sentimentScore,
          timestamp: comment.timestamp
        });
      }
    });
  });

  const results: EntityTopicInsight[] = [];

  entityMap.forEach((val, name) => {
    const total = val.mentions;
    const avgSentiment = Number((val.scoreSum / total).toFixed(2));
    const positivePct = Math.round((val.posCount / total) * 100);
    const negativePct = Math.round((val.negCount / total) * 100);
    const neutralPct = Math.max(0, 100 - positivePct - negativePct);

    const associatedThemes = Array.from(val.themes.entries())
      .map(([tId, tData]) => {
        const meta = POLICY_SECTORS_META[tId as keyof typeof POLICY_SECTORS_META];
        return {
          themeId: tId,
          themeNameAr: meta ? meta.nameAr : tId,
          themeNameEn: meta ? meta.nameEn : tId,
          mentions: tData.mentions,
          avgSentiment: Number((tData.scoreSum / tData.mentions).toFixed(2))
        };
      })
      .sort((a, b) => b.mentions - a.mentions);

    const associatedGovernorates = Array.from(val.governorates.entries())
      .map(([governorate, count]) => ({ governorate, count }))
      .sort((a, b) => b.count - a.count);

    results.push({
      id: `ner-${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}`,
      name: val.canonicalName,
      nameEn: val.nameEn,
      type: val.type,
      totalMentions: total,
      avgSentiment,
      positiveCount: val.posCount,
      neutralCount: val.neuCount,
      negativeCount: val.negCount,
      positivePct,
      neutralPct,
      negativePct,
      associatedThemes,
      associatedGovernorates,
      recentQuotes: val.quotes
    });
  });

  return results.sort((a, b) => b.totalMentions - a.totalMentions);
}

export function filterEntityInsights(
  entities: EntityTopicInsight[],
  query: string,
  selectedType: EntityCategory | "all",
  selectedSector: string | "all",
  sentimentFilter: "all" | "positive" | "negative" | "neutral" = "all"
): EntityTopicInsight[] {
  return entities.filter(ent => {
    if (selectedType !== "all" && ent.type !== selectedType) {
      return false;
    }

    if (selectedSector !== "all") {
      const hasTheme = ent.associatedThemes.some(t => t.themeId === selectedSector);
      if (!hasTheme) return false;
    }

    if (sentimentFilter === "positive" && ent.avgSentiment <= 0.15) return false;
    if (sentimentFilter === "negative" && ent.avgSentiment >= -0.15) return false;
    if (sentimentFilter === "neutral" && (ent.avgSentiment > 0.15 || ent.avgSentiment < -0.15)) return false;

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      const matchName = ent.name.toLowerCase().includes(q);
      const matchEn = ent.nameEn?.toLowerCase().includes(q);
      const matchTheme = ent.associatedThemes.some(t => 
        t.themeNameAr.toLowerCase().includes(q) || t.themeNameEn.toLowerCase().includes(q)
      );
      if (!matchName && !matchEn && !matchTheme) return false;
    }

    return true;
  });
}
