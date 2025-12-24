# 마이그레이션 빠른 참조 가이드

## 🚀 기본 사용법

### 새 마이그레이션 추가
```bash
# 1. 파일 생성
# 위치: server/src/database/migrations/
# 파일명: {순번}_{설명}.sql (예: 002_add_products_table.sql)

# 2. 서버 재시작 (자동 실행)
npm run dev
```

### 수동 실행
```bash
npm run migrate          # 마이그레이션 실행
npm run migrate:status   # 상태 확인
```

## 📝 파일 구조

```
server/src/database/migrations/
├── 000_create_migrations_table.sql
├── 001_create_admin_accounts.sql
└── 002_new_migration.sql  ← 새 파일 추가
```

## 🔑 핵심 규칙

1. **파일명**: `{순번}_{설명}.sql` 형식 (예: `002_add_index.sql`)
2. **순번**: 연속적으로 사용 (건너뛰지 말 것)
3. **파일명 변경 금지**: 실행된 파일명 변경 불가
4. **IF NOT EXISTS**: 안전성을 위해 사용 권장

## 📋 일반적인 패턴

### 테이블 생성
```sql
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 컬럼 추가
```sql
ALTER TABLE products ADD COLUMN price DECIMAL(10, 2) NOT NULL;
```

### 인덱스 추가
```sql
CREATE INDEX idx_name ON products(name);
```

### 외래 키 추가
```sql
ALTER TABLE products
ADD CONSTRAINT fk_category
FOREIGN KEY (category_id) REFERENCES categories(id);
```

## 🔍 문제 해결

### 마이그레이션이 실행되지 않음
```bash
# 상태 확인
npm run migrate:status

# 데이터베이스 확인
USE wk_megafactory;
SELECT * FROM migrations;
SHOW TABLES;
```

### 잘못된 기록 삭제 (재실행)
```sql
DELETE FROM migrations WHERE filename = '002_add_products.sql';
```

## 📚 자세한 문서

- **상세 가이드**: `src/database/MIGRATION_SYSTEM.md`
- **문제 해결**: `CHECK_MIGRATION.md`
- **API 문서**: `ADMIN_ACCOUNT_API.md`

