# 6단계 완료: 네비게이션 구조 설정

## ✅ 완료된 작업

1. **네비게이션 타입 정의**
   - ✅ `src/navigation/types.ts` 생성
   - ✅ `RootStackParamList` 타입 정의
   - ✅ 모든 화면의 파라미터 타입 정의

2. **네비게이션 컴포넌트 생성**
   - ✅ `src/navigation/index.tsx` - 루트 네비게이션 (인증 상태 분기)
   - ✅ `src/navigation/AuthNavigator.tsx` - 인증 전 네비게이션
   - ✅ `src/navigation/MainNavigator.tsx` - 인증 후 메인 네비게이션

3. **임시 화면 컴포넌트 생성**
   - ✅ `src/screens/LoginScreen.tsx` - 로그인 화면 (임시)
   - ✅ `src/screens/DashboardScreen.tsx` - 대시보드 화면 (임시)

4. **App.tsx 업데이트**
   - ✅ AuthProvider, LanguageProvider 적용
   - ✅ RootNavigator 적용
   - ✅ StatusBar 설정

5. **로딩 화면 추가**
   - ✅ 인증 상태 로딩 중 표시

## 📝 주요 구조

### 네비게이션 계층 구조

```
RootNavigator (인증 상태 분기)
├── AuthNavigator (로그인 전)
│   └── Login Screen
└── MainNavigator (로그인 후)
    └── Dashboard Screen (기본 화면)
    └── ... (추가 화면들)
```

### 타입 정의

**RootStackParamList**에 다음 화면들이 정의되어 있습니다:
- Login, Signup (인증)
- Dashboard (대시보드)
- PurchaseOrders, PurchaseOrderDetail (발주 관리)
- Products (상품 관리)
- PackingList (패킹리스트)
- Projects, ProjectDetail (프로젝트)
- Materials, MaterialDetail (재료)
- AdminAccount (관리자 계정)

### 주요 변경사항

**웹 (React Router) → 모바일 (React Navigation):**

1. **라우팅 방식**
   ```typescript
   // 웹
   <Routes>
     <Route path="/login" element={<Login />} />
   </Routes>
   
   // 모바일
   <Stack.Navigator>
     <Stack.Screen name="Login" component={LoginScreen} />
   </Stack.Navigator>
   ```

2. **네비게이션 함수**
   ```typescript
   // 웹
   navigate('/purchase-orders');
   
   // 모바일
   navigation.navigate('PurchaseOrders');
   ```

3. **파라미터 전달**
   ```typescript
   // 웹
   navigate(`/purchase-orders/${id}?tab=cost`);
   
   // 모바일
   navigation.navigate('PurchaseOrderDetail', {
     id: 'PO-001',
     tab: 'cost',
   });
   ```

## ✅ 검증 완료

- NavigationContainer 적용
- 인증 상태에 따른 네비게이션 분기
- 타입 안정성 확보
- 임시 화면으로 기본 흐름 확인 가능

## 다음 단계

**7단계: 공통 컴포넌트 개발**
- Button, Input, Modal 등 기본 컴포넌트
- 레이아웃 컴포넌트
- 스타일링 (StyleSheet 또는 styled-components)

**8단계: 화면 개발 (MVP)**
- 로그인 화면 구현
- 발주 목록 화면 구현
- 발주 상세 화면 구현
- 기타 주요 화면 구현

## 📚 참고

- 네비게이션 사용 방법은 `src/navigation/README.md` 참고
- 화면 추가 시 `types.ts`에 타입 정의 후 네비게이션에 추가
