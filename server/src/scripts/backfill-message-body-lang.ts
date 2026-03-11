#!/usr/bin/env node
/**
 * product_collab_messages 테이블에서 body_lang이 NULL인 행에
 * body 원문의 한/중 비율로 body_lang('ko' | 'zh')을 채웁니다.
 *
 * 사용법 (server 디렉터리에서):
 *   npm run backfill:body-lang
 *
 * API 호출 없이 로컬에서 문자 비율만으로 판단하므로 즉시 완료됩니다.
 */

import dotenv from 'dotenv';
import { pool } from '../config/database.js';
import { detectSourceLanguage } from '../services/translationService.js';

dotenv.config();

async function main() {
  const [rows] = await pool.execute<
    { id: number; product_id: number; body: string | null }[]
  >(
    `SELECT id, product_id, body FROM product_collab_messages
     WHERE body_lang IS NULL AND body IS NOT NULL AND TRIM(COALESCE(body, '')) != ''`
  );

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const body = (row.body ?? '').trim();
    if (!body) continue;

    const lang = detectSourceLanguage(body);
    if (lang !== 'ko' && lang !== 'zh') {
      skipped++;
      continue;
    }

    await pool.execute(
      'UPDATE product_collab_messages SET body_lang = ? WHERE id = ? AND product_id = ?',
      [lang, row.id, row.product_id]
    );
    updated++;
  }

  console.log(`[backfill:body-lang] 처리: ${rows.length}건, body_lang 설정: ${updated}건, 미설정(unknown): ${skipped}건`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
