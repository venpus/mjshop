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
} from '../models/project.js';
import {
  projectImageUpload,
  moveImageToProjectFolder,
  getProjectImageUrl,
  deleteProjectFolder,
  deleteProjectEntryFolder,
  getNextProjectImageNumber,
} from '../utils/upload.js';
import path from 'path';

export class ProjectController {
  private service: ProjectService;

  constructor() {
    this.service = new ProjectService();
  }

  /**
   * 모든 프로젝트 조회
   * GET /api/projects
   */
  getAllProjects = async (req: Request, res: Response) => {
    try {
      const projects = await this.service.getAllProjects();
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
      let project = await this.service.createEntry(data);
      const entry = project.entries?.[project.entries.length - 1];
      if (!entry) {
        throw new Error('항목 생성 후 조회에 실패했습니다.');
      }

      // 이미지 업로드
      if (imageFiles.length > 0) {
        let currentImageNumber = await getNextProjectImageNumber(projectId, entry.id);

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const ext = path.extname(file.originalname);
          
          const relativePath = await moveImageToProjectFolder(
            file.path,
            projectId,
            entry.id,
            currentImageNumber + i,
            ext
          );
          
          const imageUrl = getProjectImageUrl(relativePath);

          // DB에 이미지 저장
          await this.service['repository'].createEntryImage(entry.id, imageUrl, currentImageNumber + i);
        }
      }

      // 프로젝트 다시 조회
      project = await this.service.getProjectById(projectId);
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

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const imageFiles = files.images || [];

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
        user_id: (req as any).user?.id || 'anonymous',
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
        user_id: (req as any).user?.id || 'anonymous',
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
        user_id: (req as any).user?.id || 'anonymous',
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
}

