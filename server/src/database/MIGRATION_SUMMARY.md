# 마이그레이션 시스템 요약

## 핵심 개념

**자동 마이그레이션**: 서버 시작 시 데이터베이스 스키마 변경사항을 자동으로 적용하는 시스템

## 작동 흐름

```
서버 시작
  ↓
데이터베이스 연결 확인
  ↓
migrations 테이블 확인/생성
  ↓
migrations/ 디렉토리에서 SQL 파일 검색
  ↓
실행되지 않은 마이그레이션 필터링
  ↓
순차 실행 (트랜잭션)
  ↓
migrations 테이블에 기록
  ↓
서버 정상 시작
```

## 파일 위치

- **마이그레이션 파일**: `src/database/migrations/`
- **실행 엔진**: `src/database/migrator.ts`
- **CLI 스크립트**: `src/database/migrate.ts`
- **서버 통합**: `src/index.ts` (startServer 함수)

## 핵심 코드

### 서버 시작 시 자동 실행
```typescript
// src/index.ts
const migrator = new Migrator();
await migrator.migrate();
```

### 마이그레이션 클래스
```typescript
// src/database/migrator.ts
export class Migrator {
  async migrate() { /* 실행 로직 */ }
  async status() { /* 상태 확인 */ }
}
```

## 주요 기능

1. **자동 실행**: 서버 시작 시 자동으로 실행
2. **순차 실행**: 파일명 숫자 순서대로 실행
3. **중복 방지**: migrations 테이블로 실행 이력 관리
4. **트랜잭션**: 실패 시 자동 롤백
5. **상태 확인**: CLI로 실행 상태 확인 가능

## migrations 테이블

```sql
CREATE TABLE migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**역할**: 실행된 마이그레이션 파일명 저장하여 중복 실행 방지

## 명령어

```bash
npm run dev              # 서버 시작 (자동 마이그레이션)
npm run migrate          # 수동 마이그레이션 실행
npm run migrate:status   # 마이그레이션 상태 확인
```

## 새 마이그레이션 추가 절차

1. `src/database/migrations/` 디렉토리에 새 파일 생성
2. 파일명: `{다음순번}_{설명}.sql`
3. SQL 문 작성
4. 서버 재시작 → 자동 실행

## 주의사항

- ✅ 파일명 변경 금지 (실행된 파일)
- ✅ 순번 연속 사용 권장
- ✅ IF NOT EXISTS 사용 권장
- ❌ DROP 문 신중 사용
- ❌ 실행된 파일 삭제 금지

## 현재 마이그레이션 목록

- `000_create_migrations_table.sql` - 마이그레이션 이력 테이블
- `001_create_admin_accounts.sql` - 관리자 계정 테이블

---

**이 문서는 마이그레이션 시스템의 핵심만 담고 있습니다.**
**상세한 내용은 `MIGRATION_SYSTEM.md`를 참고하세요.**

