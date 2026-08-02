/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlatformType = 'X' | 'Facebook' | 'Instagram' | 'YouTube' | 'Reddit' | 'GDELT' | 'PetraRSS' | 'MetaImport';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export type TopicType = string;

export interface Provenance {
  sourceId: 'youtube' | 'reddit' | 'gdelt' | 'petra_rss' | 'meta_import' | 'user_input';
  kind: 'social_comment' | 'forum_post' | 'news_headline';
  nativeUrl: string | null;
  fetchedAt: string;
  collectedLive: boolean;
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
  keyPhrases: string[];
  governorate?: string;
  provenance: Provenance;
  videoId?: string;
  videoTitle?: string;
  nlpInstrument?: 'gemini_llm' | 'lexicon_rules' | 'user_input';
  sentimentConfidence?: number;
  contentSourceType?: 'social_post' | 'news_headline' | 'forum_post' | 'user_submission';
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

