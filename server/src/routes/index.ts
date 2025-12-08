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

// Health check 엔드포인트
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '서버가 정상적으로 실행 중입니다.',
    timestamp: new Date().toISOString()
  });
});

export default router;
