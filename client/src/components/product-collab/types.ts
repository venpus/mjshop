/**
 * 제품 개발 협업(Product Collaboration) 모듈 - 클라이언트 타입
 * API 응답과 동일한 구조
 */

export type ProductCollabStatus =
  | 'REQUEST'
  | 'RESEARCH'
  | 'CANDIDATE_REVIEW'
  | 'SAMPLE'
  | 'MODEL_SELECT'
  | 'SPEC_INPUT'
  | 'ORDER_APPROVAL'
  | 'ORDER_REGISTERED'
  | 'READY_FOR_ORDER'
  | 'COMPLETED';

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
  price: string | null;
  last_activity_at: string;
  next_action?: string | null;
}

export interface ProductCollabAttachment {
  id: number;
  message_id: number;
  kind: 'image' | 'file';
  url: string;
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

export interface DashboardData {
  myTasks: DashboardMyTask[];
  teamTasks: DashboardTeamTask[];
  allAssigneeTasks: DashboardAllAssigneeTask[];
  statusCounts: DashboardStatusCount[];
}
