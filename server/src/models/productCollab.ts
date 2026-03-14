/**
 * 제품 개발 협업(Product Collaboration) 모듈 - 타입/상수
 * 기존 시스템과 독립된 데이터 구조
 */

/**
 * 제품 진행 상태 (표기: 조사중, 샘플테스트, 구성확정중, 발주대기, 입고중, 생산중, 생산 완료, 문제발생, 취소)
 */
export const PRODUCT_COLLAB_STATUS = [
  'RESEARCH',           // 조사중
  'SAMPLE_TEST',        // 샘플테스트
  'CONFIG_CONFIRM',     // 구성확정중
  'ORDER_PENDING',      // 발주대기
  'INCOMING',           // 입고중
  'IN_PRODUCTION',      // 생산중
  'PRODUCTION_COMPLETE',// 생산 완료
  'ISSUE_OCCURRED',     // 문제발생
  'CANCELLED',          // 취소
] as const;

export type ProductCollabStatus = (typeof PRODUCT_COLLAB_STATUS)[number];

export const PRODUCT_COLLAB_CATEGORY = ['Plush', 'Goods', 'Figure'] as const;
export type ProductCollabCategory = (typeof PRODUCT_COLLAB_CATEGORY)[number];

export const MESSAGE_TAG = [
  'REQUEST',
  'RESEARCH',
  'CANDIDATE',
  'SAMPLE',
  'PRICE',
  'DECISION',
  'FINAL',
] as const;
export type MessageTag = (typeof MESSAGE_TAG)[number];

export interface ProductCollabProduct {
  id: number;
  name: string;
  status: ProductCollabStatus;
  category: ProductCollabCategory | null;
  assignee_id: string | null;
  main_image_id: number | null;
  price: string | null;
  moq: string | null;
  lead_time: string | null;
  packaging: string | null;
  inner_packaging: string | null;
  sku_count: string | null;
  request_note: string | null;
  request_note_translated?: string | null;
  request_note_lang?: string | null;
  request_links?: string[] | null;
  request_image_urls?: string[] | null;
  last_activity_at: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface ProductCollabMessage {
  id: number;
  product_id: number;
  parent_id: number | null;
  author_id: string;
  body: string | null;
  body_translated?: string | null;
  body_lang?: string | null;
  /** 번역에 사용된 AI: openai / qwen */
  body_translation_provider?: 'openai' | 'qwen' | null;
  tag: MessageTag | null;
  created_at: Date;
  updated_at: Date;
  author_name?: string | null;
  attachments?: ProductCollabAttachment[];
  mentions?: ProductCollabMention[];
  replies?: ProductCollabMessage[];
  /** 로그인 사용자가 이 메시지에서 멘션된 경우 해당 태스크 정보 (스레드 확인 버튼용) */
  current_user_task?: { task_id: number; completed_at: Date | null } | null;
}

export interface ProductCollabAttachment {
  id: number;
  message_id: number;
  kind: 'image' | 'file';
  url: string;
  original_filename?: string | null;
  display_order: number;
  created_at: Date;
}

export interface ProductCollabMention {
  id: number;
  message_id: number;
  user_id: string;
  user_name?: string | null;
  created_at: Date;
}

export interface ProductCollabProductImage {
  id: number;
  product_id: number;
  image_url: string;
  kind: 'candidate' | 'final';
  display_order: number;
  created_at: Date;
  created_by: string | null;
}

export interface ProductCollabTask {
  id: number;
  product_id: number;
  message_id: number;
  assignee_id: string;
  assignee_name?: string | null;
  completed_at: Date | null;
  created_at: Date;
  product_name?: string | null;
}

export interface ProductCollabProductListItem {
  id: number;
  name: string;
  status: ProductCollabStatus;
  category: ProductCollabCategory | null;
  assignee_id: string | null;
  assignee_name?: string | null;
  main_image_id: number | null;
  main_image_url?: string | null;
  request_first_image_url?: string | null;
  price: string | null;
  last_activity_at: Date;
  next_action?: string | null;
  /** 최신 스레드 메시지 본문 */
  last_message_body?: string | null;
  /** 최신 스레드 메시지 번역문 (한↔중) */
  last_message_body_translated?: string | null;
  /** 최신 스레드 메시지 원문 언어 (ko / zh) */
  last_message_body_lang?: string | null;
  /** 최신 스레드 메시지의 멘션 목록 (이름 포함) */
  last_message_mentions?: { user_id: string; user_name?: string | null }[];
}

export interface ProductCollabProductDetail extends ProductCollabProduct {
  main_image_url?: string | null;
  assignee_name?: string | null;
  messages?: ProductCollabMessage[];
  product_images?: ProductCollabProductImage[];
}

export interface CreateProductCollabProductDTO {
  name: string;
  category?: ProductCollabCategory | null;
  request_note?: string | null;
  /** 서비스에서 번역 후 설정. API에서는 보내지 않음 */
  request_note_translated?: string | null;
  request_note_lang?: string | null;
  request_links?: string[] | null;
  request_image_urls?: string[] | null;
  created_by?: string | null;
}

export interface UpdateProductCollabProductDTO {
  name?: string;
  status?: ProductCollabStatus;
  category?: ProductCollabCategory | null;
  assignee_id?: string | null;
  main_image_id?: number | null;
  price?: string | null;
  moq?: string | null;
  lead_time?: string | null;
  packaging?: string | null;
  inner_packaging?: string | null;
  sku_count?: string | null;
  request_note?: string | null;
  request_note_translated?: string | null;
  request_note_lang?: string | null;
  request_links?: string[] | null;
  request_image_urls?: string[] | null;
  updated_by?: string | null;
}

export interface CreateMessageDTO {
  product_id: number;
  parent_id?: number | null;
  author_id: string;
  body?: string | null;
  tag?: MessageTag | null;
  attachment_urls?: { kind: 'image' | 'file'; url: string; original_filename?: string | null }[];
  mention_user_ids?: string[];
}

export interface UpdateMessageDTO {
  body?: string | null;
  tag?: MessageTag | null;
  /** 제공 시 해당 메시지의 첨부를 이 목록으로 교체 */
  attachment_urls?: { kind: 'image' | 'file'; url: string; original_filename?: string | null }[];
}

export interface DashboardMyTask {
  task_id: number;
  product_id: number;
  product_name: string;
  message_id: number;
  assignee_id: string;
  completed_at: Date | null;
  created_at: Date;
  body?: string | null;
  body_translated?: string | null;
  body_lang?: string | null;
}

export interface DashboardTeamTask {
  product_id: number;
  product_name: string;
  assignee_id: string | null;
  assignee_name?: string | null;
  last_activity_at: Date;
}

export interface DashboardAllAssigneeTask {
  task_id: number;
  product_id: number;
  product_name: string;
  message_id: number;
  assignee_id: string;
  assignee_name: string | null;
  completed_at: Date | null;
  created_at: Date;
  body?: string | null;
  body_translated?: string | null;
  body_lang?: string | null;
}

export interface DashboardStatusCount {
  status: string;
  count: number;
}

/** 내가 작성한 메시지를 멘션된 사람이 확인한 목록 (대시보드용) */
export interface DashboardConfirmation {
  task_id: number;
  product_id: number;
  product_name: string;
  message_id: number;
  assignee_id: string;
  assignee_name: string | null;
  completed_at: Date;
  body: string | null;
  body_translated?: string | null;
  body_lang?: string | null;
}

/** 내가 작성한 글에 달린 답글 (직접·중첩 모두, 대시보드용) */
export interface DashboardReplyItem {
  message_id: number;
  product_id: number;
  product_name: string;
  parent_id: number;
  author_id: string;
  author_name: string | null;
  body: string | null;
  body_translated?: string | null;
  body_lang?: string | null;
  created_at: Date;
  depth: number;
}
