# 데이터베이스 마이그레이션 시스템

## 개요

서버가 시작될 때 자동으로 데이터베이스 마이그레이션이 실행됩니다. 이를 통해 데이터베이스 스키마를 버전 관리하고 자동으로 업데이트할 수 있습니다.

## 작동 방식

1. 서버 시작 시 데이터베이스 연결 확인
2. `migrations` 테이블 자동 생성 (최초 실행 시)
3. `src/database/migrations/` 디렉토리의 SQL 파일 검색
4. 아직 실행되지 않은 마이그레이션 파일들을 순차적으로 실행
5. 실행 이력을 `migrations` 테이블에 저장

## 마이그레이션 파일 구조

마이그레이션 파일은 `src/database/migrations/` 디렉토리에 저장합니다.

파일명 형식: `{순번}_{설명}.sql`

예시:
- `000_create_migrations_table.sql` - 마이그레이션 테이블 생성
- `001_create_admin_accounts.sql` - 관리자 계정 테이블 생성

## 명령어

### 자동 실행 (서버 시작 시)

```bash
npm run dev
# 또는
npm start
```

서버가 시작되면 자동으로 마이그레이션이 실행됩니다.

### 수동 실행

```bash
# 모든 미실행 마이그레이션 실행
npm run migrate

# 마이그레이션 상태 확인
npm run migrate:status
```

## 새 마이그레이션 추가 방법

1. `src/database/migrations/` 디렉토리에 새 SQL 파일 생성
2. 파일명은 다음 순번으로 지정 (예: `002_add_new_table.sql`)
3. SQL 문 작성

예시 파일: `002_create_products.sql`

```sql
-- 마이그레이션: 002_create_products
-- 설명: 제품 테이블 생성
-- 날짜: 2024-01-15

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

서버 재시작 시 자동으로 실행됩니다.

## 현재 마이그레이션 파일

- `000_create_migrations_table.sql` - 마이그레이션 이력 추적 테이블
- `001_create_admin_accounts.sql` - 관리자 계정 테이블

## 주의사항

1. **파일명 변경 금지**: 실행된 마이그레이션 파일명을 변경하면 안 됩니다
2. **순서 중요**: 파일명의 숫자 순서대로 실행됩니다
3. **트랜잭션**: 각 마이그레이션은 트랜잭션으로 실행되며, 실패 시 자동 롤백됩니다
4. **중복 실행 방지**: 이미 실행된 마이그레이션은 다시 실행되지 않습니다

## 문제 해결

### 마이그레이션이 실행되지 않는 경우

1. 데이터베이스 연결 확인
2. `.env` 파일의 DB 설정 확인
3. `npm run migrate:status`로 상태 확인
4. 마이그레이션 파일이 올바른 디렉토리에 있는지 확인

### 마이그레이션 실패 시

마이그레이션이 실패하면 자동으로 롤백됩니다. 에러 메시지를 확인하고 SQL 문을 수정한 후 다시 시도하세요.

## 프로덕션 배포 시

프로덕션 환경에서는 서버 시작 시 자동으로 마이그레이션이 실행됩니다. 별도의 마이그레이션 명령어 실행이 필요하지 않습니다.

```bash
npm run build
npm start
```

더 자세한 내용은 `src/database/MIGRATION_GUIDE.md`를 참고하세요.

