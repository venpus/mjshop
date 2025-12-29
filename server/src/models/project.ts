/**
 * 프로젝트 관련 타입 정의
 */

export type ProjectStatus = '진행중' | 'PENDING' | '취소';

export type ImageReaction = 'like' | 'dislike';

/**
 * 프로젝트
 */
export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  start_date: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 프로젝트 항목
 */
export interface ProjectEntry {
  id: number;
  project_id: number;
  date: Date;
  title: string;
  content: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 프로젝트 항목 이미지
 */
export interface ProjectEntryImage {
  id: number;
  entry_id: number;
  image_url: string;
  display_order: number;
  created_at: Date;
}

/**
 * 프로젝트 항목 이미지 반응
 */
export interface ProjectEntryImageReaction {
  id: number;
  image_id: number;
  user_id: string;
  reaction: ImageReaction;
  created_at: Date;
  updated_at: Date;
}

/**
 * 프로젝트 항목 댓글
 */
export interface ProjectEntryComment {
  id: number;
  entry_id: number;
  content: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 프로젝트 항목 댓글 답글
 */
export interface ProjectEntryCommentReply {
  id: number;
  comment_id: number;
  content: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 프로젝트 생성 DTO
 */
export interface CreateProjectDTO {
  name: string;
  status?: ProjectStatus;
  start_date: Date;
  created_by?: string;
}

/**
 * 프로젝트 수정 DTO
 */
export interface UpdateProjectDTO {
  name?: string;
  status?: ProjectStatus;
  start_date?: Date;
  updated_by?: string;
}

/**
 * 프로젝트 항목 생성 DTO
 */
export interface CreateProjectEntryDTO {
  project_id: number;
  date: Date;
  title: string;
  content?: string;
  created_by?: string;
}

/**
 * 프로젝트 항목 수정 DTO
 */
export interface UpdateProjectEntryDTO {
  date?: Date;
  title?: string;
  content?: string;
  updated_by?: string;
}

/**
 * 프로젝트 항목 이미지 반응 생성/수정 DTO
 */
export interface UpsertImageReactionDTO {
  image_id: number;
  user_id: string;
  reaction: ImageReaction;
}

/**
 * 프로젝트 항목 댓글 생성 DTO
 */
export interface CreateCommentDTO {
  entry_id: number;
  content: string;
  user_id: string;
}

/**
 * 프로젝트 항목 댓글 답글 생성 DTO
 */
export interface CreateCommentReplyDTO {
  comment_id: number;
  content: string;
  user_id: string;
}

/**
 * 프로젝트 Public 인터페이스 (항목 포함)
 */
export interface ProjectPublic extends Project {
  entries?: ProjectEntryPublic[];
}

/**
 * 프로젝트 항목 Public 인터페이스 (이미지, 댓글 포함)
 */
export interface ProjectEntryPublic extends ProjectEntry {
  images?: ProjectEntryImagePublic[];
  comments?: ProjectEntryCommentPublic[];
}

/**
 * 프로젝트 항목 이미지 Public 인터페이스 (반응 포함)
 */
export interface ProjectEntryImagePublic extends ProjectEntryImage {
  reactions?: ProjectEntryImageReaction[];
}

/**
 * 프로젝트 항목 댓글 Public 인터페이스 (답글 포함)
 */
export interface ProjectEntryCommentPublic extends ProjectEntryComment {
  replies?: ProjectEntryCommentReply[];
}

