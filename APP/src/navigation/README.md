# 네비게이션 구조

## 구조 개요

```
RootNavigator
├── AuthNavigator (로그인 전)
│   └── Login Screen
└── MainNavigator (로그인 후)
    ├── Dashboard Screen
    ├── PurchaseOrders Screen
    ├── PurchaseOrderDetail Screen
    └── ... (기타 화면들)
```

## 파일 구조

- `types.ts`: 네비게이션 타입 정의 (RootStackParamList)
- `index.tsx`: 루트 네비게이션 컴포넌트 (인증 상태에 따라 분기)
- `AuthNavigator.tsx`: 인증 전 네비게이션 (로그인, 회원가입)
- `MainNavigator.tsx`: 인증 후 메인 네비게이션 (대시보드, 발주 등)

## 사용 방법

### 화면 추가

1. `types.ts`에 파라미터 타입 추가
2. 화면 컴포넌트 생성 (`src/screens/`)
3. `MainNavigator.tsx` 또는 `AuthNavigator.tsx`에 Screen 추가

예시:
```typescript
// types.ts
PurchaseOrders: undefined;

// MainNavigator.tsx
import { PurchaseOrdersScreen } from '../screens/PurchaseOrdersScreen';
<Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} />
```

### 화면 간 이동

```typescript
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function MyScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  // 화면 이동
  navigation.navigate('PurchaseOrders');
  
  // 파라미터와 함께 이동
  navigation.navigate('PurchaseOrderDetail', {
    id: 'PO-001',
    tab: 'cost',
  });
}
```

### 화면 파라미터 받기

```typescript
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

type PurchaseOrderDetailRouteProp = RouteProp<RootStackParamList, 'PurchaseOrderDetail'>;

function PurchaseOrderDetailScreen() {
  const route = useRoute<PurchaseOrderDetailRouteProp>();
  const { id, tab } = route.params;
  
  // ...
}
```
