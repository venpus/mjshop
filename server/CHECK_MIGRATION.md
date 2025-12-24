# 마이그레이션 문제 해결 가이드

## 문제: admin_accounts 테이블이 생성되지 않음

### 1단계: 마이그레이션 상태 확인

서버를 시작하고 콘솔 로그를 확인하세요:

```bash
cd server
npm run dev
```

다음과 같은 로그가 표시되어야 합니다:

```
✅ 데이터베이스 연결 성공
🔄 마이그레이션 시작...
📁 마이그레이션 경로: [경로]
✅ 마이그레이션 테이블 확인 완료
📊 실행된 마이그레이션: X개
🔍 마이그레이션 디렉토리 검색: [경로]
📄 발견된 파일: ...
📋 SQL 파일 X개 발견: ...
```

### 2단계: 데이터베이스 직접 확인

MariaDB에 접속하여 다음을 확인하세요:

```sql
-- migrations 테이블 확인
USE wk_megafactory;
SELECT * FROM migrations;

-- admin_accounts 테이블 확인
SHOW TABLES LIKE 'admin_accounts';

-- 테이블이 없다면 직접 생성
DESCRIBE admin_accounts;
```

### 3단계: 마이그레이션 수동 실행

서버를 중지하고 수동으로 마이그레이션을 실행해보세요:

```bash
cd server
npm run migrate
```

### 4단계: 문제 해결 방법

#### 문제 A: 마이그레이션 파일을 찾을 수 없음

**증상**: "마이그레이션 파일 목록 조회 실패" 오류

**해결**:
1. `server/src/database/migrations/` 디렉토리에 파일이 있는지 확인
2. 파일명이 올바른 형식인지 확인 (`001_xxx.sql`)

#### 문제 B: 마이그레이션이 이미 실행되었다고 표시됨

**증상**: "실행할 마이그레이션이 없습니다" 메시지, 하지만 테이블이 없음

**해결**: migrations 테이블에서 잘못된 기록 삭제

```sql
USE wk_megafactory;
DELETE FROM migrations WHERE filename = '001_create_admin_accounts.sql';
```

그 후 서버를 다시 시작하세요.

#### 문제 C: SQL 실행 오류

**증상**: "마이그레이션 실행 실패" 오류

**해결**:
1. 오류 메시지 확인
2. SQL 문법 확인
3. 데이터베이스 권한 확인

### 5단계: 테이블 수동 생성 (긴급)

만약 마이그레이션이 계속 실패한다면, 테이블을 수동으로 생성할 수 있습니다:

```sql
USE wk_megafactory;

CREATE TABLE IF NOT EXISTS admin_accounts (
  id VARCHAR(50) PRIMARY KEY COMMENT '관리자 ID',
  name VARCHAR(100) NOT NULL COMMENT '이름',
  phone VARCHAR(20) NOT NULL COMMENT '연락처',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT '이메일',
  password_hash VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
  level ENUM('A-SuperAdmin', 'B0: 중국Admin', 'C0: 한국Admin') NOT NULL DEFAULT 'C0: 한국Admin' COMMENT '권한 레벨',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '활성화 여부',
  last_login_at DATETIME NULL COMMENT '마지막 로그인 시간',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  INDEX idx_email (email),
  INDEX idx_level (level),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 계정 테이블';

-- 마이그레이션 기록 추가 (마이그레이션 시스템이 정상 작동하도록)
INSERT IGNORE INTO migrations (filename) VALUES ('001_create_admin_accounts.sql');
```

