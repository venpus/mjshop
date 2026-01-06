# 모바일 앱 (React Native Expo)

이 프로젝트는 웹 애플리케이션의 모바일 버전입니다.

## 프로젝트 구조

```
APP/
├── src/
│   ├── api/              # API 통신 레이어 (웹의 client/src/api/ 복사)
│   ├── contexts/         # Context API (AuthContext, LanguageContext)
│   ├── utils/            # 유틸리티 함수들 (웹의 client/src/utils/ 복사)
│   ├── types/            # TypeScript 타입 정의 (웹의 client/src/types/ 복사)
│   ├── hooks/            # 커스텀 훅들 (웹의 client/src/hooks/ 복사 및 수정)
│   ├── components/       # 공통 컴포넌트
│   │   └── common/       # 재사용 가능한 공통 컴포넌트
│   ├── screens/          # 화면 컴포넌트 (웹의 components/ → screens/로 변환)
│   ├── navigation/       # 네비게이션 구조 (React Navigation)
│   └── config/           # 설정 파일들 (API URL, 환경 변수 등)
├── app.json              # Expo 설정
├── package.json          # 의존성 관리
└── tsconfig.json         # TypeScript 설정
```

## 개발 단계

### ✅ 1단계: 프로젝트 초기화 완료
- Expo 프로젝트 생성
- 기본 폴더 구조 생성

### 🔄 2단계: 기본 설정 (진행 중)
- package.json 의존성 추가
- TypeScript 설정
- Expo 설정 (app.json)

### 📋 3단계: 공통 인프라
- Types 포팅
- Utils 포팅
- API 레이어 포팅
- Context 포팅 (AsyncStorage 적용)

### 🧭 4단계: 네비게이션 구조
- React Navigation 설정
- 네비게이션 타입 정의
- 기본 네비게이션 구조

### 🎨 5단계: 공통 컴포넌트
- 기본 UI 컴포넌트 (Button, Input, Modal 등)
- 레이아웃 컴포넌트

### 📱 6단계: 화면 개발
- 로그인 화면
- 주요 기능 화면들

## 실행 방법

```bash
# 개발 서버 시작
npm start

# iOS 시뮬레이터에서 실행 (macOS만)
npm run ios

# Android 에뮬레이터에서 실행
npm run android

# 웹 브라우저에서 실행
npm run web
```

## 환경 변수

`.env` 파일을 생성하여 다음 변수를 설정하세요:

```
API_BASE_URL=http://localhost:3000/api
SERVER_BASE_URL=http://localhost:3000
```

Expo에서는 `expo-constants`를 사용하여 환경 변수에 접근합니다.
