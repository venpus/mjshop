import { ProjectRepository } from '../repositories/projectRepository.js';
import {
  Project,
  ProjectPublic,
  CreateProjectDTO,
  UpdateProjectDTO,
  CreateProjectEntryDTO,
  UpdateProjectEntryDTO,
  UpsertImageReactionDTO,
  CreateCommentDTO,
  CreateCommentReplyDTO,
} from '../models/project.js';

export class ProjectService {
  private repository: ProjectRepository;

  constructor() {
    this.repository = new ProjectRepository();
  }

  /**
   * 모든 프로젝트 조회
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
  async createEntry(data: CreateProjectEntryDTO): Promise<ProjectPublic> {
    await this.repository.createEntry(data);
    
    // 프로젝트 전체 다시 조회
    const project = await this.repository.findById(data.project_id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    return project;
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

    await this.repository.deleteComment(commentId);

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

    await this.repository.deleteCommentReply(replyId);

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

    return project;
  }

}

