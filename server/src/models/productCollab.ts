/**
 * 제품 개발 협업(Product Collaboration) 모듈 - 타입/상수
 * 기존 시스템과 독립된 데이터 구조
 */

export const PRODUCT_COLLAB_STATUS = [
  'REQUEST',
  'RESEARCH',
  'CANDIDATE_REVIEW',
  'SAMPLE',
  'MODEL_SELECT',
  'SPEC_INPUT',
  'ORDER_APPROVAL',
  'ORDER_REGISTERED',
  'READY_FOR_ORDER',
  'COMPLETED',
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
  sku_count: string | null;
  request_note: string | null;
  request_note_translated?: string | null;
  request_note_lang?: string | null;
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
  tag: MessageTag | null;
  created_at: Date;
  updated_at: Date;
  author_name?: string | null;
  attachments?: ProductCollabAttachment[];
  mentions?: ProductCollabMention[];
  replies?: ProductCollabMessage[];
}

export interface ProductCollabAttachment {
  id: number;
  message_id: number;
  kind: 'image' | 'file';
  url: string;
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
  price: string | null;
  last_activity_at: Date;
  next_action?: string | null;
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
  sku_count?: string | null;
  request_note?: string | null;
  request_note_translated?: string | null;
  request_note_lang?: string | null;
  updated_by?: string | null;
}

export interface CreateMessageDTO {
  product_id: number;
  parent_id?: number | null;
  author_id: string;
  body?: string | null;
  tag?: MessageTag | null;
  attachment_urls?: { kind: 'image' | 'file'; url: string }[];
  mention_user_ids?: string[];
}

export interface UpdateMessageDTO {
  body?: string | null;
  tag?: MessageTag | null;
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
}

export interface DashboardStatusCount {
  status: string;
  count: number;
}
