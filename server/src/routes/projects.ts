import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';
import { projectImageUpload } from '../utils/upload.js';

const router = Router();
const controller = new ProjectController();

// 모든 프로젝트 조회
router.get('/', controller.getAllProjects);

// ID로 프로젝트 조회
router.get('/:id', controller.getProjectById);

// 프로젝트 생성
router.post('/', controller.createProject);

// 프로젝트 수정
router.put('/:id', controller.updateProject);

// 프로젝트 삭제
router.delete('/:id', controller.deleteProject);

// 프로젝트 항목 생성 (이미지 업로드 포함)
router.post(
  '/:id/entries',
  projectImageUpload.fields([
    { name: 'images', maxCount: 50 },
  ]),
  controller.createEntry
);

// 프로젝트 항목 수정
router.put('/:id/entries/:entryId', controller.updateEntry);

// 프로젝트 항목 삭제
router.delete('/:id/entries/:entryId', controller.deleteEntry);

// 프로젝트 항목 이미지 추가
router.post(
  '/:id/entries/:entryId/images',
  projectImageUpload.array('images', 50),
  controller.uploadEntryImages
);

// 프로젝트 항목 이미지 삭제
router.delete('/:id/entries/:entryId/images/:imageId', controller.deleteEntryImage);

// 이미지 반응 생성/수정
router.post('/:id/entries/:entryId/images/:imageId/reactions', controller.upsertImageReaction);

// 댓글 생성
router.post('/:id/entries/:entryId/comments', controller.createComment);

// 댓글 삭제
router.delete('/:id/entries/:entryId/comments/:commentId', controller.deleteComment);

// 답글 생성
router.post('/:id/entries/:entryId/comments/:commentId/replies', controller.createCommentReply);

// 답글 삭제
router.delete('/:id/entries/:entryId/comments/:commentId/replies/:replyId', controller.deleteCommentReply);

export default router;

