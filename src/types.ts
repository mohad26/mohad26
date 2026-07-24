/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlatformType = 'X' | 'Facebook' | 'Instagram' | 'YouTube';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export type TopicType = string;

export interface Comment {
  id: string;
  author: string;
  handle: string;
  platform: PlatformType;
  text: string;
  cleanedText: string;
  language: 'ar' | 'en';
  sentiment: SentimentType;
  sentimentScore: number; // Range: -1.0 (Very Negative) to +1.0 (Very Positive)
  topic: TopicType;
  timestamp: string; // ISO String
  likes: number;
  shares: number;
  tokens: string[];
  namedEntities: string[];
  keyPhrases: string[];
  governorate?: string;
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

