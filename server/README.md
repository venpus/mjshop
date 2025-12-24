# 쇼핑몰 관리자 백엔드 서버

Express + TypeScript 기반의 RESTful API 서버입니다.

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 환경 변수

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

```bash
cp .env.example .env
```

## 프로젝트 구조

```
server/
├── src/
│   ├── index.ts          # 서버 진입점
│   ├── routes/          # API 라우트
│   ├── controllers/     # 컨트롤러
│   ├── services/        # 비즈니스 로직
│   ├── models/          # 데이터 모델
│   ├── database/        # 데이터베이스 관련
│   │   ├── migrations/  # 마이그레이션 SQL 파일
│   │   ├── migrator.ts  # 마이그레이션 엔진
│   │   └── migrate.ts   # CLI 실행 스크립트
│   ├── middleware/      # 커스텀 미들웨어
│   └── utils/           # 유틸리티 함수
├── dist/                # 빌드 출력
├── package.json
├── tsconfig.json
└── .env                 # 환경 변수 (gitignore됨)
```

## API 엔드포인트

### Health Check
- `GET /api/health` - 서버 상태 확인

### API 정보
- `GET /api` - API 정보

## 개발 가이드

### 라우트 추가

1. `src/routes/` 폴더에 새 라우트 파일 생성
2. `src/index.ts`에서 라우트 등록

예시:
```typescript
import productRoutes from './routes/products.js';
app.use('/api/products', productRoutes);
```

### 컨트롤러 추가

컨트롤러는 요청을 처리하고 응답을 반환합니다.

### 서비스 추가

비즈니스 로직은 서비스 레이어에서 처리합니다.

## 데이터베이스 마이그레이션

이 프로젝트는 **자동 마이그레이션 시스템**을 사용합니다. 서버 시작 시 데이터베이스 스키마 변경사항이 자동으로 적용됩니다.

### 빠른 시작

1. **마이그레이션 파일 생성**: `src/database/migrations/` 디렉토리에 `{순번}_{설명}.sql` 형식으로 파일 생성
2. **서버 시작**: `npm run dev` - 자동으로 마이그레이션 실행
3. **상태 확인**: `npm run migrate:status` - 마이그레이션 상태 확인

### 마이그레이션 파일 예시

```sql
-- 파일: src/database/migrations/002_create_products.sql
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 주요 특징

- ✅ 서버 시작 시 자동 실행
- ✅ 순차 실행 (파일명 숫자 순서)
- ✅ 중복 실행 방지 (migrations 테이블로 관리)
- ✅ 트랜잭션 지원 (실패 시 롤백)

**자세한 내용**: `src/database/MIGRATION_SYSTEM.md` 참고
