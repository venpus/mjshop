// 프로젝트 관련 API 함수

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/**
 * 사용자 ID를 헤더에 포함한 헤더 객체 반환
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const savedUser = localStorage.getItem('admin_user');
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser);
      if (userData.id) {
        headers['X-User-Id'] = userData.id;
      }
    } catch (error) {
      console.error('Failed to parse saved user data:', error);
    }
  }
  return headers;
}

export interface Project {
  id: number;
  name: string;
  status: '진행중' | '홀딩중' | '취소' | '완성';
  start_date: string | Date;
  requirements: string | null;
  last_entry_content: string | null;
  confirmed_image_url: string | null;
  thumbnail_image_url: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface ProjectListItem {
  id: number;
  name: string;
  status: '진행중' | '홀딩중' | '취소' | '완성';
  start_date: string | Date;
  requirements: string | null;
  thumbnail_image_url: string | null;
  confirmed_image_url: string | null;
  last_entry_content: string | null;
  last_entry_date: string | Date | null;
  last_entry_author_id: string | null;
  last_entry_author_name: string | null;
  last_comment_content: string | null;
  last_comment_author_id: string | null;
  last_comment_author_name: string | null;
  last_comment_date: string | Date | null;
  creator_name: string | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ProjectInitialImage {
  id: number;
  project_id: number;
  image_url: string;
  display_order: number;
  created_at: string | Date;
}

export interface ProjectReferenceLink {
  id: number;
  project_id: number;
  title: string | null;
  url: string;
  display_order: number;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ProjectEntry {
  id: number;
  project_id: number;
  date: string | Date;
  title: string;
  content: string | null;
  images?: Array<{ 
    id: number; 
    image_url: string; 
    display_order: number;
    description?: string | null;
    is_confirmed: boolean;
    confirmed_at: string | Date | null;
    reactions?: Array<{ 
      id: number; 
      image_id: number; 
      user_id: string; 
      reaction: 'like' | 'dislike'; 
      created_at: string | Date; 
      updated_at: string | Date 
    }> 
  }>;
  images?: Array<{
    id: number;
    entry_id: number;
    image_url: string;
    display_order: number;
    description?: string | null;
    is_confirmed: boolean;
    confirmed_at: string | Date | null;
    created_at: string | Date;
  }>;
  comments?: Array<{
    id: number;
    entry_id: number;
    content: string;
    user_id: string;
    user_name?: string | null;
    created_at: string | Date;
    updated_at: string | Date;
    replies?: Array<{
      id: number;
      comment_id: number;
      content: string;
      user_id: string;
      user_name?: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>;
  }>;
}

export interface ProjectPublic extends Project {
  entries?: ProjectEntry[];
  initial_images?: ProjectInitialImage[];
  reference_links?: ProjectReferenceLink[];
  creator_name?: string | null;
  recent_viewers?: Array<{
    user_id: string;
    user_name: string | null;
    viewed_at: string | Date;
  }>;
}

/**
 * 모든 프로젝트 조회 (목록용)
 */
export interface ProjectListPaginationParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectListPaginationResult {
  items: ProjectListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export async function getAllProjects(): Promise<ProjectListItem[]> {
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
 * 프로젝트 목록 조회 (페이지네이션 지원)
 */
export async function getProjectsPaginated(
  params: ProjectListPaginationParams
): Promise<ProjectListPaginationResult> {
  const queryParams = new URLSearchParams();
  queryParams.append('page', params.page.toString());
  queryParams.append('limit', params.limit.toString());
  
  if (params.search) {
    queryParams.append('search', params.search);
  }
  if (params.status && params.status !== '전체') {
    queryParams.append('status', params.status);
  }
  if (params.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  const response = await fetch(`${API_BASE_URL}/projects?${queryParams.toString()}`, {
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
export async function createProject(projectData: { 
  name: string; 
  status?: string; 
  start_date: string;
  requirements?: string;
}): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
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

  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries`, {
    method: 'POST',
    headers,
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
      ...getAuthHeaders(),
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
  if (!imageFiles || imageFiles.length === 0) {
    throw new Error('업로드할 이미지 파일이 없습니다.');
  }

  const formData = new FormData();
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });

  // FormData 사용 시 Content-Type은 브라우저가 자동 설정하므로 사용자 ID만 헤더에 포함
  const headers: HeadersInit = {};
  const savedUser = localStorage.getItem('admin_user');
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser);
      if (userData.id) {
        headers['X-User-Id'] = userData.id;
      }
    } catch (error) {
      console.error('Failed to parse saved user data:', error);
    }
  }

  console.log('📤 [이미지 업로드] 요청 정보:');
  console.log('  - projectId:', projectId);
  console.log('  - entryId:', entryId);
  console.log('  - 파일 개수:', imageFiles.length);
  console.log('  - 파일명:', imageFiles.map(f => f.name));

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/images`, {
    method: 'POST',
    headers, // Content-Type은 포함하지 않음 (브라우저가 자동 설정)
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
 * 프로젝트 항목 이미지 설명 업데이트
 */
export async function updateEntryImageDescription(
  projectId: number,
  entryId: number,
  imageId: number,
  description: string | null
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/images/${imageId}/description`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 설명 업데이트에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '이미지 설명 업데이트에 실패했습니다.');
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
      ...getAuthHeaders(),
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
      ...getAuthHeaders(),
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
      ...getAuthHeaders(),
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
 * 이미지 URL을 전체 URL로 변환 (캐시 버스팅 포함)
 */
export function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  
  let fullUrl: string;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    fullUrl = imageUrl;
  } else {
    fullUrl = `${SERVER_BASE_URL}${imageUrl}`;
  }
  
  // 캐시 버스팅: 이미 쿼리 파라미터가 있으면 추가하지 않음
  if (!fullUrl.includes('?')) {
    const cacheBuster = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // 일 단위
    return `${fullUrl}?v=${cacheBuster}`;
  }
  
  return fullUrl;
}

/**
 * 프로젝트 초기 이미지 업로드
 */
export async function uploadInitialImages(
  projectId: number,
  imageFiles: File[]
): Promise<ProjectPublic> {
  const formData = new FormData();
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });

  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/initial-images`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '초기 이미지 업로드에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '초기 이미지 업로드에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 초기 이미지 삭제
 */
export async function deleteInitialImage(
  projectId: number,
  imageId: number
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/initial-images/${imageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '초기 이미지 삭제에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '초기 이미지 삭제에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 참고 링크 추가
 */
export async function createReferenceLink(
  projectId: number,
  linkData: { title?: string; url: string; display_order?: number }
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/reference-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(linkData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '참고 링크 추가에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '참고 링크 추가에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 참고 링크 수정
 */
export async function updateReferenceLink(
  projectId: number,
  linkId: number,
  linkData: { title?: string; url?: string; display_order?: number }
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/reference-links/${linkId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(linkData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '참고 링크 수정에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '참고 링크 수정에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 참고 링크 삭제
 */
export async function deleteReferenceLink(
  projectId: number,
  linkId: number
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/reference-links/${linkId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '참고 링크 삭제에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '참고 링크 삭제에 실패했습니다.');
  }

  return data.data;
}

/**
 * 이미지 확정
 */
export async function confirmImage(
  projectId: number,
  entryId: number,
  imageId: number
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/images/${imageId}/confirm`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 확정에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '이미지 확정에 실패했습니다.');
  }

  return data.data;
}

/**
 * 이미지 확정 해제
 */
export async function unconfirmImage(
  projectId: number,
  entryId: number,
  imageId: number
): Promise<ProjectPublic> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/entries/${entryId}/images/${imageId}/confirm`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '이미지 확정 해제에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '이미지 확정 해제에 실패했습니다.');
  }

  return data.data;
}

/**
 * 프로젝트 수정
 */
export async function updateProject(
  projectId: number,
  projectData: { 
    name?: string; 
    status?: string; 
    start_date?: string;
    requirements?: string;
  }
): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '프로젝트 수정에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '프로젝트 수정에 실패했습니다.');
  }

  return data.data;
}
