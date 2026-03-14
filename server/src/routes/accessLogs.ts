import { Router } from 'express';
import * as accessLogController from '../controllers/accessLogController.js';

const router = Router();

router.get('/', accessLogController.list);
router.delete('/older-than', accessLogController.deleteOlderThan);

export default router;
