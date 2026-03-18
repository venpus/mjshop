import { Router } from 'express';
import { PaymentMiscEntryController } from '../controllers/paymentMiscEntryController.js';
import { paymentMiscUpload } from '../utils/upload.js';

const router = Router();
const c = new PaymentMiscEntryController();

router.get('/summary', c.summary);
router.get('/', c.list);
router.post('/', c.create);
router.patch('/:id', c.update);
router.post('/:id/file', paymentMiscUpload.single('file'), c.uploadFile);
router.delete('/:id/file', c.removeFile);
router.delete('/:id', c.destroy);

export default router;
