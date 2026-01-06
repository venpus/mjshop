# 개발 가이드

## 단계별 구현 전략

### ✅ 1단계: 프로젝트 초기화 및 기본 설정 (완료)

**완료된 작업:**
- Expo 프로젝트 생성
- 기본 폴더 구조 생성
- README 작성

**다음 단계:**
- package.json 의존성 추가
- TypeScript 설정 완료
- 환경 변수 설정

---

### 🔄 2단계: 기본 설정 및 의존성 설치

**목표:**
- 필요한 라이브러리 설치
- TypeScript 설정 최적화
- 기본 설정 파일 생성

**작업 내용:**
1. **package.json 업데이트**
   - React Navigation 관련 패키지
   - AsyncStorage (localStorage 대체)
   - 이미지 처리 관련 패키지

2. **의존성 설치**
   ```bash
   npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
   npm install react-native-screens react-native-safe-area-context
   npm install @react-native-async-storage/async-storage
   npm install expo-constants expo-image-picker expo-file-system
   ```

3. **TypeScript 설정**
   - tsconfig.json 경로 별칭 설정
   - 타입 정의 파일 추가

**예상 시간:** 1-2시간

---

### 📦 3단계: Types 및 Utils 포팅

**목표:**
- 웹 프로젝트의 타입 정의 복사
- 유틸리티 함수 복사 및 검증

**작업 내용:**
1. **Types 복사**
   - `client/src/types/*` → `APP/src/types/`
   - 수정 없이 그대로 복사 (재사용 가능)

2. **Utils 복사**
   - `client/src/utils/*` → `APP/src/utils/`
   - 대부분 재사용 가능하나 일부 수정 필요:
     - `dateUtils.ts`: 날짜 포맷팅 (React Native DatePicker와 호환성 확인)
     - `numberInputUtils.ts`: 숫자 입력 처리 (React Native TextInput에 맞게 수정)
     - 기타 유틸리티는 대부분 재사용 가능

**예상 시간:** 2-3시간

---

### 🌐 4단계: API 레이어 포팅

**목표:**
- 웹 프로젝트의 API 함수들을 모바일에서 사용 가능하도록 포팅

**작업 내용:**
1. **API 파일 복사**
   - `client/src/api/*.ts` → `APP/src/api/*.ts`

2. **수정 사항:**
   - `fetch` API는 React Native에서 동일하게 작동하므로 대부분 그대로 사용 가능
   - `credentials: 'include'`는 React Native에서도 동일하게 작동
   - 이미지 업로드 부분은 `FormData` 대신 `expo-file-system` 사용 고려 (필요시)
   - API_BASE_URL은 `src/config/constants.ts`에서 import

**예상 시간:** 1-2시간

---

### 🗄️ 5단계: Context 포팅 (AsyncStorage 적용)

**목표:**
- 웹의 Context API를 모바일에 맞게 포팅
- localStorage → AsyncStorage 변경

**작업 내용:**
1. **AuthContext 수정**
   - `localStorage.getItem/setItem/removeItem` → `AsyncStorage.getItem/setItem/removeItem`
   - 비동기 처리 추가 (AsyncStorage는 Promise 기반)

2. **LanguageContext**
   - localStorage → AsyncStorage로 변경
   - 언어 설정 저장/불러오기 로직 수정

**예상 시간:** 2-3시간

---

### 🧭 6단계: 네비게이션 구조 설정

**목표:**
- React Navigation 기반 네비게이션 구조 설계 및 구현

**작업 내용:**
1. **네비게이션 타입 정의**
   - RootStackParamList 정의
   - 화면별 파라미터 타입 정의

2. **네비게이션 구조**
   ```
   - AuthNavigator (로그인 전)
   - MainNavigator (로그인 후)
     - TabNavigator (하단 탭)
     - StackNavigator (화면 스택)
   ```

3. **기본 네비게이션 컴포넌트 생성**

**예상 시간:** 4-6시간

---

### 🎨 7단계: 공통 컴포넌트 개발

**목표:**
- 재사용 가능한 공통 UI 컴포넌트 생성

**작업 내용:**
1. **기본 컴포넌트**
   - Button
   - Input/TextInput
   - Modal
   - Card
   - ListItem
   - Loading Spinner
   - Error Display

2. **레이아웃 컴포넌트**
   - Container
   - ScreenWrapper
   - Header

**예상 시간:** 5-7일 (컴포넌트별로 2-4시간)

---

### 📱 8단계: 화면 개발 (MVP 우선)

**우선순위:**
1. **로그인 화면** (1일)
2. **발주 목록 화면** (3-4일)
3. **발주 상세 화면** (5-7일) - 가장 복잡
4. **패킹리스트 목록/상세** (4-5일)
5. **상품 관리** (3-4일)

**각 화면 개발 시:**
- 웹 컴포넌트를 참고하여 모바일 UX에 맞게 재작성
- API 함수는 재사용
- 비즈니스 로직은 최대한 재사용

---

## 다음 단계

현재 2단계 진행 중입니다. 다음 명령어를 실행하여 의존성을 설치하세요:

```bash
cd APP
npm install
```

그 후 3단계부터 순차적으로 진행합니다.
