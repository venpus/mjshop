# 단계별 구현 가이드

## 현재 진행 상황

### ✅ 완료된 단계

#### 1단계: 프로젝트 초기화 및 기본 설정
- ✅ Expo 프로젝트 생성
- ✅ 기본 폴더 구조 생성
- ✅ README 및 가이드 문서 작성

#### 2단계: 기본 설정 및 의존성
- ✅ package.json 의존성 추가 (React Navigation, AsyncStorage 등)
- ✅ tsconfig.json 설정 (경로 별칭 포함)
- ✅ app.json 설정 (앱 정보, 패키지명 등)
- ✅ config/constants.ts 생성 (API URL 설정)

#### 3단계: Types 및 Utils 포팅
- ✅ Types 복사 (product.ts, purchaseOrder.ts)
- ✅ Utils 복사 (dateUtils, numberInputUtils, purchaseOrderCalculations 등)

---

## 다음 단계

### 🔄 4단계: API 레이어 포팅 (진행 예정)

**작업 내용:**
1. API 파일 복사
   ```bash
   # PowerShell에서 실행
   cd APP
   Copy-Item -Path "../client/src/api/packingListApi.ts" -Destination "src/api/packingListApi.ts"
   Copy-Item -Path "../client/src/api/projectApi.ts" -Destination "src/api/projectApi.ts"
   Copy-Item -Path "../client/src/api/purchaseOrderApi.ts" -Destination "src/api/purchaseOrderApi.ts"
   ```

2. API 파일 수정 사항:
   - `API_BASE_URL` import를 `src/config/constants.ts`에서 가져오도록 변경
   - `import.meta.env` → `process.env.EXPO_PUBLIC_*` 또는 constants 파일에서 import
   - 나머지는 대부분 그대로 사용 가능 (fetch API 동일)

**예상 시간:** 1-2시간

---

### 5단계: Context 포팅 (AsyncStorage 적용)

**작업 내용:**
1. AsyncStorage 설치 확인
   ```bash
   npm install @react-native-async-storage/async-storage
   ```

2. AuthContext 수정:
   - `localStorage` → `AsyncStorage`로 변경
   - 비동기 처리 추가 (async/await)
   - API_BASE_URL을 constants에서 import

3. LanguageContext 수정:
   - `localStorage` → `AsyncStorage`로 변경

**예상 시간:** 2-3시간

---

### 6단계: 네비게이션 구조 설정

**작업 내용:**
1. React Navigation 설치 확인
2. 네비게이션 타입 정의
3. 기본 네비게이션 구조 생성
   - AuthNavigator
   - MainNavigator (TabNavigator + StackNavigator)

**예상 시간:** 4-6시간

---

### 7단계: 공통 컴포넌트 개발

**작업 내용:**
1. 기본 UI 컴포넌트
   - Button
   - Input
   - Modal
   - Card
   - Loading
   - Error

2. 레이아웃 컴포넌트
   - Container
   - ScreenWrapper
   - Header

**예상 시간:** 5-7일

---

### 8단계: 화면 개발 (MVP)

**우선순위:**
1. 로그인 화면
2. 발주 목록 화면
3. 발주 상세 화면
4. 패킹리스트 화면
5. 상품 관리 화면

---

## 실행 방법

```bash
# 의존성 설치 (아직 실행 안 했다면)
cd APP
npm install

# 개발 서버 시작
npm start

# 특정 플랫폼 실행
npm run ios      # iOS (macOS만)
npm run android  # Android
npm run web      # Web
```

## 환경 변수 설정

`.env` 파일 생성 (선택사항):
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
```

또는 `app.json`의 `extra` 필드 사용 (현재 설정됨)

## 주의사항

1. **API URL**: 개발 시 실제 서버 URL로 변경 필요
2. **네이티브 모듈**: 일부 패키지는 네이티브 빌드 필요 (`npx expo prebuild`)
3. **이미지 경로**: React Native에서는 `require()` 또는 URI 사용
4. **스타일링**: TailwindCSS 대신 StyleSheet 또는 styled-components 사용

---

## 다음 실행할 명령어

```bash
# 1. 의존성 설치 (아직 안 했다면)
cd APP
npm install

# 2. API 파일 복사 (4단계)
# PowerShell에서 실행:
Copy-Item -Path "../client/src/api/*.ts" -Destination "src/api/" -Force

# 3. 개발 서버 시작하여 기본 구조 확인
npm start
```
