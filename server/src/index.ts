import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger.js';

// 환경 변수 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // 보안 헤더 설정
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev')); // 로깅
app.use(express.json()); // JSON 파싱
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 본문 파싱

// 정적 파일 서빙 (업로드된 이미지)
// index.ts는 src/index.ts에 있으므로, ../uploads는 server/uploads를 가리킴
const uploadsPath = path.join(__dirname, '../uploads');
logger.debug('📁 정적 파일 서빙 경로:', uploadsPath);
logger.debug('📁 경로 존재 여부:', fs.existsSync(uploadsPath));
if (fs.existsSync(uploadsPath)) {
  const productsPath = path.join(uploadsPath, 'products');
  logger.debug('📁 products 폴더 존재 여부:', fs.existsSync(productsPath));
  if (fs.existsSync(productsPath)) {
    const dirs = fs.readdirSync(productsPath).filter(f => fs.statSync(path.join(productsPath, f)).isDirectory());
    logger.debug('📁 상품 폴더 목록:', dirs.slice(0, 5));
  }
}

// 정적 파일 서빙 (CORS 헤더는 cors 미들웨어에서 처리)
app.use('/uploads', express.static(uploadsPath));

// API 라우트 등록
import apiRoutes from './routes/index.js';
app.use('/api', apiRoutes);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `경로를 찾을 수 없습니다: ${req.path}`
  });
});

// 에러 핸들러
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : '서버 오류가 발생했습니다.'
  });
});

// 서버 시작
async function startServer() {
  try {
    // 데이터베이스 연결 테스트
    const { testConnection } = await import('./config/database.js');
    const connected = await testConnection();
    
    if (!connected) {
      logger.error('❌ 데이터베이스 연결에 실패했습니다. 서버를 시작할 수 없습니다.');
      process.exit(1);
    }

    // 마이그레이션 실행
    const { Migrator } = await import('./database/migrator.js');
    const migrator = new Migrator();
    await migrator.migrate();

    // 서버 시작
    app.listen(PORT, () => {
      logger.info(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      logger.info(`📍 Health check: http://localhost:${PORT}/api/health`);
      logger.debug(`📸 이미지 예시 URL: http://localhost:${PORT}/uploads/products/P001/001.png`);
    });
  } catch (error) {
    logger.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

startServer();
