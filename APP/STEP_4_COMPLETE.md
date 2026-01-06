# 4단계 완료: API 레이어 포팅

## ✅ 완료된 작업

1. **API 파일 복사**
   - ✅ `purchaseOrderApi.ts`
   - ✅ `packingListApi.ts`
   - ✅ `projectApi.ts`

2. **수정 사항 적용**
   - ✅ `import.meta.env` → `constants.ts`에서 import
   - ✅ `API_BASE_URL`과 `SERVER_BASE_URL`을 constants에서 import
   - ✅ `getFullImageUrl` 함수를 constants에서 import
   - ✅ 중복된 `getFullImageUrl` 함수 제거

3. **API 인덱스 파일 생성**
   - ✅ `src/api/index.ts` 생성 (모든 API export)

## 📝 주요 변경사항

### Before (웹):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function getFullImageUrl(imageUrl: string | null | undefined): string {
  // ...
}
```

### After (모바일):
```typescript
import { API_BASE_URL, SERVER_BASE_URL, getFullImageUrl } from '../config/constants';
export { getFullImageUrl };
```

## ✅ 검증 완료

- 모든 API 파일에서 constants 사용 확인
- fetch API는 React Native에서 동일하게 작동 (수정 불필요)
- credentials: 'include'는 React Native에서 동일하게 작동

## 다음 단계

**5단계: Context 포팅 (AsyncStorage 적용)**
- AuthContext 포팅
- LanguageContext 포팅
- localStorage → AsyncStorage 변경
