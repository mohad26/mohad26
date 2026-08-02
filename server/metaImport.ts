import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Comment, Provenance } from '../src/types';
import { databaseManager } from './db';
import { hashAuthorName } from './privacy';
import { cleanAndPreprocessLocal } from './nlp';

export interface MetaImportBatch {
  batchId: string;
  mclQueryNote: string;
  exportDate: string;
  totalRows: number;
  importedRows: number;
  duplicatesSkipped: number;
  importedAt: string;
}

const BATCHES_FILE = path.join(process.cwd(), 'data', 'meta_batches.json');

export function getMetaBatches(): MetaImportBatch[] {
  if (fs.existsSync(BATCHES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(BATCHES_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error reading meta_batches.json:', e);
    }
  }
  return [];
}

export function saveMetaBatch(batch: MetaImportBatch) {
  const batches = getMetaBatches();
  batches.unshift(batch);
  const dataDir = path.dirname(BATCHES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(BATCHES_FILE, JSON.stringify(batches, null, 2), 'utf-8');
}

export async function processMetaImport(params: {
  rawRows: Record<string, any>[];
  columnMapping: {
    textCol: string;
    authorCol?: string;
    timestampCol: string;
    likesCol?: string;
    repliesCol?: string;
    platformCol?: string;
    urlCol?: string;
  };
  exportDate: string; // User-provided export date (YYYY-MM-DD or ISO)
  mclQueryNote: string;
}): Promise<{ success: boolean; errors?: string[]; importedCount?: number; duplicatesCount?: number; batchId?: string }> {
  const { rawRows, columnMapping, exportDate, mclQueryNote } = params;

  if (!exportDate || isNaN(new Date(exportDate).getTime())) {
    return { success: false, errors: ['Export Date is required and must be a valid date (YYYY-MM-DD).'] };
  }

  if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
    return { success: false, errors: ['No data rows found in uploaded file.'] };
  }

  const errors: string[] = [];
  const validComments: Comment[] = [];
  
  // Existing comments for content hash deduplication
  const existingComments = await databaseManager.getComments();
  const existingHashes = new Set<string>();
  existingComments.forEach(c => {
    const h = crypto.createHash('sha256').update((c.text || '') + (c.timestamp || '')).digest('hex');
    existingHashes.add(h);
  });

  let lineNum = 1; // 1-indexed header, data starts line 2
  for (const row of rawRows) {
    lineNum++;
    const textVal = row[columnMapping.textCol];
    if (!textVal || typeof textVal !== 'string' || !textVal.trim()) {
      errors.push(`Line ${lineNum}: Missing or empty text content in mapped column '${columnMapping.textCol}'.`);
      continue;
    }

    const tsVal = columnMapping.timestampCol ? row[columnMapping.timestampCol] : null;
    let finalTimestamp = new Date(exportDate).toISOString();
    if (tsVal) {
      const parsedTs = new Date(tsVal);
      if (isNaN(parsedTs.getTime())) {
        errors.push(`Line ${lineNum}: Invalid date value '${tsVal}' in mapped column '${columnMapping.timestampCol}'.`);
        continue;
      }
      finalTimestamp = parsedTs.toISOString();
    }

    // Row-level content hash for deduplication
    const contentHash = crypto.createHash('sha256').update(textVal.trim() + finalTimestamp).digest('hex');
    if (existingHashes.has(contentHash)) {
      // Duplicate row found
      continue;
    }
    existingHashes.add(contentHash);

    const authorVal = columnMapping.authorCol ? row[columnMapping.authorCol] : 'meta_export_user';
    const { authorHash, displayName } = hashAuthorName(String(authorVal || 'meta_user'));

    let likeCount: number | null = null;
    if (columnMapping.likesCol && row[columnMapping.likesCol] !== undefined && row[columnMapping.likesCol] !== null && row[columnMapping.likesCol] !== '') {
      const parsedLikes = Number(row[columnMapping.likesCol]);
      if (isNaN(parsedLikes)) {
        errors.push(`Line ${lineNum}: Invalid number '${row[columnMapping.likesCol]}' for likeCount in column '${columnMapping.likesCol}'.`);
        continue;
      }
      likeCount = parsedLikes;
    }

    let replyCount: number | null = null;
    if (columnMapping.repliesCol && row[columnMapping.repliesCol] !== undefined && row[columnMapping.repliesCol] !== null && row[columnMapping.repliesCol] !== '') {
      const parsedReplies = Number(row[columnMapping.repliesCol]);
      if (isNaN(parsedReplies)) {
        errors.push(`Line ${lineNum}: Invalid number '${row[columnMapping.repliesCol]}' for replyCount in column '${columnMapping.repliesCol}'.`);
        continue;
      }
      replyCount = parsedReplies;
    }

    const platformVal = columnMapping.platformCol ? String(row[columnMapping.platformCol] || 'MetaImport') : 'MetaImport';
    const nativeUrl = columnMapping.urlCol && row[columnMapping.urlCol] ? String(row[columnMapping.urlCol]) : null;

    const nlp = cleanAndPreprocessLocal(textVal.trim());

    const provenance: Provenance = {
      sourceId: 'meta_import',
      kind: 'social_comment',
      nativeUrl,
      fetchedAt: new Date(exportDate).toISOString(), // Mapped to export date, NOT upload time
      collectedLive: false,
    };

    validComments.push({
      id: `meta-${contentHash.substring(0, 16)}`,
      author: authorHash,
      authorHash,
      displayName,
      handle: `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      platform: platformVal as any,
      text: textVal.trim(),
      cleanedText: nlp.cleanedText,
      language: nlp.language,
      sentiment: nlp.sentiment,
      sentimentScore: nlp.score,
      topic: nlp.topic,
      timestamp: finalTimestamp,
      likeCount,
      replyCount,
      tokens: nlp.tokens,
      namedEntities: nlp.namedEntities,
      keyPhrases: nlp.keyPhrases,
      provenance,
      nlpInstrument: 'lexicon_rules',
    });
  }

  // Reject file if errors exist rather than silently coercing bad rows
  if (errors.length > 0) {
    return { success: false, errors };
  }

  const batchId = `mcl-batch-${Date.now()}`;
  if (validComments.length > 0) {
    await databaseManager.bulkAddComments(validComments);
  }

  const batchRecord: MetaImportBatch = {
    batchId,
    mclQueryNote: mclQueryNote || 'Meta Content Library Export',
    exportDate,
    totalRows: rawRows.length,
    importedRows: validComments.length,
    duplicatesSkipped: rawRows.length - validComments.length,
    importedAt: new Date().toISOString(),
  };

  saveMetaBatch(batchRecord);

  return {
    success: true,
    batchId,
    importedCount: validComments.length,
    duplicatesCount: rawRows.length - validComments.length,
  };
}
