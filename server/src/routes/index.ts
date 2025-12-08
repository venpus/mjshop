import { Router } from 'express';

const router = Router();

// API 라우트들을 여기에 추가
// 예: router.use('/products', productRoutes);

router.get('/', (req, res) => {
  res.json({ 
    message: '쇼핑몰 관리자 API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      api: '/api'
    }
  });
});

export default router;
