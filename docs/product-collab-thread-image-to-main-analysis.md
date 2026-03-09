# 스레드 메시지 이미지를 대표/후보 이미지로 등록하기 – 분석 및 UI/UX 제안

## 1. 현재 구조 정리

### 1.1 스레드 메시지 이미지
- **저장 위치**: `product_collab_attachments` (message_id, kind, url)
- **표시**: ThreadMessageList에서 메시지별 `attachments` 중 `kind === 'image'`만 썸네일로 표시
- **URL 형식**: 업로드 시와 동일한 경로 (`/uploads/product-collab/{productId}/xxx.jpg`) → 이미 서버에 파일이 있음

### 1.2 제품 대표/후보 이미지
- **저장 위치**: `product_collab_product_images` (product_id, image_url, kind: 'candidate' | 'final')
- **등록 방식**: MainImageSection에서만 “이미지 선택/URL 입력” 후 `addProductImage(productId, { image_url, set_as_main })` 호출

### 1.3 기술적 결론
- 스레드 첨부 이미지의 **url**을 그대로 `addProductImage`의 **image_url**로 넘기면 됨 (재업로드 불필요).
- **백엔드 변경 없이** 기존 `POST /products/:id/images` API만 재사용하면 됨.

---

## 2. 사용자 시나리오

| 시나리오 | 사용자 행동 | 기대 결과 |
|----------|-------------|-----------|
| A | 스레드에 올린 이미지 중 하나를 “제품 후보 이미지”로 쓰고 싶다 | 해당 이미지가 대표 이미지 섹션의 후보 목록에 추가됨 |
| B | 스레드에 올린 이미지를 곧바로 “대표 이미지”로 정하고 싶다 | 해당 이미지가 대표로 설정되고, 목록/카드에 대표로 표시됨 |

→ **같은 이미지에 대해 “후보로 추가” / “대표로 설정” 두 가지 액션**을 제공하면 됨.

---

## 3. UI 배치 후보

### 3.1 옵션 A: 이미지 위 호버 시 오버레이 버튼
- **위치**: 메시지 내 각 이미지 위에 마우스 오버 시 반투명 레이어 + 버튼
- **장점**: 메시지 읽기 흐름을 해치지 않음, 필요할 때만 노출
- **단점**: 터치 기기에서는 호버가 없어 “길게 누르기” 또는 “항상 작게 표시” 등 보완 필요

### 3.2 옵션 B: 이미지 우측 하단에 항상 아이콘 메뉴
- **위치**: 각 이미지 우측 하단에 작은 아이콘(⋮ 또는 이미지+화살표) 클릭 시 “후보로 추가” / “대표로 설정” 메뉴
- **장점**: 모바일에서도 발견 가능, 의도가 명확
- **단점**: 작은 이미지일 때 버튼이 겹쳐 보일 수 있음

### 3.3 옵션 C: 이미지만 호버/포커스 시 하단에 액션 바
- **위치**: 이미지에 호버(또는 포커스) 시 이미지 **아래**에 한 줄 액션 바 표시 (“후보로 추가” | “대표로 설정”)
- **장점**: 이미지를 가리지 않음, 텍스트로 의도가 분명함
- **단점**: 세로 공간을 조금 더 씀

---

## 4. 권장안: A + 모바일 대응 (호버 오버레이 + 터치 시 토글)

- **데스크톱**: 메시지 내 **이미지 위 호버** 시 반투명 오버레이 + **“후보로 추가”** / **“대표로 설정”** 두 버튼 노출 (MainImageSection의 후보 썸네일 “대표로 설정”과 동일한 패턴).
- **모바일/터치**: 같은 오버레이를 **이미지 탭(클릭)** 한 번으로 표시하고, 다시 이미지 밖 탭 시 닫기. (또는 이미지 길게 누르기로 메뉴 열기 선택 가능)

이렇게 하면:
- 스레드 읽기 시에는 글과 이미지만 보이다가, **이미지를 쓰고 싶을 때만** 해당 이미지에 포커스하면 액션이 보임.
- “대표로 설정”은 현재 대표를 바꾸는 동작이므로, 클릭 시 **간단한 확인 문구** 하나 두면 실수 방지에 유리함.  
  예: `"이 이미지를 대표 이미지로 설정할까요?"` → 확인 시 `addProductImage(productId, { image_url: a.url, set_as_main: true })` 호출 후 상단 대표 이미지 섹션/목록 갱신.

---

## 5. 상세 UI 스펙 제안

### 5.1 노출 조건
- **대상**: 메시지/답글의 `attachments` 중 **kind === 'image'** 인 것만.
- **제한**: “이미지” 타입만 대표/후보 등록 가능 (파일 첨부는 링크만 있으므로 제외).

### 5.2 버튼/레이블
- **후보로 추가**: `addProductImage(productId, { image_url: a.url, set_as_main: false })`  
  - 성공 시: 상단 MainImageSection/제품 정보 갱신(`onUpdate`), 필요 시 토스트/인라인 문구 “후보 이미지로 추가되었습니다.”
- **대표로 설정**:  
  - 클릭 시 확인: “이 이미지를 대표 이미지로 설정할까요?”  
  - 확인 시: `addProductImage(productId, { image_url: a.url, set_as_main: true })`  
  - 성공 시: 동일하게 `onUpdate`로 대표 이미지 섹션 갱신, “대표 이미지로 설정되었습니다.” 등 피드백.

### 5.3 레이아웃 (호버 오버레이)
- 이미지 컨테이너: `position: relative`, `overflow: hidden`.
- 오버레이: `absolute inset-0`, `bg-black/50`, `flex items-center justify-center gap-2`, 기본 `opacity-0 group-hover:opacity-100` (그룹 호버 시 표시).
- 버튼: “후보로 추가” (회색 계열), “대표로 설정” (강조색 파란/초록).
- 모바일: 해당 이미지에 `group` 클릭 시 오버레이만 `opacity-100`으로 토글하거나, `focus-within`으로 포커스 시 표시.

### 5.4 상태/에러 처리
- 요청 중: 버튼 비활성화 또는 스피너로 “등록 중” 표시.
- 실패: 인라인 에러 메시지 또는 토스트로 “이미지 등록에 실패했습니다.” + 서버 메시지.
- 동일 URL이 이미 후보/대표로 있을 때: 서버가 중복 허용 여부에 따라, 허용하면 그대로 추가하고, 비허용이면 “이미 등록된 이미지입니다.” 안내.

### 5.5 접근성
- 오버레이 버튼에 `aria-label` (예: “후보 이미지로 추가”, “대표 이미지로 설정”).
- 키보드로 이미지 포커스 시 오버레이 표시되도록 하면, 키보드 전용 사용자도 동일한 액션 가능.

---

## 6. 데이터/API 요약

- **추가 API 없음.**  
  기존 `addProductImage(productId, { image_url, set_as_main })` 만 사용.
- **이미지 URL**: 메시지 attachment의 `a.url` (이미 `/uploads/...` 형태이면 그대로 전달, 클라이언트에서 절대 URL로 보여주는 것은 기존처럼 `getProductCollabImageUrl`만 사용).
- **갱신**: 스레드 상단의 MainImageSection·OrderFlowButtons 등이 쓰는 제품 정보를 다시 불러오기 위해, ThreadMessageList에 전달된 `onMessageUpdated`와 동일한 콜백을 “이미지 등록 성공 시” 한 번 더 호출하면 됨.  
  → 상위(ProductCollabThread)에서 `loadProduct`를 `onImageAdded` 같은 이름으로 스레드에 넘기고, 메시지 이미지에서 “후보로 추가”/“대표로 설정” 성공 시 해당 콜백 호출.

---

## 7. 구현 체크리스트

1. **ThreadMessageList / MessageItem**  
   - 메시지 attachment 중 `kind === 'image'`인 각 이미지를 `position: relative` + `group` 컨테이너로 감싼다.
   - 이미지 위에 호버(및 모바일 시 탭) 시 오버레이 + “후보로 추가” / “대표로 설정” 버튼 렌더링.
2. **이벤트**  
   - “후보로 추가”: `addProductImage(productId, { image_url: a.url, set_as_main: false })` 후 상위 `onImageAdded()` 호출.
   - “대표로 설정”: 확인 다이얼로그 후 `addProductImage(..., set_as_main: true)` 후 동일하게 `onImageAdded()` 호출.
3. **ProductCollabThread**  
   - MainImageSection에 넘기는 `onUpdate`와 동일한 `loadProduct`를 ThreadMessageList에는 `onImageAdded` prop으로 전달.
4. **에러/로딩**  
   - 버튼 비활성화 및 인라인/토스트 에러 메시지 처리.
5. **(선택)**  
   - 이미 등록된 URL이면 버튼 비활성화 또는 “이미 등록됨” 표시. (서버에서 중복 허용 시 생략 가능.)

이 순서로 적용하면, 스레드에서 올린 이미지를 대표 이미지 또는 후보로 등록하는 흐름을 **기존 API와 UX 패턴을 최대한 재사용**하면서 구현할 수 있습니다.
