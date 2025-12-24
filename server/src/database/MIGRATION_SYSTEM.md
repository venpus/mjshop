# 마이그레이션 시스템 구조 및 사용법

## 📋 개요

이 프로젝트는 **자동 마이그레이션 시스템**을 사용합니다. 서버가 시작될 때마다 데이터베이스 스키마 변경사항을 자동으로 적용합니다.

## 🏗️ 아키텍처

### 핵심 구성 요소

```
server/src/database/
├── migrator.ts                    # 마이그레이션 실행 엔진
├── migrate.ts                     # CLI 실행 스크립트
├── migrations/                    # 마이그레이션 SQL 파일 디렉토리
│   ├── 000_create_migrations_table.sql
│   └── 001_create_admin_accounts.sql
└── MIGRATION_SYSTEM.md            # 이 문서
```

### 작동 원리

1. **서버 시작 시 자동 실행** (`src/index.ts`)
   ```typescript
   // 서버 시작 함수에서
   const migrator = new Migrator();
   await migrator.migrate();
   ```

2. **마이그레이션 테이블 확인/생성**
   - `migrations` 테이블이 없으면 자동 생성
   - 실행된 마이그레이션 이력 저장

3. **마이그레이션 파일 검색**
   - `src/database/migrations/` 디렉토리에서 `.sql` 파일 검색
   - 파일명의 숫자 순서대로 정렬 (예: `001_`, `002_`)

4. **미실행 마이그레이션 필터링**
   - `migrations` 테이블과 비교하여 실행되지 않은 파일만 필터링

5. **순차 실행**
   - 각 마이그레이션을 트랜잭션으로 실행
   - 성공 시 이력 기록, 실패 시 롤백

## 📝 마이그레이션 파일 규칙

### 파일명 형식

```
{순번}_{설명}.sql
```

예시:
- `000_create_migrations_table.sql`
- `001_create_admin_accounts.sql`
- `002_add_products_table.sql`
- `003_add_index_to_orders.sql`

### 파일 구조

```sql
-- 마이그레이션: 002_add_products_table
-- 설명: 제품 테이블 생성
-- 날짜: 2024-01-15

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**중요 사항:**
- 주석은 `--`로 시작 (실행 시 자동 제거)
- 여러 SQL 문은 세미콜론(`;`)으로 구분
- `CREATE TABLE IF NOT EXISTS` 사용 권장 (안전성)

## 🚀 사용 방법

### 1. 자동 실행 (기본)

서버를 시작하면 자동으로 실행됩니다:

```bash
npm run dev
# 또는
npm start
```

### 2. 수동 실행

```bash
# 모든 미실행 마이그레이션 실행
npm run migrate

# 마이그레이션 상태 확인
npm run migrate:status
```

### 3. 새 마이그레이션 추가

1. `server/src/database/migrations/` 디렉토리에 새 파일 생성
2. 파일명: `{다음순번}_{설명}.sql`
3. SQL 문 작성
4. 서버 재시작 시 자동 실행

## 🔍 Migrator 클래스 상세

### 주요 메서드

#### `constructor()`
- 마이그레이션 파일 경로 설정
- `src/database/migrations/` 디렉토리 참조

#### `async migrate()`
- 마이그레이션 실행 메인 로직
- 순서: 테이블 확인 → 파일 검색 → 필터링 → 실행

#### `async status()`
- 실행된/대기 중인 마이그레이션 목록 출력

#### `private async ensureMigrationsTable()`
- `migrations` 테이블이 없으면 생성

#### `private async getExecutedMigrations()`
- 이미 실행된 마이그레이션 목록 조회

#### `private async getMigrationFiles()`
- 마이그레이션 디렉토리에서 SQL 파일 검색 및 정렬

#### `private async executeMigration()`
- 단일 마이그레이션 실행 (트랜잭션)

## 📊 migrations 테이블 구조

```sql
CREATE TABLE migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_filename (filename)
);
```

**역할:**
- 실행된 마이그레이션 파일명 저장
- 중복 실행 방지
- 실행 시간 기록

## ⚠️ 주의사항

### ✅ 권장 사항

1. **순번 관리**: 순번을 건너뛰지 말고 연속적으로 사용
2. **파일명 변경 금지**: 실행된 마이그레이션 파일명 변경 금지
3. **IF NOT EXISTS 사용**: 테이블/인덱스 생성 시 안전하게
4. **트랜잭션 고려**: 복잡한 마이그레이션은 여러 SQL 문으로 나누기

### ❌ 주의할 점

1. **DROP 문 신중 사용**: 데이터 손실 위험
2. **ALTER TABLE 주의**: 기존 데이터에 영향
3. **파일 삭제 금지**: 실행된 마이그레이션 파일은 삭제하지 말 것
4. **동시 실행 방지**: 여러 서버 인스턴스 동시 실행 시 주의

## 🐛 문제 해결

### 마이그레이션이 실행되지 않는 경우

1. 콘솔 로그 확인 (상세 로그 포함)
2. `npm run migrate:status`로 상태 확인
3. `migrations` 테이블 직접 확인:
   ```sql
   SELECT * FROM migrations ORDER BY executed_at;
   ```

### 잘못된 마이그레이션 기록 삭제

```sql
-- 특정 마이그레이션 기록 삭제 (재실행을 위해)
DELETE FROM migrations WHERE filename = '001_create_admin_accounts.sql';
```

### 테이블이 생성되지 않는 경우

1. SQL 문법 확인
2. 데이터베이스 권한 확인
3. 로그에서 오류 메시지 확인
4. 수동으로 SQL 실행하여 문제 확인

## 📚 예시: 일반적인 마이그레이션 패턴

### 테이블 생성

```sql
-- 002_create_products.sql
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 컬럼 추가

```sql
-- 003_add_category_to_products.sql
ALTER TABLE products 
ADD COLUMN category_id INT NULL,
ADD INDEX idx_category (category_id);
```

### 인덱스 추가

```sql
-- 004_add_index_to_products.sql
CREATE INDEX idx_price ON products(price);
CREATE INDEX idx_created_at ON products(created_at);
```

### 외래 키 추가

```sql
-- 005_add_foreign_key.sql
ALTER TABLE products
ADD CONSTRAINT fk_category
FOREIGN KEY (category_id) REFERENCES categories(id)
ON DELETE SET NULL;
```

## 🔄 마이그레이션 워크플로우

```
개발 → 마이그레이션 파일 작성 → 서버 시작
                                    ↓
                            자동 마이그레이션 실행
                                    ↓
                            테이블 생성/수정
                                    ↓
                            migrations 테이블에 기록
                                    ↓
                            서버 정상 시작
```

## 📖 참고 문서

- `MIGRATION_GUIDE.md`: 상세 가이드
- `README_MIGRATION.md`: 빠른 참조
- `CHECK_MIGRATION.md`: 문제 해결 가이드

---

**마지막 업데이트**: 2024-01-15
**유지보수**: 마이그레이션 파일 추가 시 이 문서도 업데이트 권장

