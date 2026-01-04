import { Router } from 'express';
import { StockOutboundController } from '../controllers/stockOutboundController.js';

const router = Router();
const controller = new StockOutboundController();

// groupKey로 출고 기록 목록 조회
router.get('/:groupKey', controller.getRecordsByGroupKey);

// 출고 기록 생성
router.post('/', controller.createRecord);

// 출고 기록 수정
router.put('/:id', controller.updateRecord);

// 출고 기록 삭제
router.delete('/:id', controller.deleteRecord);

export default router;

