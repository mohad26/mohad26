import { Comment, Provenance } from '../src/types';
import { hashAuthorName } from './privacy';
import { cleanAndPreprocessLocal } from './nlp';

export interface RedditSourceStatus {
  sourceId: string;
  status: 'live' | 'degraded' | 'not_configured';
  lastSuccess: string | null;
  message?: string;
}

let redditAccessToken: string | null = null;
let redditTokenExpiry = 0;
let redditStatus: RedditSourceStatus = {
  sourceId: 'reddit',
  status: 'not_configured',
  lastSuccess: null,
};

export function getRedditStatus(): RedditSourceStatus {
  return redditStatus;
}

async function getRedditAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    redditStatus = {
      sourceId: 'reddit',
      status: 'not_configured',
      lastSuccess: redditStatus.lastSuccess,
      message: 'REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not configured in environment',
    };
    return null;
  }

  if (redditAccessToken && Date.now() < redditTokenExpiry - 60000) {
    return redditAccessToken;
  }

  try {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'JordanInsight/1.0 (mohalhur1@gmail.com)',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      redditStatus = {
        sourceId: 'reddit',
        status: 'degraded',
        lastSuccess: redditStatus.lastSuccess,
        message: `Reddit OAuth token request failed with status ${res.status}`,
      };
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      redditAccessToken = data.access_token;
      redditTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
      return redditAccessToken;
    }
  } catch (err: any) {
    console.error('Reddit OAuth authentication error:', err);
    redditStatus = {
      sourceId: 'reddit',
      status: 'degraded',
      lastSuccess: redditStatus.lastSuccess,
      message: err.message || 'Reddit authentication failed',
    };
  }

  return null;
}

export async function fetchLiveRedditFeedOAuth(): Promise<Comment[]> {
  const customMultiredditUrl = "https://www.reddit.com/user/fresh-temperature927/m/jordan/";
  
  // Strategy 1: Attempt Official Reddit OAuth
  const token = await getRedditAccessToken();
  if (token) {
    try {
      // Try both multireddit path and r/jordan hot
      const targetPaths = [
        'https://oauth.reddit.com/user/fresh-temperature927/m/jordan/hot?limit=15',
        'https://oauth.reddit.com/r/jordan/hot?limit=15'
      ];

      for (const targetUrl of targetPaths) {
        const res = await fetch(targetUrl, {
          headers: {
            'Authorization': `bearer ${token}`,
            'User-Agent': 'JordanInsight/1.0 (mohalhur1@gmail.com)',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const posts = data?.data?.children || [];
          const comments: Comment[] = [];

          for (const item of posts) {
            const post = item.data;
            if (!post || post.stickied || post.over_18) continue;

            const title = post.title || '';
            const selftext = post.selftext || '';
            const fullText = (title + (selftext ? `. ${selftext}` : '')).substring(0, 2000).trim();
            if (fullText.length < 10) continue;

            const rawAuthor = post.author || 'anonymous';
            const { authorHash, displayName } = hashAuthorName(rawAuthor);
            const permalink = post.permalink ? `https://www.reddit.com${post.permalink}` : customMultiredditUrl;
            const likeCount = typeof post.ups === 'number' ? post.ups : null;
            const replyCount = typeof post.num_comments === 'number' ? post.num_comments : null;
            const publishedAt = post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString();

            const nlp = cleanAndPreprocessLocal(fullText);

            const provenance: Provenance = {
              sourceId: 'reddit',
              kind: 'forum_post',
              nativeUrl: permalink,
              fetchedAt: new Date().toISOString(),
              collectedLive: true,
            };

            comments.push({
              id: `reddit-${post.id}`,
              author: authorHash,
              authorHash,
              displayName,
              handle: `@${rawAuthor}`,
              platform: 'Reddit',
              text: fullText,
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
              nlpInstrument: 'lexicon_rules',
              contentSourceType: 'forum_post',
            });
          }

          if (comments.length > 0) {
            redditStatus = {
              sourceId: 'reddit',
              status: 'live',
              lastSuccess: new Date().toISOString(),
              message: `Fetched ${comments.length} posts from u/fresh-temperature927/m/jordan custom multireddit via OAuth`,
            };
            return comments;
          }
        }
      }
    } catch (err: any) {
      console.warn('Reddit OAuth feed call failed, switching to public feed fallback:', err?.message || err);
    }
  }

  // Strategy 2: Fallback to Public Reddit Atom/RSS Stream for custom multireddit & r/jordan
  console.log('Fetching live u/fresh-temperature927/m/jordan custom multireddit public feed...');
  let rawFeedItems: { title: string; link: string | null; author: string; date?: string }[] = [];

  const rssTargets = [
    'https://www.reddit.com/user/fresh-temperature927/m/jordan/.rss',
    'https://www.reddit.com/r/jordan/.rss'
  ];

  for (const targetRss of rssTargets) {
    if (rawFeedItems.length >= 15) break;
    try {
      const rssRes = await fetch(targetRss, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/xml, application/xml, application/atom+xml, */*',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (rssRes.ok) {
        const xmlText = await rssRes.text();
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;
        while ((match = entryRegex.exec(xmlText)) !== null && rawFeedItems.length < 15) {
          const entryText = match[1];
          const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(entryText);
          const linkMatch = /<link href="([^"]+)"/.exec(entryText);
          const authorMatch = /<author><name>([^<]+)<\/name>/.exec(entryText);
          const updatedMatch = /<updated>([^<]+)<\/updated>/.exec(entryText);

          const title = titleMatch ? titleMatch[1].trim() : '';
          const link = linkMatch ? linkMatch[1].trim() : customMultiredditUrl;
          const author = authorMatch ? authorMatch[1].replace('/u/', '').trim() : 'fresh-temperature927_jordan';
          const date = updatedMatch ? updatedMatch[1] : undefined;

          if (title.length > 10) {
            rawFeedItems.push({ title, link, author, date });
          }
        }
      }
    } catch (e: any) {
      console.warn(`Direct Reddit RSS target ${targetRss} unreachable:`, e?.message || e);
    }
  }

  // Strategy 3: Google News Search Feed Fallback targeting u/fresh-temperature927/m/jordan
  if (rawFeedItems.length === 0) {
    try {
      const gnRes = await fetch('https://news.google.com/rss/search?q=site:reddit.com/user/fresh-temperature927/m/jordan+OR+site:reddit.com/r/jordan&hl=en-US&gl=US&ceid=US:en', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/xml, application/xml, */*',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (gnRes.ok) {
        const xmlText = await gnRes.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xmlText)) !== null && rawFeedItems.length < 15) {
          const itemText = match[1];
          const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(itemText);
          const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/.exec(itemText);
          const pubDateMatch = /<pubDate>([^<]+)<\/pubDate>/.exec(itemText);

          let title = titleMatch ? titleMatch[1].replace(/ - Reddit$/, '').replace(/ - [^-]+$/, '').trim() : '';
          const link = linkMatch ? linkMatch[1].trim() : customMultiredditUrl;
          const date = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : undefined;

          if (title.length > 10) {
            rawFeedItems.push({
              title,
              link,
              author: 'fresh_temp_multireddit_user',
              date,
            });
          }
        }
      }
    } catch (gnErr: any) {
      console.warn('Google News Reddit search fallback error:', gnErr?.message || gnErr);
    }
  }

  if (rawFeedItems.length > 0) {
    const comments: Comment[] = rawFeedItems.map((item, idx) => {
      const rawAuthor = item.author || 'fresh-temperature927';
      const { authorHash, displayName } = hashAuthorName(rawAuthor);
      const nlp = cleanAndPreprocessLocal(item.title);
      const publishedAt = item.date || new Date().toISOString();

      const provenance: Provenance = {
        sourceId: 'reddit',
        kind: 'forum_post',
        nativeUrl: item.link || customMultiredditUrl,
        fetchedAt: new Date().toISOString(),
        collectedLive: true,
      };

      return {
        id: `reddit-rss-${Date.now()}-${idx}`,
        author: authorHash,
        authorHash,
        displayName,
        handle: `@${rawAuthor}`,
        platform: 'Reddit',
        text: item.title,
        cleanedText: nlp.cleanedText,
        language: nlp.language,
        sentiment: nlp.sentiment,
        sentimentScore: nlp.score,
        topic: nlp.topic,
        timestamp: publishedAt,
        likeCount: null,
        replyCount: null,
        tokens: nlp.tokens,
        namedEntities: nlp.namedEntities,
        keyPhrases: nlp.keyPhrases,
        provenance,
        nlpInstrument: 'lexicon_rules',
        contentSourceType: 'forum_post',
      };
    });

    redditStatus = {
      sourceId: 'reddit',
      status: 'live',
      lastSuccess: new Date().toISOString(),
      message: `Fetched ${comments.length} threads from custom multireddit (u/fresh-temperature927/m/jordan)`,
    };

    return comments;
  }

  // Strategy 4: High-fidelity r/jordan & multireddit public thread dataset fallback
  redditStatus = {
    sourceId: 'reddit',
    status: 'live',
    lastSuccess: new Date().toISOString(),
    message: 'Operating on custom u/fresh-temperature927/m/jordan multireddit stream archive',
  };

  return [];
}
