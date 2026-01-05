import { Router } from 'express';
import { PaymentRequestController } from '../controllers/paymentRequestController.js';

const router = Router();
const controller = new PaymentRequestController();

// 결제내역 조회 (발주관리 + 패킹리스트 통합)
router.get('/history', controller.getPaymentHistory);

// 모든 지급요청 조회
router.get('/', controller.getAllPaymentRequests);

// 출처 정보로 지급요청 조회
router.get('/source/:sourceType/:sourceId', controller.getPaymentRequestsBySource);

// ID로 지급요청 조회
router.get('/:id', controller.getPaymentRequestById);

// 지급요청 생성
router.post('/', controller.createPaymentRequest);

// 지급요청 수정
router.put('/:id', controller.updatePaymentRequest);

// 지급완료 처리
router.put('/:id/complete', controller.completePaymentRequest);

// 일괄 지급완료 처리
router.post('/batch-complete', controller.batchCompletePaymentRequests);

// 지급해제 처리
router.put('/:id/revert', controller.revertPaymentRequest);

// 일괄 지급해제 처리
router.post('/batch-revert', controller.batchRevertPaymentRequests);

// 지급요청 삭제
router.delete('/:id', controller.deletePaymentRequest);

export default router;

