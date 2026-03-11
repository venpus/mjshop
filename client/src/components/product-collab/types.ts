/**
 * 제품 개발 협업(Product Collaboration) 모듈 - 클라이언트 타입
 * API 응답과 동일한 구조
 */

export type ProductCollabStatus =
  | 'RESEARCH'
  | 'SAMPLE_TEST'
  | 'CONFIG_CONFIRM'
  | 'ORDER_PENDING'
  | 'INCOMING'
  | 'IN_PRODUCTION'
  | 'PRODUCTION_COMPLETE'
  | 'CANCELLED';

/** 진행 상태 표시용 번역 키 */
export const PRODUCT_COLLAB_STATUS_LABEL_KEYS: Record<ProductCollabStatus, string> = {
  RESEARCH: 'productCollab.statusResearch',
  SAMPLE_TEST: 'productCollab.statusSampleTest',
  CONFIG_CONFIRM: 'productCollab.statusConfigConfirm',
  ORDER_PENDING: 'productCollab.statusOrderPending',
  INCOMING: 'productCollab.statusIncoming',
  IN_PRODUCTION: 'productCollab.statusInProduction',
  PRODUCTION_COMPLETE: 'productCollab.statusProductionComplete',
  CANCELLED: 'productCollab.statusCancelled',
};

export type ProductCollabCategory = 'Plush' | 'Goods' | 'Figure';

export type MessageTag =
  | 'REQUEST'
  | 'RESEARCH'
  | 'CANDIDATE'
  | 'SAMPLE'
  | 'PRICE'
  | 'DECISION'
  | 'FINAL';

export interface ProductCollabProductListItem {
  id: number;
  name: string;
  status: ProductCollabStatus;
  category: ProductCollabCategory | null;
  assignee_id: string | null;
  assignee_name?: string | null;
  main_image_id: number | null;
  main_image_url?: string | null;
  /** 대표 이미지가 없을 때 목록에서 사용할 요청사항 첫 이미지 URL */
  request_first_image_url?: string | null;
  price: string | null;
  last_activity_at: string;
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

export interface ProductCollabAttachment {
  id: number;
  message_id: number;
  kind: 'image' | 'file';
  url: string;
  original_filename?: string | null;
  display_order: number;
  created_at: string;
}

export interface ProductCollabMention {
  id: number;
  message_id: number;
  user_id: string;
  user_name?: string | null;
  created_at: string;
}

export interface ProductCollabMessage {
  id: number;
  product_id: number;
  parent_id: number | null;
  author_id: string;
  body: string | null;
  body_translated?: string | null;
  body_lang?: string | null;
  tag: MessageTag | null;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  attachments?: ProductCollabAttachment[];
  mentions?: ProductCollabMention[];
  replies?: ProductCollabMessage[];
  /** 로그인 사용자가 이 메시지에서 멘션된 경우 해당 태스크 정보 (스레드 확인 버튼용) */
  current_user_task?: { task_id: number; completed_at: string | null } | null;
}

export interface ProductCollabProductImage {
  id: number;
  product_id: number;
  image_url: string;
  kind: 'candidate' | 'final';
  display_order: number;
  created_at: string;
  created_by: string | null;
}

export interface ProductCollabProductDetail extends ProductCollabProductListItem {
  moq: string | null;
  lead_time: string | null;
  packaging: string | null;
  sku_count: string | null;
  request_note: string | null;
  request_note_translated?: string | null;
  request_note_lang?: string | null;
  request_links?: string[] | null;
  request_image_urls?: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  messages?: ProductCollabMessage[];
  product_images?: ProductCollabProductImage[];
}

export interface DashboardMyTask {
  task_id: number;
  product_id: number;
  product_name: string;
  message_id: number;
  assignee_id: string;
  completed_at: string | null;
  created_at: string;
  /** 멘션된 메시지 본문 */
  body?: string | null;
  body_translated?: string | null;
}

export interface DashboardTeamTask {
  product_id: number;
  product_name: string;
  assignee_id: string | null;
  assignee_name?: string | null;
  last_activity_at: string;
}

export interface DashboardStatusCount {
  status: string;
  count: number;
}

/** 담당자별 전체 업무 (대시보드 '담당자별 업무' 섹션용) */
export interface DashboardAllAssigneeTask {
  task_id: number;
  product_id: number;
  product_name: string;
  message_id: number;
  assignee_id: string;
  assignee_name: string | null;
  completed_at: string | null;
  created_at: string;
  /** 멘션된 메시지 본문 */
  body?: string | null;
  body_translated?: string | null;
}

/** 내가 작성한 메시지를 멘션된 사람이 확인한 항목 (대시보드용) */
export interface DashboardConfirmation {
  task_id: number;
  product_id: number;
  product_name: string;
  message_id: number;
  assignee_id: string;
  assignee_name: string | null;
  completed_at: string;
  body: string | null;
  body_translated?: string | null;
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
  created_at: string;
  depth: number;
}

export interface DashboardData {
  myTasks: DashboardMyTask[];
  allAssigneeTasks: DashboardAllAssigneeTask[];
  statusCounts: DashboardStatusCount[];
  confirmationsReceived: DashboardConfirmation[];
  repliesToMyMessages: DashboardReplyItem[];
}
