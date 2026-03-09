# 제품 개발 협업 – 맨션 기능 분석 및 Threads 스타일 구현 방안

## 1. 현재 구현 상태

### 1.1 데이터 구조 (이미 구현됨)

| 테이블 | 역할 |
|--------|------|
| **product_collab_mentions** | 메시지에 @멘션된 사용자 목록 (message_id, user_id) |
| **product_collab_tasks** | 멘션당한 사람에게 부여되는 “할 일” (product_id, message_id, assignee_id, completed_at) |

- 메시지 작성 시 `mention_user_ids`를 넘기면:
  - `product_collab_mentions`에 (message_id, user_id) 삽입
  - `product_collab_tasks`에 (product_id, message_id, assignee_id) 삽입
- 메시지/멘션 조회 시 메시지별로 `mentions` 배열에 멘션된 사용자(id, user_name) 포함되어 내려옴.

### 1.2 API

- **createMessage**  
  - body: `mention_user_ids?: string[]` 지원  
  - 서버에서 멘션·태스크 생성까지 처리됨.
- **getDashboard**  
  - `myTasks`: `product_collab_tasks`에서 `assignee_id = 현재 사용자`인 행 조회 (진행 중 제품만).  
  - `teamTasks`: 다른 담당자 제품 요약.

### 1.3 대시보드 표시 (현재)

- **MY TASKS**: 제품명 + “완료 / 진행 중”만 표시.
- **링크/메시지 미표시**: 어떤 메시지에서 멘션됐는지, 해당 스레드로 가는 링크 없음.

### 1.4 스레드 작성 UI

- **ThreadComposer**에서 `mention_user_ids`를 보내지 않음.
- 멘션 선택 UI(드롭다운/멀티셀렉트) 없음.

---

## 2. “Threads”와 같은 동작이란

- **멘션**  
  - 메시지에 @이름으로 특정 인원 지정.  
  - 지정된 사람에게만 “나에게 온 일”로 보임.
- **담당자에게 보여주기**  
  - “나를 멘션한 메시지” 목록(피드) 제공.  
  - 각 항목에서 **해당 제품 스레드 페이지로 바로 이동** 가능.  
  - 필요 시 “완료” 처리로 체크 오프.

즉, **맨션 입력 UI** + **대시보드에서 “내 업무 = 멘션된 메시지 + 제품 스레드 링크”**가 Threads처럼 동작하는 핵심입니다.

---

## 3. 갭 정리

| 구분 | 현재 | 목표 (Threads 스타일) |
|------|------|------------------------|
| 멘션 입력 | 없음 (API만 지원) | 작성 시 멘션할 사람 선택 UI |
| 멘션 대상 목록 | 없음 | 관리자 계정 중 멘션 가능 사용자 API/목록 |
| MY TASKS 표시 | 제품명 + 완료/진행만 | 멘션된 메시지 요약 + 해당 제품 스레드 링크 |
| 완료 처리 | DB에 completed_at만 존재 | 대시보드/스레드에서 “완료” 버튼으로 업데이트 가능 |

---

## 4. 구현 방안 (단계별)

### 4.1 맨션 “대상 사용자” 목록 API

- **옵션 A (권장)**  
  - 기존 `GET /api/admin-accounts` 사용.  
  - 제품 협업 메뉴 접근 권한이 있는 사용자만 노출하려면, 해당 라우트에 권한 체크가 있으면 그대로 두고, 클라이언트에서 “제품 협업용 멘션 목록”으로 사용.
- **옵션 B**  
  - 제품 협업 전용: `GET /api/product-collab/mentionable-users`  
  - `admin_accounts`에서 id, name 등만 조회해 반환.  
  - 필요 시 나중에 “이 제품에 이미 참여한 사람” 등으로 필터 확장 가능.

구현 시에는 **옵션 B**로 전용 API 하나 두고, 응답을 대시보드/스레드 작성에서 공통 사용하는 것이 확장에 유리합니다.

### 4.2 스레드 작성 시 맨션 UI (ThreadComposer)

- **위치**: 메시지 입력 폼(텍스트/태그/이미지) 근처.
- **동작**  
  - “멘션할 사람” 드롭다운 또는 멀티셀렉트.  
  - `mentionable-users`(또는 admin-accounts) 결과를 id/name으로 표시.  
  - 선택한 사용자 id 배열을 `createMessage(productId, { ..., mention_user_ids: selectedIds })`에 포함.
- **표시**  
  - 선택된 사용자는 칩/태그 형태로 표시하고, 제거 가능하게 처리.

이렇게 하면 “메시지 작성 시 누구를 멘션할지”가 Threads처럼 명시적으로 선택됩니다.

### 4.3 대시보드 – MY TASKS를 “멘션된 스레드”처럼 보여주기

- **데이터**  
  - 현재 이미 `myTasks`에 `task_id, product_id, product_name, message_id, assignee_id, completed_at, created_at` 있음.
- **표시 개선**  
  - 각 항목에 대해:  
    - 제품명  
    - (선택) 멘션된 메시지 요약(본문 일부 또는 “OO님이 멘션함”)  
    - “진행 중” / “완료”  
    - **버튼: “스레드 보기”** → `/admin/product-collab/thread/:productId` 로 이동 (해당 제품 스레드).
- **선택 사항**  
  - 스레드 페이지 진입 시 `message_id`를 쿼리로 넘기면, 해당 메시지로 스크롤/강조하는 식의 “알림에서 온 문맥” 제공 가능.

이렇게 하면 “맨션된 담당자”가 대시보드에서 바로 해당 제품 스레드로 들어가는 Threads 같은 플로우가 됩니다.

### 4.4 태스크 “완료” 처리

- **API**  
  - `PATCH /api/product-collab/products/:productId/tasks/:taskId`  
  - 또는 `PUT .../tasks/:taskId/complete`  
  - body 또는 경로로 “완료 처리”를 의미하고, 서버에서 `product_collab_tasks.completed_at = NOW()` 로 업데이트.
- **호출 위치**  
  - 대시보드 MY TASKS: 각 행에 “완료” 버튼.  
  - (선택) 제품 스레드 페이지에서 “이 멘션 완료” 버튼을 메시지 단위로 제공.

이미 `product_collab_tasks`에 `completed_at`이 있으므로, 완료 API만 추가하면 됩니다.

### 4.5 (선택) 메시지 본문 내 @이름 파싱

- **현재**: `mention_user_ids`로만 멘션 관계 저장, 메시지 본문에는 @표시 없어도 동작.
- **Threads처럼**: 본문에 “@홍길동” 텍스트를 넣고, 그에 맞춰 멘션 관계를 매칭하려면:
  - 저장 시 본문에서 `@이름` 패턴 파싱 → `admin_accounts`에서 name으로 id 조회 → `mention_user_ids` 생성.
  - 또는 에디터에서 @ 입력 시 자동완성으로 사용자 선택하고, 선택된 사용자 id를 `mention_user_ids`에, 표시용으로는 “@이름”을 본문에 넣는 방식.

1차 구현에서는 **4.2처럼 “멘션할 사람” 선택 UI + `mention_user_ids`만**으로도 Threads와 같은 “누가 누구를 태그했는지” 및 “태그된 사람에게만 보이는 할 일” 동작을 만족할 수 있습니다.

---

## 5. 구현 순서 제안

1. **mentionable-users API** (또는 admin-accounts 활용 방식) 확정 및 구현.
2. **ThreadComposer**에 멘션 선택 UI 추가 → `createMessage`에 `mention_user_ids` 전달.
3. **대시보드 MY TASKS**  
   - “스레드 보기” 링크 추가 (`/admin/product-collab/thread/:productId`).  
   - (선택) 메시지 요약 또는 “멘션됨” 문구 표시.
4. **태스크 완료 API** 추가 후, 대시보드(및 필요 시 스레드)에 “완료” 버튼 연결.
5. (선택) 본문 @이름 파싱 또는 @ 자동완성.

이 순서로 진행하면 “맨션 기능을 어떻게 처리하고, 맨션된 담당자에게 어떻게 보여줄지”를 Threads와 같은 개념으로 정리할 수 있습니다.
