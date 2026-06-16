import { Router } from 'express';
import { ShopSalesSettlementLedgerController } from '../controllers/shopSalesSettlementLedgerController.js';

const router = Router();
const controller = new ShopSalesSettlementLedgerController();

router.get('/summary', controller.summary);
router.get('/', controller.list);
router.post('/', controller.create);
router.delete('/:id', controller.destroy);

export default router;
