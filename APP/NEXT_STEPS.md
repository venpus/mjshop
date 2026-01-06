# 다음 진행 단계

## ✅ 완료된 작업

### 4단계: API 레이어 포팅 (완료)
- ✅ API 파일 복사 및 수정
- ✅ constants에서 import하도록 변경

### 5단계: Context 포팅 (완료)
- ✅ AuthContext 포팅 (AsyncStorage 적용)
- ✅ LanguageContext 포팅 (AsyncStorage 적용)

### 6단계: 네비게이션 구조 설정 (완료)
- ✅ 네비게이션 타입 정의
- ✅ AuthNavigator, MainNavigator 생성
- ✅ RootNavigator 생성 (인증 상태 분기)
- ✅ App.tsx 업데이트
- ✅ 임시 화면 컴포넌트 생성

---

## 🔄 현재 진행 단계: 7단계 - 공통 컴포넌트 개발

### 작업 내용

**1. 기본 UI 컴포넌트 개발**
- Button 컴포넌트
- Input/TextInput 컴포넌트
- Modal/Dialog 컴포넌트
- Card 컴포넌트
- Loading/Spinner 컴포넌트
- Error Display 컴포넌트

**2. 레이아웃 컴포넌트**
- Container/ScreenWrapper
- Header 컴포넌트
- SafeAreaView 래퍼

**3. 스타일링**
- StyleSheet 사용 (React Native 기본)
- 공통 스타일 정의 (색상, 폰트, 간격 등)
- 또는 styled-components 사용 고려

**예상 시간:** 5-7일

---

## 📋 이후 단계

### 8단계: 화면 개발 (MVP)
- 로그인 화면 구현
- 발주 목록 화면 구현
- 발주 상세 화면 구현
- 기타 주요 화면 구현

---

## 🚀 현재 상태

**프로젝트 진행률:** 약 60%

**완료된 인프라:**
- ✅ 프로젝트 초기화 및 설정
- ✅ Types 및 Utils 포팅
- ✅ API 레이어 포팅
- ✅ Context 포팅 (AsyncStorage)
- ✅ 네비게이션 구조 설정

**다음 작업:**
- 공통 컴포넌트 개발
- 화면 개발

---

## 📝 현재 테스트 가능한 사항

1. **의존성 설치**
   ```bash
   cd APP
   npm install
   ```

2. **개발 서버 시작**
   ```bash
   npm start
   ```

3. **예상 동작**
   - 앱 시작 시 로딩 화면 표시
   - 인증되지 않은 경우 Login 화면 표시 (임시 화면)
   - 인증된 경우 Dashboard 화면 표시 (임시 화면)

---

## 💡 참고사항

### 네비게이션 사용법

네비게이션 사용 방법은 `src/navigation/README.md`를 참고하세요.

### 다음 단계 우선순위

공통 컴포넌트 개발 시 다음 순서를 권장합니다:
1. Button (가장 많이 사용)
2. Input/TextInput (폼 입력에 필수)
3. Container/Layout (화면 구조)
4. Modal (다이얼로그, 바텀시트)
5. Loading/Error (상태 표시)
6. Card (리스트 아이템)

### 스타일링 선택

- **StyleSheet** (권장): React Native 기본, 성능 우수, 타입 안정성
- **styled-components**: 웹과 유사한 방식, 하지만 추가 번들 크기

현재는 StyleSheet 사용을 권장합니다.