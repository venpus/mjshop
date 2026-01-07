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
// CORS 설정 - 개발 환경에서는 여러 origin 허용
const allowedOrigins: (string | RegExp)[] = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : [
      'http://localhost:5173',  // 클라이언트 (Vite)
      'http://localhost:8081',  // Expo 웹 (기본 포트)
      'http://localhost:8082',  // Expo 웹 (다른 포트)
      'http://wkshop.kr',       // 상용 서버 (HTTP)
      'https://wkshop.kr',      // 상용 서버 (HTTPS)
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,  // 로컬 네트워크 IP (모든 포트)
      /^http:\/\/localhost:\d+$/,  // localhost (모든 포트)
    ];

app.use(cors({
  origin: (origin, callback) => {
    // origin이 없는 경우 (같은 origin 요청, Postman 등) 허용
    if (!origin) {
      return callback(null, true);
    }
    
    // 허용된 origin 체크
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // 개발 환경에서는 로그만 남기고 허용 (디버깅용)
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`⚠️ CORS 경고: 허용되지 않은 origin: ${origin}`);
        callback(null, true); // 개발 환경에서는 허용
      } else {
        // 프로덕션 환경에서도 로그를 남기고 에러 반환
        logger.error(`🚫 CORS 차단: 허용되지 않은 origin: ${origin}`);
        logger.error(`허용된 origin 목록:`, allowedOrigins);
        callback(new Error(`CORS 정책에 의해 차단되었습니다: ${origin}`));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
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
