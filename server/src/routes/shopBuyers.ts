import { Router } from 'express';
import { ShopBuyerController } from '../controllers/shopBuyerController.js';
import { shopBuyerImageUpload } from '../utils/upload.js';

const router = Router();
const controller = new ShopBuyerController();

router.get('/', controller.getAll);
router.post('/', controller.create);
router.post(
  '/:id/business-registration-image',
  shopBuyerImageUpload.single('image'),
  controller.uploadBusinessRegistrationImage
);
router.delete('/:id/business-registration-image', controller.deleteBusinessRegistrationImage);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
