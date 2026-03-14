import express from 'express';
import {
  listManufacturingDocuments,
  getByPurchaseOrderId,
  getManufacturingDocumentById,
  deleteManufacturingDocument,
  uploadManufacturingDocument,
  downloadManufacturingDocument,
} from '../controllers/manufacturingDocumentController.js';
import { manufacturingDocumentFileUpload } from '../utils/upload.js';

const router = express.Router();

router.get('/', listManufacturingDocuments);
router.get('/by-purchase-order/:purchaseOrderId', getByPurchaseOrderId);
router.post('/upload', manufacturingDocumentFileUpload.single('document'), uploadManufacturingDocument);
router.get('/:id/download', downloadManufacturingDocument);
router.get('/:id', getManufacturingDocumentById);
router.delete('/:id', deleteManufacturingDocument);

export default router;
