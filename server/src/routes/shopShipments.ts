import { Router } from 'express';
import { ShopShipmentController } from '../controllers/shopShipmentController.js';

const router = Router();
const controller = new ShopShipmentController();

router.get('/rows', controller.listRows);
router.get('/batches', controller.listBatches);
router.get('/assigned-line-ids', controller.listAssignedLineIds);
router.post('/batches', controller.createBatch);
router.patch('/batches/:id', controller.updateBatch);
router.delete('/batches/:id', controller.deleteBatch);
router.post('/shipments/:id/tracking-lookup', controller.lookupTracking);
router.patch('/:id', controller.updateShipment);
router.delete('/:id', controller.deleteShipment);

export default router;
