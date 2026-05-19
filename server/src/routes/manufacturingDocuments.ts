import express from 'express';
import {
  listManufacturingDocuments,
  getByPurchaseOrderId,
  getManufacturingDocumentById,
  createManufacturingDocument,
  updateManufacturingDocument,
  deleteManufacturingDocument,
  uploadManufacturingDocument,
  downloadManufacturingDocument,
  uploadFinishedProductImage,
  uploadStepImages,
} from '../controllers/manufacturingDocumentController.js';
import { manufacturingDocumentFileUpload, manufacturingImageUpload } from '../utils/upload.js';

const router = express.Router();

router.get('/', listManufacturingDocuments);
router.get('/by-purchase-order/:purchaseOrderId', getByPurchaseOrderId);
router.post('/', createManufacturingDocument);
router.post('/upload', manufacturingDocumentFileUpload.single('document'), uploadManufacturingDocument);
router.get('/:id/download', downloadManufacturingDocument);
router.post('/:id/finished-product-image', manufacturingImageUpload.single('image'), uploadFinishedProductImage);
router.post('/:id/steps/:stepId/images', manufacturingImageUpload.array('images', 20), uploadStepImages);
router.get('/:id', getManufacturingDocumentById);
router.put('/:id', updateManufacturingDocument);
router.delete('/:id', deleteManufacturingDocument);

export default router;
