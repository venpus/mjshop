import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { accessLogMiddleware } from '../middleware/accessLogMiddleware.js';
import adminAccountRoutes from './adminAccounts.js';
import productRoutes from './products.js';
import purchaseOrderRoutes from './purchaseOrders.js';
import materialRoutes from './materials.js';
import logisticsOptionsRoutes from './logisticsOptions.js';
import packingListRoutes from './packingLists.js';
import projectRoutes from './projects.js';
import paymentRequestRoutes from './paymentRequests.js';
import permissionRoutes from './permissions.js';
import stockOutboundRoutes from './stockOutbound.js';
import qwenRoutes from './qwen.js';
import productCollabRoutes from './productCollab.js';
import manufacturingDocumentRoutes from './manufacturingDocuments.js';
import accessLogRoutes from './accessLogs.js';
import normalInvoiceRoutes from './normalInvoices.js';
import paymentMiscEntryRoutes from './paymentMiscEntries.js';

const router = Router();

// 요청에 X-User-Id가 있으면 req.user에 설정 (비용 입력 권한 등에서 사용)
router.use(authenticateUser);
// 로그인된 사용자 접속 로그 기록 (비동기, 응답 블로킹 안 함)
router.use(accessLogMiddleware);

// API 라우트들을 여기에 추가
router.use('/admin-accounts', adminAccountRoutes);
router.use('/access-logs', accessLogRoutes);
router.use('/products', productRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/materials', materialRoutes);
router.use('/logistics-options', logisticsOptionsRoutes);
router.use('/packing-lists', packingListRoutes);
router.use('/projects', projectRoutes);
router.use('/payment-requests', paymentRequestRoutes);
router.use('/permissions', permissionRoutes);
router.use('/stock-outbound', stockOutboundRoutes);
router.use('/qwen', qwenRoutes);
router.use('/product-collab', productCollabRoutes);
router.use('/manufacturing-documents', manufacturingDocumentRoutes);
router.use('/normal-invoices', normalInvoiceRoutes);
router.use('/payment-misc-entries', paymentMiscEntryRoutes);

router.get('/', (req, res) => {
  res.json({ 
    message: '쇼핑몰 관리자 API',
    version: '1.0.0',
      endpoints: {
        health: '/api/health',
        api: '/api',
        adminAccounts: '/api/admin-accounts',
        products: '/api/products',
        purchaseOrders: '/api/purchase-orders'
      }
  });
});

// Health check 엔드포인트
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '서버가 정상적으로 실행 중입니다.',
    timestamp: new Date().toISOString()
  });
});

export default router;
