import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { AiWorkSummaryResult } from '../services/aiWorkSummaryService.js';

interface CacheRow extends RowDataPacket {
  result: string;
  created_at: Date;
}

/** 요약 생성 시마다 새 행 추가 (쌓아가기). 보관 정책 없음. */
export async function insertAiWorkSummaryCache(
  userId: string,
  lang: string,
  result: AiWorkSummaryResult
): Promise<void> {
  const json = JSON.stringify(result);
  await pool.execute<ResultSetHeader>(
    `INSERT INTO ai_work_summary_cache (user_id, lang, result, created_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, lang, json]
  );
}

/** 사용자·언어별 가장 최신 1건만 반환 (쌓인 데이터 중 created_at DESC LIMIT 1) */
export async function getAiWorkSummaryCache(
  userId: string,
  lang: string
): Promise<{ result: AiWorkSummaryResult; generatedAt: string } | null> {
  const [rows] = await pool.execute<CacheRow[]>(
    `SELECT result, created_at FROM ai_work_summary_cache
     WHERE user_id = ? AND lang = ?
     ORDER BY created_at DESC
     LIMIT 1`,
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
