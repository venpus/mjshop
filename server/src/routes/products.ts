import { Router } from 'express';
import { ProductController } from '../controllers/productController.js';
import { upload } from '../utils/upload.js';

const router = Router();
const controller = new ProductController();

// 모든 상품 조회
router.get('/', controller.getAllProducts);

// 공급상 검색 (자동완성용)
router.get('/suppliers/search', controller.searchSuppliers);

// ID로 상품 조회
router.get('/:id', controller.getProductById);

// 상품 생성 (이미지 업로드 포함)
router.post(
  '/',
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'mainImage', maxCount: 1 },
    { name: 'infoImages', maxCount: 20 },
  ]),
  controller.createProduct
);

// 상품 수정 (이미지 업로드 포함)
router.put(
  '/:id',
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'mainImage', maxCount: 1 },
    { name: 'infoImages', maxCount: 20 },
  ]),
  controller.updateProduct
);

// 상품 광고문구 저장
router.patch('/:id/ad-copy', controller.updateProductAdCopy);

// 상품 메모 저장
router.patch('/:id/memo', controller.updateProductMemo);

// 상품 메인 이미지 변경
router.patch('/:id/main-image', controller.updateProductMainImage);

// 상품 구분 태그 변경
router.patch('/:id/product-kind', controller.updateProductKind);

// 상품 삭제
router.delete('/:id', controller.deleteProduct);

export default router;
