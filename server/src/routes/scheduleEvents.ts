import { Router } from 'express';
import * as scheduleEventController from '../controllers/scheduleEventController.js';

const router = Router();

router.get('/', scheduleEventController.list);
router.post('/', scheduleEventController.create);
router.put('/:id', scheduleEventController.update);
router.delete('/:id', scheduleEventController.remove);

export default router;
