// 프로젝트 관련 API 함수

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export interface Project {
  id: number;
  name: string;
  status: '진행중' | 'PENDING' | '취소';
  start_date: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ProjectEntry {
  id: number;
  project_id: number;
  date: string | Date;
  title: string;
  content: string | null;
  images?: Array<{ id: number; image_url: string; display_order: number; reactions?: Array<{ id: number; image_id: number; user_id: string; reaction: 'like' | 'dislike'; created_at: string | Date; updated_at: string | Date }> }>;
  comments?: Array<{
    id: number;
    entry_id: number;
    content: string;
    user_id: string;
    created_at: string | Date;
    updated_at: string | Date;
    replies?: Array<{
      id: number;
      comment_id: number;
      content: string;
      user_id: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>;
  }>;
}

export interface ProjectPublic extends Project {
  entries?: ProjectEntry[];
}

/**
 * 모든 프로젝트 조회
 */
export async function getAllProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('프로젝트 목록 조회에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '프로젝트 목록 조회에 실패했습니다.');
  }

  return data.data;
}

/**
 * ID로 프로젝트 조회
 */
export async function getProjectById(id: number): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('프로젝트 조회에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '프로젝트 조회에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 생성
 */
export async function createProject(projectData: { name: string; status?: string; start_date: string }): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '프로젝트 생성에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '프로젝트 생성에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 항목 생성
 */
export async function createProjectEntry(
  projectId: number,
  entryData: { date: string; title: string; content?: string },
  imageFiles?: File[]
): Promise<ProjectPublic> {
  const formData = new FormData();
  formData.append('date', entryData.date);
  formData.append('title', entryData.title);
  if (entryData.content) {
    formData.append('content', entryData.content);
  }

  if (imageFiles && imageFiles.length > 0) {
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });
  }

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '프로젝트 항목 생성에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '프로젝트 항목 생성에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 항목 수정
 */
export async function updateProjectEntry(
  projectId: number,
  entryId: number,
  entryData: { date?: string; title?: string; content?: string }
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(entryData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '프로젝트 항목 수정에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '프로젝트 항목 수정에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 항목 삭제
 */
export async function deleteProjectEntry(projectId: number, entryId: number): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '프로젝트 항목 삭제에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '프로젝트 항목 삭제에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 항목 이미지 추가
 */
export async function uploadEntryImages(
  projectId: number,
  entryId: number,
  imageFiles: File[]
): Promise<ProjectPublic> {
  const formData = new FormData();
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '이미지 업로드에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 항목 이미지 삭제
 */
export async function deleteEntryImage(
  projectId: number,
  entryId: number,
  imageId: number
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/images/${imageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 삭제에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '이미지 삭제에 실패했습니다.');
  }

  return data.data;
}

/**
 * 이미지 반응 생성/수정
 */
export async function upsertImageReaction(
  projectId: number,
  entryId: number,
  imageId: number,
  reaction: 'like' | 'dislike'
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/images/${imageId}/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ reaction }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '반응 저장에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '반응 저장에 실패했습니다.');
  }
}

/**
 * 댓글 생성
 */
export async function createComment(
  projectId: number,
  entryId: number,
  content: string
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '댓글 생성에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '댓글 생성에 실패했습니다.');
  }

  return data.data;
}

/**
 * 댓글 삭제
 */
export async function deleteComment(
  projectId: number,
  entryId: number,
  commentId: number
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/comments/${commentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '댓글 삭제에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '댓글 삭제에 실패했습니다.');
  }

  return data.data;
}

/**
 * 답글 생성
 */
export async function createCommentReply(
  projectId: number,
  entryId: number,
  commentId: number,
  content: string
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/comments/${commentId}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '답글 생성에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '답글 생성에 실패했습니다.');
  }

  return data.data;
}

/**
 * 답글 삭제
 */
export async function deleteCommentReply(
  projectId: number,
  entryId: number,
  commentId: number,
  replyId: number
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/comments/${commentId}/replies/${replyId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '답글 삭제에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '답글 삭제에 실패했습니다.');
  }

  return data.data;
}

/**
 * 이미지 URL을 전체 URL로 변환
 */
export function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${SERVER_BASE_URL}${imageUrl}`;
}
