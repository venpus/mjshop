# 5단계 완료: Context 포팅 (AsyncStorage 적용)

## ✅ 완료된 작업

1. **AuthContext 포팅**
   - ✅ `localStorage` → `AsyncStorage` 변경
   - ✅ 비동기 처리 추가 (async/await)
   - ✅ API_BASE_URL을 constants에서 import
   - ✅ useEffect에서 비동기 로드 처리

2. **LanguageContext 포팅**
   - ✅ `localStorage` → `AsyncStorage` 변경
   - ✅ 비동기 처리 추가 (async/await)
   - ✅ 초기 로딩 상태 관리 추가

3. **Context 인덱스 파일 생성**
   - ✅ `src/contexts/index.ts` 생성

## 📝 주요 변경사항

### AuthContext 변경사항

**Before (웹 - 동기):**
```typescript
const savedUser = localStorage.getItem('admin_user');
localStorage.setItem('admin_user', JSON.stringify(userData));
localStorage.removeItem('admin_user');
```

**After (모바일 - 비동기):**
```typescript
const savedUser = await AsyncStorage.getItem(STORAGE_KEY);
await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
await AsyncStorage.removeItem(STORAGE_KEY);
```

**주요 변경:**
- `logout` 함수를 `async`로 변경
- `useEffect` 내부에서 비동기 함수 호출 (`loadSavedUser`)
- 에러 처리 추가

### LanguageContext 변경사항

**Before (웹 - 동기):**
```typescript
const [language, setLanguageState] = useState<Language>(() => {
  const savedLanguage = localStorage.getItem('language') as Language;
  return savedLanguage && ['ko', 'zh', 'en'].includes(savedLanguage) ? savedLanguage : 'ko';
});

const setLanguage = (lang: Language) => {
  setLanguageState(lang);
  localStorage.setItem('language', lang);
};
```

**After (모바일 - 비동기):**
```typescript
const [language, setLanguageState] = useState<Language>('ko');
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const loadSavedLanguage = async () => {
    const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
    if (savedLanguage && ['ko', 'zh', 'en'].includes(savedLanguage)) {
      setLanguageState(savedLanguage as Language);
    }
    setIsLoading(false);
  };
  loadSavedLanguage();
}, []);

const setLanguage = async (lang: Language) => {
  setLanguageState(lang);
  await AsyncStorage.setItem(STORAGE_KEY, lang);
};
```

**주요 변경:**
- `useState` 초기값을 기본값('ko')으로 설정
- `useEffect`에서 비동기로 저장된 언어 로드
- `setLanguage` 함수를 `async`로 변경
- 로딩 상태 추가

## ⚠️ 주의사항

1. **비동기 처리**
   - AsyncStorage는 Promise 기반이므로 `async/await` 또는 `.then()` 사용 필수
   - `useEffect` 내부에서 비동기 함수를 직접 호출할 수 없으므로 내부 함수로 정의 후 호출

2. **에러 처리**
   - AsyncStorage 작업은 try-catch로 에러 처리 필요
   - 저장/불러오기 실패 시에도 앱이 정상 작동하도록 처리

3. **타입 안정성**
   - `setLanguage`의 반환 타입이 `Promise<void>`로 변경됨
   - 이를 사용하는 컴포넌트에서 `await` 또는 `.then()` 사용 필요

## ✅ 검증 완료

- AsyncStorage import 확인
- 모든 localStorage 호출을 AsyncStorage로 변경
- 비동기 처리 적절히 적용
- 에러 처리 추가
- API_BASE_URL을 constants에서 import

## 다음 단계

**6단계: 네비게이션 구조 설정**
- React Navigation 타입 정의
- AuthNavigator 생성
- MainNavigator 생성 (TabNavigator + StackNavigator)
- 기본 네비게이션 구조 설정
