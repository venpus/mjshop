import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { ProductCollabController } from '../controllers/productCollabController.js';
import { productCollabImageUpload, productCollabFileUpload } from '../utils/upload.js';

const router = Router();
const controller = new ProductCollabController();

router.use(authenticateUser);

router.get('/dashboard', controller.getDashboard);
router.get('/mentionable-users', controller.getMentionableUsers);
router.get('/products', controller.getActiveProducts);
router.get('/products/counts', controller.getProductCounts);
router.get('/products/archive', controller.getCompletedProducts);
router.get('/products/cancelled', controller.getCancelledProducts);
router.get('/products/:productId/download', controller.downloadAttachment);
router.post(
  '/products/:id/upload',
  (req, res, next) => {
    productCollabFileUpload.array('images', 20)(req, res, (err: unknown) => {
      if (err) {
        const code = (err as { code?: string }).code;
        const message = (err as Error).message;
        if (code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ success: false, error: '파일 크기는 20MB 이하여야 합니다.' });
        }
        if (code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ success: false, error: '최대 20개까지 업로드할 수 있습니다.' });
        }
        if (code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ success: false, error: '필드명은 images 로 보내주세요.' });
        }
        return res.status(400).json({ success: false, error: message || '파일 업로드 처리 중 오류가 발생했습니다.' });
      }
      next();
    });
  },
  controller.uploadProductImages
);
router.get('/products/:id', controller.getProductById);
router.post('/products', controller.createProduct);
router.put('/products/:id', controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);
router.post('/products/:productId/messages', controller.createMessage);
router.put('/products/:productId/messages/:messageId', controller.updateMessage);
router.delete('/products/:productId/messages/:messageId', controller.deleteMessage);
router.put('/products/:productId/tasks/:taskId/complete', controller.completeTask);
router.post('/products/:id/images', controller.addProductImage);
router.put('/products/:id/images/:imageId/set-final', controller.setMainImage);
router.delete('/products/:id/images/:imageId', controller.deleteProductImage);

export default router;
