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
