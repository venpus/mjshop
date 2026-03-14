# 제조 문서 번역 – AI에 내용 전달 방식

## 1. 입력 구성

서버는 **한국어 원문만** 골라서 AI에 넘깁니다.

- **제품명** 1개: `product_name`
- **공정별**:
  - 공정명 1개: `process_name`
  - 작업 방법 1개: `work_method` (비어 있으면 해당 필드는 호출하지 않음)

즉, 문서 전체가 아니라 **필드 단위 문자열**만 전달합니다.

## 2. API 호출 방식

- OpenAI 또는 Qwen의 **Chat Completions** 호출을 사용합니다.
- 요청 본문 예시:
  - **system**  
    - 역할: “완구·봉제·잡화 전문, 한국어·중국어 능통”  
    - 지시: 한국어 입력을 **간체 중국어로만** 번역, **경어체** 사용, 제품명·형번 등은 필요 시 유지  
    - `getManufacturingKoToZhPrompt()`로 생성된 문자열
  - **user**  
    - 번역할 **한글 문자열 하나** (제품명이면 제품명만, 공정명이면 공정명만, 작업방법이면 작업방법만)
- 기타: `max_tokens: 1024`, `temperature: 0.2`

## 3. 호출 단위 (한 번에 한 필드씩)

- **제품명** 1회: `translateManufacturingKoToZh(product_name)` → `product_name_zh`
- **각 공정마다**:
  - 공정명 1회: `translateManufacturingKoToZh(step.process_name)` → `process_name_zh`
  - 작업방법이 있으면 1회: `translateManufacturingKoToZh(step.work_method)` → `work_method_zh`
- 전체 문서를 한 번에 보내지 않고, **필드별로 나눠서** 각각 한 번씩 Chat Completions를 호출하고, 응답 문자열을 해당 `*_zh` 필드에 넣습니다.

## 4. 프로바이더 우선순위

- `OPENAI_API_KEY` 있음 → OpenAI(예: `gpt-4o-mini`) 1순위
- 실패 시 또는 OpenAI 미사용 시 `DASHSCOPE_API_KEY` 사용 → Qwen(예: `qwen-flash`) 2순위

관련 코드: `server/src/services/translationService.ts`  
- `getManufacturingKoToZhPrompt()`: 시스템 프롬프트  
- `translateManufacturingKoToZh(text)`: 한 문장 번역 (system + user 메시지로 전달)  
- `translateManufacturingDocument(input)`: 제품명 + 공정 배열에 대해 위 함수를 반복 호출
