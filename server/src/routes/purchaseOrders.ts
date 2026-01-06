import express from 'express';
import { PurchaseOrderController } from '../controllers/purchaseOrderController.js';
import { poImageUpload } from '../utils/upload.js';

const router = express.Router();
const purchaseOrderController = new PurchaseOrderController();

// 발주 목록 조회
router.get('/', purchaseOrderController.getAllPurchaseOrders);

// 미출고 수량이 있는 발주 목록 조회
router.get('/unshipped', purchaseOrderController.getPurchaseOrdersWithUnshipped);

// 발주 상세 조회
router.get('/:id', purchaseOrderController.getPurchaseOrderById);

// 발주 생성
router.post('/', purchaseOrderController.createPurchaseOrder);

// 발주 수정
router.put('/:id', purchaseOrderController.updatePurchaseOrder);

// A레벨 관리자 비용 지불 완료 상태 업데이트
router.put('/:id/admin-cost-paid', purchaseOrderController.updateAdminCostPaid);

// 발주 재주문
router.post('/:id/reorder', purchaseOrderController.reorderPurchaseOrder);

// 일괄 처리
router.post('/batch/confirm', purchaseOrderController.batchConfirmPurchaseOrders);
router.post('/batch/unconfirm', purchaseOrderController.batchUnconfirmPurchaseOrders);
router.delete('/batch/delete', purchaseOrderController.batchDeletePurchaseOrders);

// 발주 삭제
router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

// 비용 항목 관련
router.get('/:id/cost-items', purchaseOrderController.getCostItems);
router.put('/:id/cost-items', purchaseOrderController.saveCostItems);

// 업체 출고 항목 관련
router.get('/:id/factory-shipments', purchaseOrderController.getFactoryShipments);
router.put('/:id/factory-shipments', purchaseOrderController.saveFactoryShipments);

// 반품/교환 항목 관련
router.get('/:id/return-exchanges', purchaseOrderController.getReturnExchanges);
router.put('/:id/return-exchanges', purchaseOrderController.saveReturnExchanges);

// 작업 항목 관련
router.get('/:id/work-items', purchaseOrderController.getWorkItems);
router.put('/:id/work-items', purchaseOrderController.saveWorkItems);

// 배송 세트 관련
router.get('/:id/delivery-sets', purchaseOrderController.getDeliverySets);
router.put('/:id/delivery-sets', purchaseOrderController.saveDeliverySets);

// 이미지 관련
router.get('/:id/images/:type', purchaseOrderController.getImages);
router.post('/:id/images/:type/:relatedId', poImageUpload.array('images', 10), purchaseOrderController.uploadImages);
router.delete('/images/:imageId', purchaseOrderController.deleteImage);

// 메인 이미지 업로드
router.post('/:id/main-image', poImageUpload.single('mainImage'), purchaseOrderController.uploadMainImage);

// 메모 관련
router.get('/:id/memos', purchaseOrderController.getMemos);
router.post('/:id/memos', purchaseOrderController.addMemo);
router.delete('/:id/memos/:memoId', purchaseOrderController.deleteMemo);
router.post('/:id/memos/:memoId/replies', purchaseOrderController.addMemoReply);
router.delete('/:id/memos/:memoId/replies/:replyId', purchaseOrderController.deleteMemoReply);

export default router;

