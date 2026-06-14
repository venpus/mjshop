import { Router } from 'express';
import { ShopOrderController } from '../controllers/shopOrderController.js';
import { shopOrderImageUpload } from '../utils/upload.js';

const router = Router();
const controller = new ShopOrderController();

router.get('/', controller.getAllOrders);
router.post('/bulk/statements', controller.createBulkStatements);
router.post('/from-inbound', controller.createFromInbound);
router.post('/:id/lines', controller.addOrderLine);
router.delete('/:id/lines/:lineId', controller.deleteOrderLine);
router.patch('/:id/lines/:lineId/cny-exchange-rate', controller.updateLineCnyExchangeRate);
router.patch('/:id/lines/:lineId/shipment-box-count', controller.updateLineShipmentBoxCount);
router.patch('/:id/lines/:lineId/settlement-payment', controller.updateLineSettlementPayment);
router.put('/:id/detail', controller.syncOrderDetail);
router.post('/:id/lines/:lineId/statement', controller.createStatement);
router.get('/:id/lines/:lineId/statement/preview', controller.getStatementPreview);
router.get('/:id/lines/:lineId/statement/download', controller.downloadStatement);
router.post(
  '/:id/lines/:lineId/payment-proof',
  shopOrderImageUpload.single('image'),
  controller.uploadPaymentProof
);
router.delete('/:id/lines/:lineId/payment-proof', controller.deletePaymentProof);
router.get('/:id', controller.getOrderById);
router.put('/:id', controller.updateOrder);

export default router;
