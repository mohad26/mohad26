/**
 * Type definitions and client-safe contracts for Karak Church Crisis Investigation
 * St. George Church (كنيسة القديس جورجيوس للروم الأرثوذكس) - Hammoud Village, Karak
 */

export const SOCIALCRAWL_API_KEY = "sc_HXA0EXWY5OjgAgNQX8Tuf0BgnyC8TZ1pjKkVuXNRc58";
export const SOCIALCRAWL_BASE_URL = "https://www.socialcrawl.dev/v1";

export type SupportedCrisisPlatform = 'Facebook' | 'Instagram' | 'Threads' | 'X' | 'YouTube' | 'TikTok' | 'Reddit' | 'Telegram';

export type NegativeSubCategory =
  | 'tactical_pause_inquiry'   // تساؤلات أسباب التريث في ملاحقة المنفذين وسرعة الاستجابة
  | 'schadenfreude_gloating'    // التشفي بالأردن والشهداء وتداول روايات كسر الأمان
  | 'sectarian_hate_speech'     // خطاب الكراهية الديني والعنصري والتحريض الطائفي
  | 'foreign_instigation'      // تحريض خارجي وأذرع إقليمية ومزارع بوتات
  | 'terror_outrage'            // إدانة الإرهاب والغضب الشعبي
  | 'grief_martyrs'             // الحزن والرثاء للشهداء الثمانية
  | 'rumor_busting'             // الشائعات والتشكيك الميداني
  | 'deterrence_demands'        // مطالبات بالقصاص وإجراءات الردع
  | 'general_criticism';        // استياء عام

export interface ForeignEntityDetails {
  isForeignSuspect: boolean;
  suspectedEntity?: string;
  entityType?: 'transnational_terror' | 'hostile_proxy' | 'bot_farm' | 'foreign_media' | 'regional_actor' | 'extremist_channel';
  originLocation?: string;
  botConfidenceScore?: number; // 0.0 to 1.0
  cibPattern?: string; // Coordinated Inauthentic Behavior pattern
}

export interface KarakCrisisComment {
  id: string;
  platform: SupportedCrisisPlatform;
  isMeta: boolean; // Flag if platform belongs to Meta ecosystem (Facebook, Instagram, Threads)
  author: string;
  handle: string;
  avatarUrl?: string;
  publishedAt: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1.0 to 1.0 (very negative <= -0.70)
  negativeSubCategory?: NegativeSubCategory;
  dialectType: 'colloquial' | 'standard'; // عامية محكية vs فصيح
  matchedKeywords: string[];
  matchedHashtags: string[];
  matchedDialectPhrases: string[];
  narrativeCategory: 'national_unity' | 'terror_condemnation' | 'security_tactics' | 'state_mourning' | 'citizen_grief' | 'schadenfreude' | 'sectarian_hate' | 'foreign_attribution';
  engagement: {
    likes: number;
    shares: number;
    replies: number;
  };
  postUrl: string;
  sourceContext?: string;
  verifiedCitizen?: boolean;
  foreignEntityDetails?: ForeignEntityDetails;
}

export interface TopicModelingCluster {
  id: string;
  clusterNumber: number;
  titleAr: string;
  titleEn: string;
  coherenceScore: number; // e.g. 0.94
  volumePercentage: number; // e.g. 28%
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STABILIZING';
  topKeywords: string[];
  description: string;
  intelligenceInsight: string;
  sampleQuotes: string[];
}

export interface ForeignEntityNERRecord {
  id: string;
  entityName: string;
  entityNameEn: string;
  entityType: 'transnational_terror' | 'hostile_proxy' | 'bot_farm' | 'foreign_media' | 'regional_actor';
  attributionConfidence: number; // 0 to 1.0
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  digitalOriginCountry: string;
  estimatedVolumeIntercepted: number;
  coordinatedBehaviorScore: number; // CIB score
  primaryObjective: string;
  interceptedTactics: string[];
  evidenceTextSnippet: string;
  status: 'IDENTIFIED_FLAGGED' | 'UNDER_TRACKING' | 'NEUTRALIZED_REPORTED';
}

export interface KarakCrisisTaxonomy {
  standardArabic: string[];
  hashtags: string[];
  colloquialDialect: string[];
  investigativeThemes: string[];
}

export interface KarakCrisisAnalytics {
  overview: {
    totalComments: number;
    negativeCount: number;
    positiveCount: number;
    neutralCount: number;
    negativePct: number;
    positivePct: number;
    neutralPct: number;
    colloquialPct: number;
    standardPct: number;
    schadenfreudeCount: number;
    sectarianHateCount: number;
    tacticalInquiryCount: number;
    foreignInterferenceFlaggedCount: number;
  };
  incidentCore: {
    location: string;
    subLocation: string;
    target: string;
    timing: string;
    assailants: string;
    fatalitiesCount: number;
    fatalitiesNote: string;
    stateAction: string;
    investigativeSpotlight: string;
    tacticalExplanation: string;
  };
  negativeAnalytics: {
    totalNegative: number;
    percentage: number;
    intensityScore: number;
    subCategories: Record<string, number>;
    topNegativeFocus: string;
    quotes: string[];
  };
  schadenfreudeObservatory: {
    totalDetected: number;
    botPercentage: number;
    primaryNarratives: string[];
    topAttackedThemes: string[];
    threatAssessment: string;
  };
  sectarianHateObservatory: {
    totalDetected: number;
    counterNarrativeRatio: number;
    hateSpeechIntercepted: string[];
    tribalRebuttalStrength: string;
  };
  topicModeling: {
    modelType: string;
    perplexity: number;
    coherenceAvg: number;
    clusters: TopicModelingCluster[];
  };
  foreignEntityNER: {
    totalEntitiesFlagged: number;
    crossBorderAttributionRating: 'PROVEN_COORDINATED_EFFORT' | 'HIGHLY_SUSPECTED' | 'ISOLATED';
    confidenceScore: number;
    entities: ForeignEntityNERRecord[];
  };
  metaEcosystem: {
    total: number;
    pctOfAll: number;
    label: string;
    breakdown: {
      Facebook: number;
      Instagram: number;
      Threads: number;
    };
  };
  totalPublicInteractions?: number;
  estimatedReach?: number;
  inauthenticBotSwarmCount?: number;
  tacticalPauseSatisfactionRate?: number;
  timelinePhases?: {
    phaseId: string;
    titleAr: string;
    titleEn: string;
    timeWindow: string;
    commentVolume: number;
    negativePct: number;
    dominantNarrative: string;
    keyThemes: string[];
    tacticalNote: string;
  }[];
  topHashtags: { tag: string; count: number }[];
  topDialectTerms: { term: string; count: number }[];
  platformBarData: { platform: string; count: number; negativeCount: number; isMeta: boolean }[];
  narrativeCategoryCounts: Record<string, number>;
  taxonomy: KarakCrisisTaxonomy;
  dominantTopics?: DominantTopicItem[];
  topicTimelineSeries?: TopicTimelineDataPoint[];
  extremismSeeds?: ExtremismSeedSubtopic[];
}

export interface ExtremismSeedSubtopic {
  id: string;
  seedTitleAr: string;
  seedTitleEn: string;
  ideologicalVector: 'takfir_places_of_worship' | 'anti_citizenship_subversion' | 'cloaked_terror_justification' | 'condolence_boycott_fatwa' | 'youth_recruitment_tiktoks';
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  detectedVolume: number;
  sharePct: number; // e.g. 1.4%
  originSource: {
    platform: string;
    geographicalOrigin: string;
    infrastructureType: string;
    attributionEntity: string;
    confidenceScore: number;
  };
  extremistKeywords: string[];
  ideologicalMechanism: string;
  counterNarrativeTakedown: string;
  sampleQuotes: string[];
}

export interface DominantTopicItem {
  id: string;
  rank: number;
  titleAr: string;
  titleEn: string;
  sharePct: number;
  volumeEstimated: number;
  sentimentTone: 'positive' | 'negative' | 'mixed';
  toneScore: number;
  summaryAr: string;
  summaryEn: string;
  keyPhrases: string[];
  trajectory: 'rising' | 'peaked' | 'stabilized' | 'declining';
  timelinePresence: {
    phase1: number;
    phase2: number;
    phase3: number;
    phase4: number;
    phase5: number;
  };
}

export interface TopicTimelineDataPoint {
  timeLabel: string;
  phaseId: string;
  phaseTitle: string;
  unity: number;
  martyrsGrief: number;
  tacticalPause: number;
  antiMercyFatwa: number;
  schadenfreude: number;
}
