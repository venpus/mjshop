import { Router } from 'express';
import adminAccountRoutes from './adminAccounts.js';
import productRoutes from './products.js';
import purchaseOrderRoutes from './purchaseOrders.js';
import materialRoutes from './materials.js';
import logisticsOptionsRoutes from './logisticsOptions.js';
import packingListRoutes from './packingLists.js';
import projectRoutes from './projects.js';

const router = Router();

// API 라우트들을 여기에 추가
router.use('/admin-accounts', adminAccountRoutes);
router.use('/products', productRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/materials', materialRoutes);
router.use('/logistics-options', logisticsOptionsRoutes);
router.use('/packing-lists', packingListRoutes);
router.use('/projects', projectRoutes);

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
