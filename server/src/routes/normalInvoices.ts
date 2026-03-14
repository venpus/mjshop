import express from 'express';
import { normalInvoiceFileUpload } from '../utils/upload.js';
import {
  listNormalInvoices,
  getNormalInvoiceById,
  createNormalInvoice,
  updateNormalInvoice,
  deleteNormalInvoice,
} from '../controllers/normalInvoiceController.js';

const router = express.Router();
const uploadFields = normalInvoiceFileUpload.fields([
  { name: 'invoice', maxCount: 1 },
  { name: 'photos', maxCount: 20 },
]);

router.get('/', listNormalInvoices);
router.get('/:id', getNormalInvoiceById);
router.post('/', uploadFields, createNormalInvoice);
router.put('/:id', uploadFields, updateNormalInvoice);
router.delete('/:id', deleteNormalInvoice);

export default router;
