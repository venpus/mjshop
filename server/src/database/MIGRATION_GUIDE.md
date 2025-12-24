# 데이터베이스 마이그레이션 가이드

## 개요

서버 시작 시 자동으로 데이터베이스 마이그레이션이 실행됩니다. 마이그레이션 시스템은 SQL 파일을 순차적으로 실행하여 데이터베이스 스키마를 관리합니다.

## 마이그레이션 파일 구조

마이그레이션 파일은 `src/database/migrations/` 디렉토리에 저장되며, 다음 네이밍 규칙을 따릅니다:

```
{순번}_{설명}.sql
```

예시:
- `000_create_migrations_table.sql`
- `001_create_admin_accounts.sql`
- `002_add_index_to_products.sql`

## 자동 마이그레이션

서버가 시작될 때 자동으로 다음 작업이 수행됩니다:

1. 데이터베이스 연결 확인
2. 마이그레이션 테이블 생성 (최초 실행 시)
3. 실행되지 않은 마이그레이션 파일 검색
4. 순차적으로 마이그레이션 실행
5. 실행 이력 저장

## 수동 마이그레이션 실행

### 모든 마이그레이션 실행

```bash
npm run migrate
```

### 마이그레이션 상태 확인

```bash
npm run migrate:status
```

## 새로운 마이그레이션 추가

1. `src/database/migrations/` 디렉토리에 새 SQL 파일 생성
2. 파일명 형식: `{다음순번}_{설명}.sql`
3. SQL 문 작성 (주석 포함 가능)

예시:

```sql
-- 마이그레이션: 002_add_index_to_products
-- 설명: 제품 테이블에 인덱스 추가
-- 날짜: 2024-01-15

CREATE INDEX idx_product_name ON products(name);
CREATE INDEX idx_product_price ON products(price);
```

## 마이그레이션 규칙

### ✅ 권장 사항

- **트랜잭션 안전**: 각 마이그레이션은 자동으로 트랜잭션으로 실행됩니다
- **순차 실행**: 파일명의 숫자 순서대로 실행됩니다
- **중복 방지**: 이미 실행된 마이그레이션은 다시 실행되지 않습니다
- **롤백 안전**: 마이그레이션 실패 시 자동 롤백됩니다

### ⚠️ 주의사항

- **파일명 변경 금지**: 실행된 마이그레이션 파일명을 변경하지 마세요
- **순번 건너뛰기 지양**: 가능하면 순번을 건너뛰지 마세요
- **데이터 변경 주의**: 데이터를 변경하는 마이그레이션은 신중하게 작성하세요
- **DROP 문 주의**: `DROP TABLE`, `DROP COLUMN` 등의 명령은 매우 주의하세요

## 마이그레이션 이력 관리

실행된 마이그레이션은 `migrations` 테이블에 기록됩니다:

```sql
SELECT * FROM migrations ORDER BY executed_at;
```

## 문제 해결

### 마이그레이션이 실행되지 않는 경우

1. 데이터베이스 연결 확인
2. 마이그레이션 파일이 올바른 디렉토리에 있는지 확인
3. 파일명 형식이 올바른지 확인 (숫자_설명.sql)
4. `npm run migrate:status`로 상태 확인

### 마이그레이션 실패 시

1. 에러 메시지 확인
2. SQL 문법 확인
3. 데이터베이스 상태 확인
4. 필요 시 마이그레이션 테이블에서 실패한 마이그레이션 제거 후 재실행

## 예시: 새 테이블 추가

```sql
-- 파일: src/database/migrations/002_create_products.sql

-- 마이그레이션: 002_create_products
-- 설명: 제품 테이블 생성
-- 날짜: 2024-01-15

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

파일을 저장하면 서버 재시작 시 자동으로 실행됩니다.

