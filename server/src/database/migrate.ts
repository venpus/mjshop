#!/usr/bin/env node
/**
 * 마이그레이션 실행 스크립트
 * 
 * 사용법:
 *   npm run migrate         - 마이그레이션 실행
 *   npm run migrate:status  - 마이그레이션 상태 확인
 */

import { Migrator } from './migrator.js';

async function main() {
  const command = process.argv[2];
  const migrator = new Migrator();

  try {
    if (command === 'status') {
      await migrator.status();
    } else {
      await migrator.migrate();
    }
    process.exit(0);
  } catch (error) {
    console.error('마이그레이션 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

main();

