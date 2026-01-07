import { Request, Response } from 'express';
import { ProjectService } from '../services/projectService.js';
import {
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
import {
  projectImageUpload,
  moveImageToProjectFolder,
  moveImageToProjectInitialFolder,
  getProjectImageUrl,
  deleteProjectFolder,
  deleteProjectEntryFolder,
  getNextProjectImageNumber,
  getNextProjectInitialImageNumber,
} from '../utils/upload.js';
import path from 'path';

export class ProjectController {
  private service: ProjectService;

  constructor() {
    this.service = new ProjectService();
  }

  /**
   * 모든 프로젝트 조회 (목록용 - 최적화)
   * GET /api/projects
   */
  getAllProjects = async (req: Request, res: Response) => {
    try {
      // 페이지네이션 파라미터 확인
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      // 페이지네이션 파라미터가 있으면 페이지네이션 API 사용
      if (page !== undefined && limit !== undefined) {
        const search = req.query.search as string | undefined;
        const status = req.query.status as string | undefined;
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

        const result = await this.service.getProjectsForListPaginated({
          page,
          limit,
          search,
          status: status && status !== '전체' ? status : undefined,
          startDate,
          endDate,
        });

        return res.json({
          success: true,
          data: result,
        });
      }

      // 기존 방식 (호환성 유지)
      const projects = await this.service.getAllProjectsForList();
      res.json({
        success: true,
        data: projects,
      });
    } catch (error: any) {
      console.error('프로젝트 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '프로젝트 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * ID로 프로젝트 조회 (항목, 이미지, 댓글 포함)
   * GET /api/projects/:id
   */
  getProjectById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const projectId = parseInt(id, 10);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 프로젝트 ID입니다.',
        });
      }

      const project = await this.service.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: '프로젝트를 찾을 수 없습니다.',
        });
      }

      // 조회 이력 기록
      const userId = (req as any).user?.id;
      if (userId) {
        try {
          await this.service.recordProjectView({
            project_id: projectId,
            user_id: userId,
          });
        } catch (viewError) {
          // 조회 이력 기록 실패해도 프로젝트 조회는 계속 진행
          console.error('조회 이력 기록 오류:', viewError);
        }
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('프로젝트 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '프로젝트 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 생성
   * POST /api/projects
   */
  createProject = async (req: Request, res: Response) => {
    try {
      const data: CreateProjectDTO = {
        name: req.body.name,
        status: req.body.status || '진행중',
        start_date: req.body.start_date ? new Date(req.body.start_date) : new Date(),
        requirements: req.body.requirements || null,
        created_by: (req as any).user?.id || null,
      };

      if (!data.name) {
        return res.status(400).json({
          success: false,
          error: '프로젝트명은 필수입니다.',
        });
      }

      const project = await this.service.createProject(data);

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('프로젝트 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: '프로젝트 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 수정
   * PUT /api/projects/:id
   */
  updateProject = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const projectId = parseInt(id, 10);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 프로젝트 ID입니다.',
        });
      }

      const data: UpdateProjectDTO = {
        name: req.body.name,
        status: req.body.status,
        start_date: req.body.start_date ? new Date(req.body.start_date) : undefined,
        requirements: req.body.requirements !== undefined ? req.body.requirements : undefined,
        updated_by: (req as any).user?.id || null,
      };

      const project = await this.service.updateProject(projectId, data);

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('프로젝트 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: '프로젝트 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 삭제
   * DELETE /api/projects/:id
   */
  deleteProject = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const projectId = parseInt(id, 10);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 프로젝트 ID입니다.',
        });
      }

      // 이미지 폴더 삭제
      await deleteProjectFolder(projectId);

      await this.service.deleteProject(projectId);

      res.json({
        success: true,
        message: '프로젝트가 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('프로젝트 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: '프로젝트 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 항목 생성 (이미지 업로드 포함)
   * POST /api/projects/:id/entries
   */
  createEntry = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const projectId = parseInt(id, 10);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 프로젝트 ID입니다.',
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const imageFiles = files.images || [];

      const data: CreateProjectEntryDTO = {
        project_id: projectId,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        title: req.body.title || '',
        content: req.body.content || null,
        created_by: (req as any).user?.id || null,
      };

      if (!data.title) {
        return res.status(400).json({
          success: false,
          error: '제목은 필수입니다.',
        });
      }

      // 항목 생성
      const { project: createdProject, entryId } = await this.service.createEntry(data);

      // 이미지 업로드
      if (imageFiles.length > 0) {
        let currentImageNumber = await getNextProjectImageNumber(projectId, entryId);

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const ext = path.extname(file.originalname);
          
          const relativePath = await moveImageToProjectFolder(
            file.path,
            projectId,
            entryId,
            currentImageNumber + i,
            ext
          );
          
          const imageUrl = getProjectImageUrl(relativePath);

          // DB에 이미지 저장
          await this.service['repository'].createEntryImage(entryId, imageUrl, currentImageNumber + i);
        }
      }

      // 프로젝트 다시 조회 (이미지 업로드 후 최신 상태)
      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('프로젝트 항목 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: '프로젝트 항목 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 항목 수정
   * PUT /api/projects/:id/entries/:entryId
   */
  updateEntry = async (req: Request, res: Response) => {
    try {
      const { id, entryId } = req.params;
      const projectId = parseInt(id, 10);
      const entryIdNum = parseInt(entryId, 10);

      if (isNaN(projectId) || isNaN(entryIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      const data: UpdateProjectEntryDTO = {
        date: req.body.date ? new Date(req.body.date) : undefined,
        title: req.body.title,
        content: req.body.content !== undefined ? req.body.content : undefined,
        updated_by: (req as any).user?.id || null,
      };

      const project = await this.service.updateEntry(entryIdNum, data);

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('프로젝트 항목 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: '프로젝트 항목 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 항목 삭제
   * DELETE /api/projects/:id/entries/:entryId
   */
  deleteEntry = async (req: Request, res: Response) => {
    try {
      const { id, entryId } = req.params;
      const projectId = parseInt(id, 10);
      const entryIdNum = parseInt(entryId, 10);

      if (isNaN(projectId) || isNaN(entryIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      // 이미지 폴더 삭제
      await deleteProjectEntryFolder(projectId, entryIdNum);

      const project = await this.service.deleteEntry(entryIdNum, projectId);

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('프로젝트 항목 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: '프로젝트 항목 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 항목 이미지 추가
   * POST /api/projects/:id/entries/:entryId/images
   */
  uploadEntryImages = async (req: Request, res: Response) => {
    try {
      const { id, entryId } = req.params;
      const projectId = parseInt(id, 10);
      const entryIdNum = parseInt(entryId, 10);

      if (isNaN(projectId) || isNaN(entryIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      // projectImageUpload.array()를 사용하면 req.files는 배열로 반환됨
      const imageFiles = (req.files as Express.Multer.File[]) || [];

      if (imageFiles.length === 0) {
        return res.status(400).json({
          success: false,
          error: '이미지 파일이 필요합니다.',
        });
      }

      let currentImageNumber = await getNextProjectImageNumber(projectId, entryIdNum);

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const ext = path.extname(file.originalname);
        
        const relativePath = await moveImageToProjectFolder(
          file.path,
          projectId,
          entryIdNum,
          currentImageNumber + i,
          ext
        );
        
        const imageUrl = getProjectImageUrl(relativePath);

        // DB에 이미지 저장
        await this.service['repository'].createEntryImage(entryIdNum, imageUrl, currentImageNumber + i);
      }

      // 프로젝트 다시 조회
      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('이미지 업로드 오류:', error);
      res.status(500).json({
        success: false,
        error: '이미지 업로드 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 항목 이미지 설명 업데이트
   * PUT /api/projects/:id/entries/:entryId/images/:imageId/description
   */
  updateEntryImageDescription = async (req: Request, res: Response) => {
    try {
      const { id, entryId, imageId } = req.params;
      const projectId = parseInt(id, 10);
      const entryIdNum = parseInt(entryId, 10);
      const imageIdNum = parseInt(imageId, 10);

      if (isNaN(projectId) || isNaN(entryIdNum) || isNaN(imageIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      const { description } = req.body;

      const project = await this.service.updateEntryImageDescription(
        imageIdNum,
        description || null
      );

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('이미지 설명 업데이트 오류:', error);
      res.status(500).json({
        success: false,
        error: '이미지 설명 업데이트 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 항목 이미지 삭제
   * DELETE /api/projects/:id/entries/:entryId/images/:imageId
   */
  deleteEntryImage = async (req: Request, res: Response) => {
    try {
      const { id, entryId, imageId } = req.params;
      const projectId = parseInt(id, 10);
      const entryIdNum = parseInt(entryId, 10);
      const imageIdNum = parseInt(imageId, 10);

      if (isNaN(projectId) || isNaN(entryIdNum) || isNaN(imageIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      await this.service['repository'].deleteEntryImage(imageIdNum);

      // 프로젝트 다시 조회
      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('이미지 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: '이미지 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 이미지 반응 생성/수정
   * POST /api/projects/:id/entries/:entryId/images/:imageId/reactions
   */
  upsertImageReaction = async (req: Request, res: Response) => {
    try {
      const { imageId } = req.params;
      const imageIdNum = parseInt(imageId, 10);

      if (isNaN(imageIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 이미지 ID입니다.',
        });
      }

      const data: UpsertImageReactionDTO = {
        image_id: imageIdNum,
        user_id: (req as any).user?.id || null,
        reaction: req.body.reaction,
      };

      await this.service.upsertImageReaction(data);

      res.json({
        success: true,
        message: '반응이 저장되었습니다.',
      });
    } catch (error: any) {
      console.error('이미지 반응 저장 오류:', error);
      res.status(500).json({
        success: false,
        error: '이미지 반응 저장 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 댓글 생성
   * POST /api/projects/:id/entries/:entryId/comments
   */
  createComment = async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      const entryIdNum = parseInt(entryId, 10);

      if (isNaN(entryIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 항목 ID입니다.',
        });
      }

      const data: CreateCommentDTO = {
        entry_id: entryIdNum,
        content: req.body.content || '',
        user_id: (req as any).user?.id || null,
      };

      if (!data.content) {
        return res.status(400).json({
          success: false,
          error: '댓글 내용은 필수입니다.',
        });
      }

      const project = await this.service.createComment(data);

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('댓글 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: '댓글 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 댓글 삭제
   * DELETE /api/projects/:id/entries/:entryId/comments/:commentId
   */
  deleteComment = async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const commentIdNum = parseInt(commentId, 10);

      if (isNaN(commentIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 댓글 ID입니다.',
        });
      }

      const project = await this.service.deleteComment(commentIdNum);

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('댓글 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: '댓글 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 답글 생성
   * POST /api/projects/:id/entries/:entryId/comments/:commentId/replies
   */
  createCommentReply = async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const commentIdNum = parseInt(commentId, 10);

      if (isNaN(commentIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 댓글 ID입니다.',
        });
      }

      const data: CreateCommentReplyDTO = {
        comment_id: commentIdNum,
        content: req.body.content || '',
        user_id: (req as any).user?.id || null,
      };

      if (!data.content) {
        return res.status(400).json({
          success: false,
          error: '답글 내용은 필수입니다.',
        });
      }

      const project = await this.service.createCommentReply(data);

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('답글 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: '답글 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 답글 삭제
   * DELETE /api/projects/:id/entries/:entryId/comments/:commentId/replies/:replyId
   */
  deleteCommentReply = async (req: Request, res: Response) => {
    try {
      const { replyId } = req.params;
      const replyIdNum = parseInt(replyId, 10);

      if (isNaN(replyIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 답글 ID입니다.',
        });
      }

      const project = await this.service.deleteCommentReply(replyIdNum);

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('답글 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: '답글 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  // ==================== 초기 이미지 관련 엔드포인트 ====================

  /**
   * 프로젝트 초기 이미지 추가
   * POST /api/projects/:id/initial-images
   */
  uploadInitialImages = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const projectId = parseInt(id, 10);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 프로젝트 ID입니다.',
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const imageFiles = files.images || [];

      if (imageFiles.length === 0) {
        return res.status(400).json({
          success: false,
          error: '이미지 파일이 필요합니다.',
        });
      }

      // 기존 초기 이미지 개수 확인하여 다음 번호 계산
      let currentImageNumber = await getNextProjectInitialImageNumber(projectId);

      const uploadedImages = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const ext = path.extname(file.originalname);
        
        const relativePath = await moveImageToProjectInitialFolder(
          file.path,
          projectId,
          currentImageNumber + i,
          ext
        );
        
        const imageUrl = getProjectImageUrl(relativePath);

        const initialImage = await this.service.createInitialImage({
          project_id: projectId,
          image_url: imageUrl,
          display_order: currentImageNumber + i - 1,
        });

        uploadedImages.push(initialImage);
      }

      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('초기 이미지 업로드 오류:', error);
      res.status(500).json({
        success: false,
        error: '초기 이미지 업로드 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 초기 이미지 삭제
   * DELETE /api/projects/:id/initial-images/:imageId
   */
  deleteInitialImage = async (req: Request, res: Response) => {
    try {
      const { id, imageId } = req.params;
      const projectId = parseInt(id, 10);
      const imageIdNum = parseInt(imageId, 10);

      if (isNaN(projectId) || isNaN(imageIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      await this.service.deleteInitialImage(imageIdNum);

      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('초기 이미지 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: '초기 이미지 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  // ==================== 참고 링크 관련 엔드포인트 ====================

  /**
   * 프로젝트 참고 링크 추가
   * POST /api/projects/:id/reference-links
   */
  createReferenceLink = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const projectId = parseInt(id, 10);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 프로젝트 ID입니다.',
        });
      }

      const data: CreateProjectReferenceLinkDTO = {
        project_id: projectId,
        title: req.body.title || null,
        url: req.body.url,
        display_order: req.body.display_order || 0,
      };

      if (!data.url) {
        return res.status(400).json({
          success: false,
          error: 'URL은 필수입니다.',
        });
      }

      // URL 검증
      try {
        new URL(data.url);
      } catch {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 URL 형식입니다.',
        });
      }

      const link = await this.service.createReferenceLink(data);

      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('참고 링크 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: '참고 링크 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 참고 링크 수정
   * PUT /api/projects/:id/reference-links/:linkId
   */
  updateReferenceLink = async (req: Request, res: Response) => {
    try {
      const { id, linkId } = req.params;
      const projectId = parseInt(id, 10);
      const linkIdNum = parseInt(linkId, 10);

      if (isNaN(projectId) || isNaN(linkIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      const data: UpdateProjectReferenceLinkDTO = {
        title: req.body.title !== undefined ? req.body.title : undefined,
        url: req.body.url,
        display_order: req.body.display_order !== undefined ? req.body.display_order : undefined,
      };

      // URL 검증 (제공된 경우)
      if (data.url) {
        try {
          new URL(data.url);
        } catch {
          return res.status(400).json({
            success: false,
            error: '유효하지 않은 URL 형식입니다.',
          });
        }
      }

      await this.service.updateReferenceLink(linkIdNum, data);

      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('참고 링크 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: '참고 링크 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 프로젝트 참고 링크 삭제
   * DELETE /api/projects/:id/reference-links/:linkId
   */
  deleteReferenceLink = async (req: Request, res: Response) => {
    try {
      const { id, linkId } = req.params;
      const projectId = parseInt(id, 10);
      const linkIdNum = parseInt(linkId, 10);

      if (isNaN(projectId) || isNaN(linkIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      await this.service.deleteReferenceLink(linkIdNum);

      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('참고 링크 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: '참고 링크 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  // ==================== 이미지 확정 관련 엔드포인트 ====================

  /**
   * 이미지 확정
   * POST /api/projects/:id/entries/:entryId/images/:imageId/confirm
   */
  confirmImage = async (req: Request, res: Response) => {
    try {
      const { id, imageId } = req.params;
      const projectId = parseInt(id, 10);
      const imageIdNum = parseInt(imageId, 10);

      if (isNaN(projectId) || isNaN(imageIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      await this.service.confirmImage(imageIdNum, projectId);

      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('이미지 확정 오류:', error);
      res.status(500).json({
        success: false,
        error: '이미지 확정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 이미지 확정 해제
   * DELETE /api/projects/:id/entries/:entryId/images/:imageId/confirm
   */
  unconfirmImage = async (req: Request, res: Response) => {
    try {
      const { id, imageId } = req.params;
      const projectId = parseInt(id, 10);
      const imageIdNum = parseInt(imageId, 10);

      if (isNaN(projectId) || isNaN(imageIdNum)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 ID입니다.',
        });
      }

      await this.service.unconfirmImage(imageIdNum, projectId);

      const project = await this.service.getProjectById(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('이미지 확정 해제 오류:', error);
      res.status(500).json({
        success: false,
        error: '이미지 확정 해제 중 오류가 발생했습니다.',
      });
    }
  };
}

