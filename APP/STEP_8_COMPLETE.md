# 8단계 완료: 공통 컴포넌트 개발

## ✅ 완료된 작업

### 1. 기본 UI 컴포넌트
- ✅ **Button** (`src/components/common/Button.tsx`)
  - Variant: primary, secondary, danger, outline, ghost
  - Size: sm, md, lg
  - Loading 상태 지원
  - Disabled 상태 지원

- ✅ **Input** (`src/components/common/Input.tsx`)
  - Label, Error 메시지 지원
  - Multiline 지원
  - TextInputProps 확장

- ✅ **Card** (`src/components/common/Card.tsx`)
  - Shadow 효과
  - Padding 옵션

- ✅ **Modal** (`src/components/common/Modal.tsx`)
  - Title, Close 버튼
  - ScrollView 내장
  - Overlay 클릭 시 닫기

- ✅ **Loading** (`src/components/common/Loading.tsx`)
  - FullScreen 모드 지원
  - 메시지 표시

- ✅ **ErrorDisplay** (`src/components/common/ErrorDisplay.tsx`)
  - 에러 메시지 표시
  - Retry 버튼 지원

### 2. 레이아웃 컴포넌트
- ✅ **Container** (`src/components/common/Container.tsx`)
  - SafeAreaView 지원
  - Padding 옵션

- ✅ **Header** (`src/components/common/Header.tsx`)
  - Title, Left/Right 버튼
  - 아이콘 또는 텍스트 버튼 지원

### 3. 상수 정의
- ✅ **colors.ts** - 색상 상수
- ✅ **spacing.ts** - 간격 상수
- ✅ **typography.ts** - 타이포그래피 상수
- ✅ **index.ts** - 상수 export

### 4. 인덱스 파일
- ✅ `src/components/common/index.ts` - 모든 공통 컴포넌트 export

## 📝 주요 특징

### 컴포넌트 설계 원칙

1. **재사용성**: 다양한 상황에서 사용 가능하도록 props 확장
2. **타입 안정성**: TypeScript 타입 정의 완료
3. **일관성**: 일관된 스타일과 동작
4. **접근성**: 명확한 레이블과 피드백

### 스타일링 접근 방식

- **StyleSheet 사용**: React Native 기본 방식 사용
- **상수 기반**: colors, spacing, typography 상수 활용
- **컴포지션**: style prop으로 커스터마이징 가능

## 📋 컴포넌트 사용 예시

### Button
```typescript
import { Button } from '../components/common';

<Button
  title="저장"
  onPress={handleSave}
  variant="primary"
  size="md"
  loading={isSaving}
/>
```

### Input
```typescript
import { Input } from '../components/common';

<Input
  label="이름"
  value={name}
  onChangeText={setName}
  error={errors.name}
  placeholder="이름을 입력하세요"
/>
```

### Modal
```typescript
import { Modal } from '../components/common';

<Modal
  visible={isOpen}
  onClose={handleClose}
  title="확인"
>
  <Text>내용</Text>
</Modal>
```

### Container & Header
```typescript
import { Container, Header } from '../components/common';

<Container>
  <Header
    title="발주 목록"
    leftButton={{ label: '←', onPress: handleBack }}
    rightButton={{ label: '검색', onPress: handleSearch }}
  />
  {/* 내용 */}
</Container>
```

## ✅ 검증 완료

- 모든 컴포넌트 타입 정의 완료
- StyleSheet 사용
- 상수 파일 분리
- 인덱스 파일로 export 정리

## 다음 단계

**9단계: 화면 개발 (MVP)**
- 로그인 화면 구현
- 발주 목록 화면 구현
- 발주 상세 화면 구현
- 기타 주요 화면 구현

공통 컴포넌트를 사용하여 화면 개발을 시작할 수 있습니다!
