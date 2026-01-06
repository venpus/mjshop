# 모바일 앱 개발 재개 가이드

## 빠른 시작

### 1. 현재 상태 확인
- `CURRENT_STATUS.md` 파일을 확인하여 완료된 작업과 남은 작업 파악

### 2. 개발 환경 확인
```bash
cd APP
npm install  # 의존성 설치 (필요시)
npm start    # Expo 개발 서버 시작
```

### 3. 다음 우선순위 작업

#### 우선순위 1: 네비게이션 구조 완성
**목표**: 탭 네비게이터를 구현하여 발주 목록 화면 접근 가능하게 하기

**작업 내용**:
1. `src/navigation/MainNavigator.tsx` 수정
   - `createBottomTabNavigator` 사용
   - 각 탭별 Stack Navigator 생성
   - PurchaseOrdersScreen을 PurchaseOrdersTab에 등록

2. `src/navigation/types.ts` 확인
   - `MainTabParamList` 타입 확인
   - `AdminStackParamList` 타입 확인

**참고 파일**:
- `client/src/App.tsx` (웹 버전의 네비게이션 구조 참고)
- `APP/src/navigation/MainNavigator.tsx` (현재 구조)

#### 우선순위 2: 발주 상세 화면 구현
**목표**: 발주 목록에서 상세 화면으로 이동하여 발주 정보 확인/수정

**작업 내용**:
1. `src/screens/PurchaseOrderDetailScreen.tsx` 생성
2. 웹 버전의 `PurchaseOrderDetail.tsx` 참고하여 구현
3. 탭 네비게이션 (비용, 공장, 작업, 배송) 구현
4. API 함수 추가 (발주 상세 조회, 수정)

**참고 파일**:
- `client/src/components/PurchaseOrderDetail.tsx`
- `client/src/components/tabs/` (각 탭 컴포넌트)

## 주요 작업 흐름

### 1. 화면 구현 순서
1. 화면 파일 생성 (`src/screens/`)
2. 필요한 API 함수 추가 (`src/api/`)
3. 필요한 컴포넌트 생성 (`src/components/`)
4. 네비게이션에 등록 (`src/navigation/`)
5. 타입 정의 확인 (`src/navigation/types.ts`)

### 2. 컴포넌트 개발 순서
1. 공통 컴포넌트 우선 (`src/components/common/`)
2. 화면별 컴포넌트 필요 시 생성
3. 재사용 가능한 컴포넌트는 common으로 이동

### 3. API 함수 추가 순서
1. 웹 버전의 API 함수 확인 (`client/src/api/`)
2. React Native용으로 수정 (`APP/src/api/`)
3. AsyncStorage/환경 변수 적용
4. 타입 정의 확인

## 주의사항

### 웹과 모바일 차이점
1. **스타일링**: `className` 대신 `style` prop 사용, StyleSheet 사용
2. **네비게이션**: React Router 대신 React Navigation 사용
3. **스토리지**: localStorage 대신 AsyncStorage 사용
4. **이미지**: `img` 태그 대신 `Image` 컴포넌트 사용
5. **입력**: `input` 태그 대신 `TextInput` 컴포넌트 사용
6. **이벤트**: `onClick` 대신 `onPress` 사용

### 공통 컴포넌트 사용
- `Button`, `Input`, `Card`, `Modal` 등은 이미 구현되어 있음
- 새로운 컴포넌트는 웹 버전을 참고하되 React Native에 맞게 수정

### 네비게이션 패턴
```typescript
// 화면에서 다른 화면으로 이동
navigation.navigate('ScreenName', { param1: value1 });

// 뒤로 가기
navigation.goBack();

// Stack Navigator에서 다른 Stack의 화면으로 이동
navigation.navigate('Main', { screen: 'PurchaseOrdersTab', params: { screen: 'PurchaseOrders' } });
```

## 유용한 명령어

```bash
# Expo 개발 서버 시작
npm start

# Android 에뮬레이터에서 실행
npm run android

# iOS 시뮬레이터에서 실행 (Mac만)
npm run ios

# 웹에서 실행 (디버깅용)
npm run web

# 타입 체크
npx tsc --noEmit

# 빌드 (나중에)
expo build:android
expo build:ios
```

## 문제 해결

### 일반적인 문제
1. **의존성 오류**: `npm install` 재실행
2. **캐시 문제**: `expo start -c` (캐시 클리어)
3. **타입 오류**: `tsconfig.json` 확인, 타입 정의 확인

### 네비게이션 문제
- 타입이 맞지 않으면 `src/navigation/types.ts` 확인
- 화면이 등록되지 않으면 네비게이터에 Screen 추가 확인

### API 문제
- `src/config/constants.ts`에서 API_BASE_URL 확인
- 환경 변수 설정 확인 (`.env` 파일)

## 다음 작업 추천 순서

1. ✅ 네비게이션 구조 완성 (탭 네비게이터)
2. ✅ 발주 상세 화면 기본 구조
3. ✅ 발주 상세 화면 - 비용 탭
4. ✅ 발주 상세 화면 - 나머지 탭들
5. ✅ 대시보드 화면
6. ✅ 패킹리스트 화면
7. ✅ 기타 화면들

---

**재개 시 이 문서를 먼저 확인하세요!**

