import { ProjectRepository } from '../repositories/projectRepository.js';
import {
  Project,
  ProjectPublic,
  ProjectListItem,
  ProjectInitialImage,
  ProjectReferenceLink,
  CreateProjectDTO,
  UpdateProjectDTO,
  CreateProjectEntryDTO,
  UpdateProjectEntryDTO,
  UpsertImageReactionDTO,
  CreateCommentDTO,
  CreateCommentReplyDTO,
  CreateProjectInitialImageDTO,
  CreateProjectReferenceLinkDTO,
  UpdateProjectReferenceLinkDTO,
  CreateProjectViewDTO,
} from '../models/project.js';

export class ProjectService {
  private repository: ProjectRepository;

  constructor() {
    this.repository = new ProjectRepository();
  }

  /**
   * 모든 프로젝트 조회 (목록용 - 최적화)
   */
  async getAllProjectsForList(): Promise<ProjectListItem[]> {
    return await this.repository.findAllForList();
  }

  /**
   * 프로젝트 목록 조회 (페이지네이션 지원)
   */
  async getProjectsForListPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ items: ProjectListItem[]; total: number; page: number; limit: number; totalPages: number; hasMore: boolean }> {
    const { page, limit, search, status, startDate, endDate } = params;
    
    const result = await this.repository.findForListPaginated({
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
    });

    const totalPages = Math.ceil(result.total / limit);
    const hasMore = page < totalPages;

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * 모든 프로젝트 조회 (기존 메서드 - 호환성 유지)
   */
  async getAllProjects(): Promise<Project[]> {
    return await this.repository.findAll();
  }

  /**
   * ID로 프로젝트 조회 (항목, 이미지, 댓글 포함)
   */
  async getProjectById(id: number): Promise<ProjectPublic | null> {
    return await this.repository.findById(id);
  }

  /**
   * 프로젝트 생성
   */
  async createProject(data: CreateProjectDTO): Promise<Project> {
    return await this.repository.create(data);
  }

  /**
   * 프로젝트 수정
   */
  async updateProject(id: number, data: UpdateProjectDTO): Promise<Project> {
    return await this.repository.update(id, data);
  }

  /**
   * 프로젝트 삭제
   */
  async deleteProject(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * 프로젝트 항목 생성
   */
  async createEntry(data: CreateProjectEntryDTO): Promise<{ project: ProjectPublic; entryId: number }> {
    const entry = await this.repository.createEntry(data);
    
    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(data.project_id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 최종 항목 정보 업데이트 (통합)
    await this.repository.updateLastEntryInfo(data.project_id);

    return { project, entryId: entry.id };
  }

  /**
   * 프로젝트 항목 수정
   */
  async updateEntry(entryId: number, data: UpdateProjectEntryDTO): Promise<ProjectPublic> {
    const entry = await this.repository.updateEntry(entryId, data);
    
    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(entry.project_id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 최종 항목 정보 업데이트 (통합)
    await this.repository.updateLastEntryInfo(entry.project_id);

    return project;
  }

  /**
   * 프로젝트 항목 삭제
   */
  async deleteEntry(entryId: number, projectId: number): Promise<ProjectPublic> {
    await this.repository.deleteEntry(entryId);
    
    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 최종 항목 정보 업데이트 (통합)
    await this.repository.updateLastEntryInfo(projectId);

    return project;
  }

  /**
   * 이미지 반응 생성/수정
   */
  async upsertImageReaction(data: UpsertImageReactionDTO): Promise<void> {
    await this.repository.upsertImageReaction(data);
  }

  /**
   * 이미지 반응 삭제
   */
  async deleteImageReaction(imageId: number, userId: string): Promise<void> {
    await this.repository.deleteImageReaction(imageId, userId);
  }

  /**
   * 댓글 생성
   */
  async createComment(data: CreateCommentDTO): Promise<ProjectPublic> {
    await this.repository.createComment(data);
    
    // 항목의 프로젝트 ID 조회
    const entry = await this.repository['findEntryById'](data.entry_id);
    if (!entry) {
      throw new Error('프로젝트 항목을 찾을 수 없습니다.');
    }

    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(entry.project_id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 최신 댓글 정보 업데이트
    await this.repository.updateLastCommentInfo(entry.project_id);

    return project;
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(commentId: number): Promise<ProjectPublic> {
    // 댓글의 항목 ID 조회
    const entryId = await this.repository.findEntryIdByCommentId(commentId);
    if (!entryId) {
      throw new Error('댓글을 찾을 수 없습니다.');
    }

    // 항목의 프로젝트 ID 조회 (삭제 전에 조회)
    const entry = await this.repository['findEntryById'](entryId);
    if (!entry) {
      throw new Error('프로젝트 항목을 찾을 수 없습니다.');
    }

    await this.repository.deleteComment(commentId);

    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(entry.project_id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 최신 댓글 정보 업데이트
    await this.repository.updateLastCommentInfo(entry.project_id);

    return project;
  }

  /**
   * 답글 생성
   */
  async createCommentReply(data: CreateCommentReplyDTO): Promise<ProjectPublic> {
    // 댓글의 항목 ID 조회
    const entryId = await this.repository.findEntryIdByCommentId(data.comment_id);
    if (!entryId) {
      throw new Error('댓글을 찾을 수 없습니다.');
    }

    await this.repository.createCommentReply(data);

    // 항목의 프로젝트 ID 조회
    const entry = await this.repository['findEntryById'](entryId);
    if (!entry) {
      throw new Error('프로젝트 항목을 찾을 수 없습니다.');
    }

    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(entry.project_id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 최신 댓글 정보 업데이트 (답글도 댓글의 일부이므로)
    await this.repository.updateLastCommentInfo(entry.project_id);

    return project;
  }

  /**
   * 답글 삭제
   */
  async deleteCommentReply(replyId: number): Promise<ProjectPublic> {
    // 답글의 항목 ID 조회
    const entryId = await this.repository.findEntryIdByReplyId(replyId);
    if (!entryId) {
      throw new Error('답글을 찾을 수 없습니다.');
    }

    // 항목의 프로젝트 ID 조회 (삭제 전에 조회)
    const entry = await this.repository['findEntryById'](entryId);
    if (!entry) {
      throw new Error('프로젝트 항목을 찾을 수 없습니다.');
    }

    await this.repository.deleteCommentReply(replyId);

    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(entry.project_id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    // 최신 댓글 정보 업데이트
    await this.repository.updateLastCommentInfo(entry.project_id);

    return project;
  }

  // ==================== 초기 이미지 관련 메서드 ====================

  /**
   * 프로젝트 초기 이미지 생성
   */
  async createInitialImage(data: CreateProjectInitialImageDTO): Promise<ProjectInitialImage> {
    return await this.repository.createInitialImage(data);
  }

  /**
   * 프로젝트 초기 이미지 삭제
   */
  async deleteInitialImage(id: number): Promise<void> {
    await this.repository.deleteInitialImage(id);
  }

  // ==================== 참고 링크 관련 메서드 ====================

  /**
   * 프로젝트 참고 링크 생성
   */
  async createReferenceLink(data: CreateProjectReferenceLinkDTO): Promise<ProjectReferenceLink> {
    return await this.repository.createReferenceLink(data);
  }

  /**
   * 프로젝트 참고 링크 수정
   */
  async updateReferenceLink(id: number, data: UpdateProjectReferenceLinkDTO): Promise<ProjectReferenceLink> {
    return await this.repository.updateReferenceLink(id, data);
  }

  /**
   * 프로젝트 참고 링크 삭제
   */
  async deleteReferenceLink(id: number): Promise<void> {
    await this.repository.deleteReferenceLink(id);
  }

  // ==================== 조회 이력 관련 메서드 ====================

  /**
   * 프로젝트 조회 이력 기록
   */
  async recordProjectView(data: CreateProjectViewDTO): Promise<void> {
    await this.repository.upsertProjectView(data);
  }

  // ==================== 이미지 확정 관련 메서드 ====================

  /**
   * 이미지 확정
   */
  async confirmImage(imageId: number, projectId: number): Promise<void> {
    await this.repository.confirmImage(imageId, projectId);
  }

  /**
   * 이미지 확정 해제
   */
  async unconfirmImage(imageId: number, projectId: number): Promise<void> {
    await this.repository.unconfirmImage(imageId, projectId);
  }

  /**
   * 프로젝트 항목 이미지 설명 업데이트
   */
  async updateEntryImageDescription(imageId: number, description: string | null): Promise<ProjectPublic> {
    await this.repository.updateEntryImageDescription(imageId, description);
    
    // 이미지의 항목 ID 조회
    const image = await this.repository['findEntryImageById'](imageId);
    if (!image) {
      throw new Error('이미지를 찾을 수 없습니다.');
    }

    // 항목의 프로젝트 ID 조회
    const entry = await this.repository['findEntryById'](image.entry_id);
    if (!entry) {
      throw new Error('프로젝트 항목을 찾을 수 없습니다.');
    }

    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(entry.project_id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    return project;
  }

}

