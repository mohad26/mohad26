import fs from 'fs';
import path from 'path';
import { Comment, Provenance } from '../src/types';
import { hashAuthorName } from './privacy';
import { cleanAndPreprocessLocal } from './nlp';

export interface SourceHealthStatus {
  sourceId: string;
  status: 'live' | 'degraded' | 'not_configured';
  lastSuccess: string | null;
  message?: string;
}

let youtubeQuotaUsedToday = 0;
let youtubeQuotaDay = new Date().getUTCDate();
let currentChannelIndex = 0;
let youtubeSourceStatus: SourceHealthStatus = {
  sourceId: 'youtube',
  status: 'not_configured',
  lastSuccess: null,
};

const playlistCache: Record<string, string> = {};

function checkResetQuotaDay() {
  const today = new Date().getUTCDate();
  if (today !== youtubeQuotaDay) {
    youtubeQuotaDay = today;
    youtubeQuotaUsedToday = 0;
    if (youtubeSourceStatus.status === 'degraded' && youtubeSourceStatus.message?.includes('Quota')) {
      youtubeSourceStatus.status = 'live';
    }
  }
}

export function getYouTubeStats() {
  checkResetQuotaDay();
  return {
    quotaUsed: youtubeQuotaUsedToday,
    quotaCap: 9000,
    status: youtubeSourceStatus,
  };
}

export async function processYouTubeChannelIngestion(): Promise<Comment[]> {
  checkResetQuotaDay();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    youtubeSourceStatus = {
      sourceId: 'youtube',
      status: 'not_configured',
      lastSuccess: youtubeSourceStatus.lastSuccess,
      message: 'YOUTUBE_API_KEY not configured in environment',
    };
    return [];
  }

  if (youtubeQuotaUsedToday >= 9000) {
    youtubeSourceStatus = {
      sourceId: 'youtube',
      status: 'degraded',
      lastSuccess: youtubeSourceStatus.lastSuccess,
      message: 'Daily YouTube API quota reserve reached (9,000 units)',
    };
    return [];
  }

  const configPath = path.join(process.cwd(), 'config', 'jordan_channels.json');
  if (!fs.existsSync(configPath)) {
    return [];
  }

  const channels: { name: string; handle: string; channelId: string }[] = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const validChannels = channels.filter(c => c.channelId || c.handle);

  if (validChannels.length === 0) {
    youtubeSourceStatus = {
      sourceId: 'youtube',
      status: 'not_configured',
      lastSuccess: youtubeSourceStatus.lastSuccess,
      message: 'No YouTube channels configured in jordan_channels.json',
    };
    return [];
  }

  const targetChannel = validChannels[currentChannelIndex % validChannels.length];
  currentChannelIndex = (currentChannelIndex + 1) % validChannels.length;

  let channelId = targetChannel.channelId;
  if (!channelId) {
    try {
      const handleClean = targetChannel.handle.startsWith('@') ? targetChannel.handle : `@${targetChannel.handle}`;
      const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handleClean)}&key=${apiKey}`;
      youtubeQuotaUsedToday += 1;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        channelId = data.items[0].id;
      }
    } catch (e) {
      console.warn(`Failed handle resolution for ${targetChannel.handle}:`, e);
    }
  }

  if (!channelId) {
    return [];
  }

  let uploadsPlaylistId = playlistCache[channelId];
  if (!uploadsPlaylistId) {
    if (channelId.startsWith('UC')) {
      uploadsPlaylistId = 'UU' + channelId.substring(2);
      playlistCache[channelId] = uploadsPlaylistId;
    } else {
      try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
        youtubeQuotaUsedToday += 1;
        const res = await fetch(url);
        const data = await res.json();
        uploadsPlaylistId = data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (uploadsPlaylistId) {
          playlistCache[channelId] = uploadsPlaylistId;
        }
      } catch (err) {
        console.error("Failed to fetch uploads playlist:", err);
      }
    }
  }

  if (!uploadsPlaylistId) return [];

  const comments: Comment[] = [];

  try {
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=3&key=${apiKey}`;
    youtubeQuotaUsedToday += 1;
    const plRes = await fetch(playlistUrl);
    const plData = await plRes.json();

    if (plData.error) {
      if (plData.error.code === 403 && JSON.stringify(plData.error).includes('quota')) {
        youtubeSourceStatus = {
          sourceId: 'youtube',
          status: 'degraded',
          lastSuccess: youtubeSourceStatus.lastSuccess,
          message: 'YouTube API quota exceeded for today',
        };
      }
      return [];
    }

    const videoItems = plData.items || [];
    for (const vItem of videoItems) {
      if (youtubeQuotaUsedToday >= 9000) break;

      const videoId = vItem?.snippet?.resourceId?.videoId;
      const videoTitle = vItem?.snippet?.title || targetChannel.name;
      if (!videoId) continue;

      const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=time&key=${apiKey}`;
      youtubeQuotaUsedToday += 1;

      const cRes = await fetch(commentsUrl);
      const cData = await cRes.json();

      if (cData.error) {
        if (cData.error.errors?.[0]?.reason === 'commentsDisabled') {
          continue;
        }
        if (cData.error.code === 403 && JSON.stringify(cData.error).includes('quota')) {
          youtubeSourceStatus = {
            sourceId: 'youtube',
            status: 'degraded',
            lastSuccess: youtubeSourceStatus.lastSuccess,
            message: 'YouTube API quota exceeded',
          };
          break;
        }
        continue;
      }

      const threads = cData.items || [];
      for (const thread of threads) {
        const top = thread?.snippet?.topLevelComment?.snippet;
        if (!top || !top.textOriginal) continue;

        const rawAuthor = top.authorDisplayName || 'anonymous';
        const { authorHash, displayName } = hashAuthorName(rawAuthor);
        const commentId = `yt-${thread.id}`;
        const publishedAt = top.publishedAt || new Date().toISOString();
        const likeCount = typeof top.likeCount === 'number' ? top.likeCount : 0;
        const replyCount = typeof thread.snippet?.totalReplyCount === 'number' ? thread.snippet.totalReplyCount : 0;
        const commentPermalink = `https://www.youtube.com/watch?v=${videoId}&lc=${thread.id}`;

        const nlp = cleanAndPreprocessLocal(top.textOriginal);

        const provenance: Provenance = {
          sourceId: 'youtube',
          kind: 'social_comment',
          nativeUrl: commentPermalink,
          fetchedAt: new Date().toISOString(),
          collectedLive: true,
        };

        comments.push({
          id: commentId,
          author: authorHash,
          authorHash,
          displayName,
          handle: targetChannel.handle,
          platform: 'YouTube',
          text: top.textOriginal,
          cleanedText: nlp.cleanedText,
          language: nlp.language,
          sentiment: nlp.sentiment,
          sentimentScore: nlp.score,
          topic: nlp.topic,
          timestamp: publishedAt,
          likeCount,
          replyCount,
          tokens: nlp.tokens,
          namedEntities: nlp.namedEntities,
          keyPhrases: nlp.keyPhrases,
          provenance,
          videoId,
          videoTitle,
          nlpInstrument: 'lexicon_rules',
        });
      }
    }

    youtubeSourceStatus = {
      sourceId: 'youtube',
      status: 'live',
      lastSuccess: new Date().toISOString(),
      message: `Successfully processed channel ${targetChannel.name}`,
    };
  } catch (err: any) {
    console.error(`Error processing YouTube channel ${targetChannel.name}:`, err);
    youtubeSourceStatus = {
      sourceId: 'youtube',
      status: 'degraded',
      lastSuccess: youtubeSourceStatus.lastSuccess,
      message: err.message || 'YouTube API network request failed',
    };
  }

  return comments;
}
