import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'wkshop_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wkshop_db',
  charset: 'utf8mb4',
  connectionLimit: 10,
};
