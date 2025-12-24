import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(helmet()); // 보안 헤더 설정
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev')); // 로깅
app.use(express.json()); // JSON 파싱
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 본문 파싱

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
  console.error('Error:', err);
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
      console.error('❌ 데이터베이스 연결에 실패했습니다. 서버를 시작할 수 없습니다.');
      process.exit(1);
    }

    // 마이그레이션 실행
    const { Migrator } = await import('./database/migrator.js');
    const migrator = new Migrator();
    await migrator.migrate();

    // 서버 시작
    app.listen(PORT, () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

startServer();
