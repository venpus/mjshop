import { Router } from 'express';
import { StockInboundController } from '../controllers/stockInboundController.js';

const router = Router();
const controller = new StockInboundController();

router.get('/', controller.getAllItems);
router.get('/by-group/:groupKey', controller.getItemByGroupKey);
router.get('/available-purchase-orders', controller.getAvailablePurchaseOrders);
router.post('/batch', controller.addBatch);

export default router;
