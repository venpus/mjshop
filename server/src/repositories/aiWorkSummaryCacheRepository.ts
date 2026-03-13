import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { AiWorkSummaryResult } from '../services/aiWorkSummaryService.js';

interface CacheRow extends RowDataPacket {
  result: string;
  created_at: Date;
}

export async function upsertAiWorkSummaryCache(
  userId: string,
  lang: string,
  result: AiWorkSummaryResult
): Promise<void> {
  const json = JSON.stringify(result);
  await pool.execute<ResultSetHeader>(
    `INSERT INTO ai_work_summary_cache (user_id, lang, result, created_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE result = VALUES(result), created_at = CURRENT_TIMESTAMP`,
    [userId, lang, json]
  );
}

export async function getAiWorkSummaryCache(
  userId: string,
  lang: string
): Promise<{ result: AiWorkSummaryResult; generatedAt: string } | null> {
  const [rows] = await pool.execute<CacheRow[]>(
    'SELECT result, created_at FROM ai_work_summary_cache WHERE user_id = ? AND lang = ?',
    [userId, lang]
  );
  if (!rows?.length) return null;
  const row = rows[0];
  let parsed: AiWorkSummaryResult;
  try {
    parsed = typeof row.result === 'string' ? JSON.parse(row.result) : (row.result as AiWorkSummaryResult);
  } catch {
    return null;
  }
  const generatedAt =
    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  return { result: parsed, generatedAt };
}
