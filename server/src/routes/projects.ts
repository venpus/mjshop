import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';
import { projectImageUpload } from '../utils/upload.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();
const controller = new ProjectController();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateUser);

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
  (req, res, next) => {
    // multer 에러 처리
    projectImageUpload.array('images', 50)(req, res, (err) => {
      if (err) {
        console.error('❌ [Multer 에러]:', err);
        return res.status(400).json({
          success: false,
          error: err.message || '파일 업로드 처리 중 오류가 발생했습니다.',
        });
      }
      next();
    });
  },
  controller.uploadEntryImages
);

// 프로젝트 항목 이미지 설명 업데이트
router.put('/:id/entries/:entryId/images/:imageId/description', controller.updateEntryImageDescription);

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

// 프로젝트 초기 이미지 추가
router.post(
  '/:id/initial-images',
  projectImageUpload.array('images', 50),
  controller.uploadInitialImages
);

// 프로젝트 초기 이미지 삭제
router.delete('/:id/initial-images/:imageId', controller.deleteInitialImage);

// 프로젝트 참고 링크 추가
router.post('/:id/reference-links', controller.createReferenceLink);

// 프로젝트 참고 링크 수정
router.put('/:id/reference-links/:linkId', controller.updateReferenceLink);

// 프로젝트 참고 링크 삭제
router.delete('/:id/reference-links/:linkId', controller.deleteReferenceLink);

// 이미지 확정
router.post('/:id/entries/:entryId/images/:imageId/confirm', controller.confirmImage);

// 이미지 확정 해제
router.delete('/:id/entries/:entryId/images/:imageId/confirm', controller.unconfirmImage);

export default router;

