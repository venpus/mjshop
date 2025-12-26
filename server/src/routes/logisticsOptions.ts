import { Router } from 'express';
import { LogisticsOptionsController } from '../controllers/logisticsOptionsController.js';

const router = Router();
const controller = new LogisticsOptionsController();

// 모든 내륙운송회사 조회
router.get('/inland-companies', controller.getAllInlandCompanies);

// 모든 도착 창고 조회
router.get('/warehouses', controller.getAllWarehouses);

export default router;

