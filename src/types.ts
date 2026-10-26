/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlatformType = 'X' | 'Facebook' | 'Instagram' | 'YouTube' | 'Reddit' | 'GDELT' | 'PetraRSS' | 'MetaImport' | 'TikTok' | 'Threads' | 'LinkedIn' | 'Rumble' | 'Other';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export type TopicType = string;

export interface Provenance {
  sourceId: 'youtube' | 'reddit' | 'gdelt' | 'petra_rss' | 'meta_import' | 'user_input' | 'socialcrawl';
  kind: 'social_comment' | 'forum_post' | 'news_headline' | 'social_post';
  nativeUrl: string | null;
  fetchedAt: string;
  collectedLive: boolean;
}

export type EntityCategory = 'person' | 'organization' | 'location';

export interface RecognizedEntity {
  name: string;
  nameEn?: string;
  type: EntityCategory;
  confidence: number;
  salience?: number;
  sentiment?: SentimentType;
  sentimentScore?: number;
}

export interface Comment {
  id: string;
  author: string;
  authorHash?: string;
  displayName?: string;
  handle: string;
  platform: PlatformType;
  text: string;
  cleanedText: string;
  language: 'ar' | 'en';
  sentiment: SentimentType;
  sentimentScore: number; // Range: -1.0 to +1.0
  topic: TopicType;
  themeId?: string;
  codebookVersion?: string;
  themeConfidence?: number;
  timestamp: string; // ISO String
  likeCount: number | null;
  replyCount: number | null;
  likes?: number; // Legacy alias fallback
  shares?: number; // Legacy alias fallback
  tokens: string[];
  namedEntities: string[];
  classifiedEntities?: RecognizedEntity[];
  keyPhrases: string[];
  governorate?: string;
  provenance: Provenance;
  videoId?: string;
  videoTitle?: string;
  nlpInstrument?: 'gemini_llm' | 'lexicon_rules' | 'user_input';
  sentimentConfidence?: number;
  contentSourceType?: 'social_post' | 'news_headline' | 'forum_post' | 'user_submission';
}

export interface EntityTopicInsight {
  id: string;
  name: string;
  nameEn?: string;
  type: EntityCategory;
  totalMentions: number;
  avgSentiment: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  associatedThemes: {
    themeId: string;
    themeNameAr: string;
    themeNameEn: string;
    mentions: number;
    avgSentiment: number;
  }[];
  associatedGovernorates: {
    governorate: string;
    count: number;
  }[];
  recentQuotes: {
    id: string;
    text: string;
    author: string;
    platform: PlatformType;
    sentiment: SentimentType;
    sentimentScore: number;
    timestamp: string;
  }[];
}

export interface KPIStats {
  totalComments: number;
  averageSentiment: number; // -1.0 to 1.0
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  platformStats: {
    platform: PlatformType;
    count: number;
    avgSentiment: number;
  }[];
  topicStats: {
    topic: TopicType;
    count: number;
    avgSentiment: number;
  }[];
}

export interface DailySentimentTrend {
  date: string; // YYYY-MM-DD
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
  count: number;
}

export interface PreprocessingLog {
  step: string;
  description: string;
  output: string;
}

export interface AnalysisResponse {
  success: boolean;
  comment: Comment;
  nlpSteps: PreprocessingLog[];
}

export interface NationalEvent {
  id: string;
  date: string;
  label: string;
  title: string;
  desc: string;
  icon: string;
  sentimentEffect: SentimentType | 'neutral';
}

export interface DBTrend {
  keyword: string;
  keywordAr?: string;
  frequency: number;
  growth_rate: number;
  category: 'sports' | 'economy' | 'tourism' | 'infrastructure' | 'utilities' | 'culture';
}

export type PolicySectorId = 
  | 'cost_of_living'
  | 'public_transport'
  | 'education_employment'
  | 'healthcare'
  | 'gov_services'
  | 'energy_water'
  | 'tourism'
  | 'social_protection';

export interface PolicySectorMetric {
  id: PolicySectorId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  volume: number;
  sentiment: number; // -1.00 to +1.00
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  intensityScore: number; // 0 to 100
  trendDirection: 'rising' | 'stable' | 'declining';
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  platformBreakdown: Record<PlatformType, number>;
  topKeywords: string[];
}

export interface RisingIssueAlert {
  id: string;
  titleAr: string;
  titleEn: string;
  sectorId: PolicySectorId;
  riskLevel: 'critical' | 'high' | 'moderate';
  growthRatePct: number;
  negativePct: number;
  mentions: number;
  detectedAt: string;
  rootCauseAr: string;
  committeeRecommendationAr: string;
  sampleQuotes: string[];
}

