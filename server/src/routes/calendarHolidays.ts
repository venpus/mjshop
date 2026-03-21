import { Router } from 'express';
import * as calendarHolidayController from '../controllers/calendarHolidayController.js';

const router = Router();

router.get('/', calendarHolidayController.list);
router.post('/', calendarHolidayController.create);
router.put('/:id', calendarHolidayController.update);
router.delete('/:id', calendarHolidayController.remove);

export default router;
