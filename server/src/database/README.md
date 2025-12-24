# 데이터베이스 설정 및 사용 가이드

## 테이블 생성

관리자 계정 테이블을 생성하려면 다음 SQL 파일을 실행하세요:

```bash
mysql -u [사용자명] -p wk_megafactory < src/database/schema/admin_accounts.sql
```

또는 MySQL/MariaDB 클라이언트에서 직접 실행:

```sql
USE wk_megafactory;
SOURCE src/database/schema/admin_accounts.sql;
```

## 환경 변수 설정

`.env` 파일에 다음 환경 변수를 설정하세요:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=wkshop_user
DB_PASSWORD=your_password
DB_NAME=wk_megafactory
```

## 테이블 구조

### admin_accounts 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | VARCHAR(50) | 관리자 ID (PK) |
| name | VARCHAR(100) | 이름 |
| phone | VARCHAR(20) | 연락처 |
| email | VARCHAR(255) | 이메일 (UNIQUE) |
| password_hash | VARCHAR(255) | 비밀번호 해시 (bcrypt) |
| level | ENUM | 권한 레벨 (A-SuperAdmin, B0: 중국Admin, C0: 한국Admin) |
| is_active | BOOLEAN | 활성화 여부 |
| last_login_at | DATETIME | 마지막 로그인 시간 |
| created_at | DATETIME | 생성일시 |
| updated_at | DATETIME | 수정일시 |
| created_by | VARCHAR(50) | 생성자 ID |
| updated_by | VARCHAR(50) | 수정자 ID |

### 인덱스

- `idx_email`: 이메일 검색 최적화
- `idx_level`: 권한 레벨별 필터링 최적화
- `idx_is_active`: 활성 계정 필터링 최적화
- `idx_created_at`: 생성일시 정렬 최적화

