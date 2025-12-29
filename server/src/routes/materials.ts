import { Router } from 'express';
import { MaterialController } from '../controllers/materialController.js';
import { materialImageUpload } from '../utils/upload.js';

const router = Router();
const controller = new MaterialController();

// 모든 부자재 조회
router.get('/', controller.getAllMaterials);

// ID로 부자재 조회
router.get('/:id', controller.getMaterialById);

// 부자재 생성 (이미지 업로드 포함)
router.post(
  '/',
  materialImageUpload.fields([
    { name: 'productImages', maxCount: 20 },
  ]),
  controller.createMaterial
);

// 부자재 수정
router.put('/:id', controller.updateMaterial);

// 부자재 테스트 이미지 업로드
router.post(
  '/:id/test-images',
  materialImageUpload.array('testImages', 20),
  controller.uploadTestImages
);

// 부자재 삭제
router.delete('/:id', controller.deleteMaterial);

// 테스트 이미지 메타데이터
router.get('/:id/test-images/metadata', controller.getTestImageMetadata);
router.put('/:id/test-images/:imageUrl/metadata', controller.updateTestImageMetadata);

// 입출고 기록 관련 라우트
router.get('/:id/inventory', controller.getInventoryTransactions);
router.post('/:id/inventory', controller.addInventoryTransaction);

export default router;

