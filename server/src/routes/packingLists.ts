import { Router } from 'express';
import { PackingListController, packingListImageUpload } from '../controllers/packingListController.js';

const router = Router();
const controller = new PackingListController();

// 모든 패킹리스트 조회
router.get('/', controller.getAllPackingLists);

// 코드로 패킹리스트 조회
router.get('/code/:code', controller.getPackingListByCode);

// ID로 패킹리스트 조회
router.get('/:id', controller.getPackingListById);

// 패킹리스트 생성
router.post('/', controller.createPackingList);

// 패킹리스트 수정
router.put('/:id', controller.updatePackingList);

// A레벨 관리자 비용 지불 완료 상태 업데이트
router.put('/:id/admin-cost-paid', controller.updateAdminCostPaid);

// 패킹리스트 삭제
router.delete('/:id', controller.deletePackingList);

// 패킹리스트 아이템 생성
router.post('/:id/items', controller.createItem);

// 패킹리스트 아이템 수정
router.put('/items/:itemId', controller.updateItem);

// 패킹리스트 아이템 삭제
router.delete('/items/:itemId', controller.deleteItem);

// 내륙송장 생성
router.post('/:id/invoices', controller.createDomesticInvoice);

// 내륙송장 수정
router.put('/invoices/:invoiceId', controller.updateDomesticInvoice);

// 내륙송장 삭제
router.delete('/invoices/:invoiceId', controller.deleteDomesticInvoice);

// 내륙송장 이미지 업로드
router.post('/:id/invoices/:invoiceId/images', packingListImageUpload.array('images', 10), controller.uploadInvoiceImages);

// 내륙송장 이미지 삭제
router.delete('/invoices/images/:imageId', controller.deleteInvoiceImage);

// 한국도착일 생성
router.post('/items/:itemId/korea-arrivals', controller.createKoreaArrival);

// 한국도착일 수정
router.put('/korea-arrivals/:arrivalId', controller.updateKoreaArrival);

// 한국도착일 삭제
router.delete('/korea-arrivals/:arrivalId', controller.deleteKoreaArrival);

// 발주별 배송비 집계 조회
router.get('/shipping-cost/:purchaseOrderId', controller.getShippingCostByPurchaseOrder);

// 발주별 배송 수량 집계 조회
router.get('/shipping-summary/:purchaseOrderId', controller.getShippingSummaryByPurchaseOrder);

export default router;

