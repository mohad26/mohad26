import crypto from 'crypto';

export function hashAuthorName(rawAuthor: string): { authorHash: string; displayName: string } {
  const salt = process.env.AUTHOR_SALT || 'default_jordan_research_salt_2026';
  const cleanRaw = (rawAuthor || 'anonymous').trim();
  const hash = crypto.createHash('sha256').update(cleanRaw + salt).digest('hex');
  const shortHash = hash.substring(0, 6);
  return {
    authorHash: hash,
    displayName: `User #${shortHash}`
  };
}
