import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'wkshop_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wk_megafactory',
  charset: 'utf8mb4',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
};

// 데이터베이스 연결 풀 생성
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 연결 테스트 함수
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 데이터베이스 연결 성공');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    return false;
  }
}

