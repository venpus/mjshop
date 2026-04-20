import { Router } from 'express';
import * as sweetTrackerController from '../controllers/sweetTrackerController.js';

const router = Router();

router.get('/invoice-cache', sweetTrackerController.getCachedInvoiceList);
router.get('/packing-list-preview', sweetTrackerController.getPackingListPreviewByToken);
router.get(
  '/invoice-cache/related-by-packing-code',
  sweetTrackerController.getRelatedInvoicesByPackingListCode
);
router.patch(
  '/invoice-cache/packing-codes',
  sweetTrackerController.patchInvoicePackingListCodes
);
router.post(
  '/invoice-cache/refresh-all-not-complete',
  sweetTrackerController.postRefreshAllNotCompleteCached
);
router.post('/bulk-delivery-completed', sweetTrackerController.postBulkDeliveryCompleted);

export default router;
