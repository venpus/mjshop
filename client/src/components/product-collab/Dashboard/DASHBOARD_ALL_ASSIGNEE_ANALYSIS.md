# 제품 협업 대시보드 – 담당자별 업무 표시 분석

## 1. 현재 동작 방식

### 1.1 데이터 구조

- **product_collab_tasks**: 메시지에서 @멘션될 때 생성되는 “업무” 한 건.  
  - `assignee_id`: 멘션된 사람(담당자)  
  - `product_id`, `message_id`, `completed_at` 등
- **product_collab_products**: 제품.  
  - `assignee_id`: 제품 담당자(제품 단위 담당자, 태스크와는 별개)

### 1.2 현재 대시보드 API (`GET /product-collab/dashboard`)

| 구분 | API/저장소 | 의미 |
|------|------------|------|
| **내 업무 (myTasks)** | `findMyTasks(currentUserId)` | `product_collab_tasks`에서 **assignee_id = 로그인 사용자**인 행만 조회. 즉 **나에게 @멘션된 업무만** 표시. |
| **팀 업무 (teamTasks)** | `findTeamTasks(currentUserId)` | `product_collab_products`에서 **제품 담당자(assignee_id)가 있고, 그 담당자가 나 아닌** 제품 목록만 조회. **제품 단위**만 보여주며, 해당 제품의 “태스크 목록”은 포함하지 않음. (최대 20개) |
| **제품 현황 (statusCounts)** | `getStatusCounts()` | 상태별 제품 수(완료 제외). |

정리하면:

- **내 업무**: “나에게 할당된(@멘션된) 태스크”만 보임.
- **팀 업무**: “다른 사람이 제품 담당자인 제품” 이름만 보임.  
  → 다른 담당자들의 **개별 업무(태스크)** 는 현재 대시보드에 없음.

---

## 2. “관련된 담당자 모두의 업무”가 의미하는 것

- **해석**: “내 업무”뿐 아니라 **다른 담당자들에게 @멘션된 업무까지 포함해, 담당자별로 누가 어떤 업무를 가지고 있는지** 대시보드에서 보고 싶다.
- **현재 부족한 점**:  
  - 팀 업무는 “제품 + 제품 담당자”만 보여줌.  
  - **태스크 단위**(누가 어떤 메시지에 멘션되어 어떤 업무를 맡았는지)는 “내 업무”에만 있고, 다른 담당자 업무는 보이지 않음.

따라서 “관련된 담당자 모두의 업무 내용이 보여지도록” 하려면, **태스크 단위**로 **모든 담당자(assignee_id)** 의 업무를 가져와서 보여주는 방식이 맞습니다.

---

## 3. 수정 가능 여부 및 방향

### 3.1 결론: **수정 가능**

- 이미 `product_collab_tasks`에 `assignee_id`별로 “누가 어떤 제품/메시지에 대한 업무를 맡았는지”가 저장되어 있음.
- 여기서 “현재 사용자” 조건만 빼고, **진행 중 제품에 한해** 모든 담당자의 태스크를 조회하면 “담당자 모두의 업무”를 대시보드에 올릴 수 있음.

### 3.2 구현 방향 제안

**옵션 A – “전체 담당자 업무” 섹션 추가 (권장)**

- **백엔드**  
  - `findAllAssigneeTasks()` 같은 메서드 추가:  
    - `product_collab_tasks` + `product_collab_products` 조인.  
    - `product_collab_products.status != 'COMPLETED'` 인 제품만.  
    - `assignee_id`로 그룹하지 않고, **태스크 목록 전체**를 반환 (각 행에 `assignee_id`, `assignee_name`, `product_id`, `product_name`, `task_id`, `completed_at` 등 포함).
  - 대시보드 API 응답에 예: `allAssigneeTasks: DashboardAllAssigneeTask[]` 를 추가.

- **프론트**  
  - 기존 “내 업무” / “팀 업무”는 유지.  
  - 새 섹션 **“담당자별 업무”** 또는 **“전체 업무”** 추가.  
  - 리스트를 **담당자(assignee_name)별로 그룹**해서 보여주거나, 테이블 형태로 “담당자 | 제품명 | 완료 여부 | 스레드 보기” 등으로 표시.

**옵션 B – “팀 업무”를 “담당자별 태스크”로 대체**

- **백엔드**  
  - `findTeamTasks` 대신(또는 보조로) “다른 담당자들의 태스크”를 반환하는 API 사용.  
  - 즉 `product_collab_tasks` 기준으로 assignee_id != currentUser 인 태스크만 조회하거나, 아예 “전체 담당자 태스크”를 쓰고 프론트에서 “나 제외”만 필터.

- **프론트**  
  - “팀 업무” 영역을 “다른 담당자 업무”(태스크 단위 리스트)로 바꾸고, 담당자명/제품명/완료 여부/스레드 링크를 표시.

**옵션 C – “내 업무”만 두고, “팀 업무”를 “전체 담당자 업무”로 확장**

- “팀 업무”의 데이터 소스를 **제품 목록** → **전체 태스크 목록**으로 변경.
- 한 섹션에서 “담당자별”로 구분해 표시 (예: 담당자 A – 업무 3건, 담당자 B – 업무 2건 …).

---

## 4. 공통으로 필요한 백엔드 변경

- **새 조회 (또는 기존 조회 확장)**  
  - `product_collab_tasks`  
    - JOIN `product_collab_products` (status != 'COMPLETED')  
    - JOIN `admin_accounts` (assignee_id → assignee_name)  
  - 반환 필드: `task_id`, `product_id`, `product_name`, `message_id`, `assignee_id`, `assignee_name`, `completed_at`, `created_at`  
  - 정렬: 예) `assignee_id`, `completed_at IS NULL DESC`, `created_at DESC`

- **권한**  
  - 현재 대시보드와 동일하게 “로그인한 관리자”만 호출 가능하면 됨. (제품 협업 권한이 있는 사용자만 전체 담당자 업무를 보는 방식으로 통일 가능.)

---

## 5. 요약

| 항목 | 내용 |
|------|------|
| **현재** | “내 업무”만 태스크 단위, “팀 업무”는 다른 담당자 **제품**만 제품 단위로 표시. |
| **요구** | 관련된 **담당자 모두의 업무(태스크)** 가 보이도록. |
| **가능 여부** | 가능. `product_collab_tasks` 기반으로 assignee 기준 조회를 확장하면 됨. |
| **권장** | “전체 담당자 업무”용 API를 추가하고, 대시보드에 “담당자별 업무” 섹션을 추가하는 방식(옵션 A). |

원하시면 옵션 A 기준으로 실제 수정할 **API 스펙(응답 필드)** 와 **화면 구성(섹션 제목, 컬럼)** 까지 구체적으로 적어드리겠습니다.
