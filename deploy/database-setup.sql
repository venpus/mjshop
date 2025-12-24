-- MariaDB 데이터베이스 및 사용자 설정 스크립트
-- 사용법: sudo mysql < database-setup.sql
-- 또는: sudo mysql -u root -p < database-setup.sql

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS wkshop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 생성 (비밀번호는 실제 사용할 비밀번호로 변경하세요)
CREATE USER IF NOT EXISTS 'wkshop_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';

-- 권한 부여
GRANT ALL PRIVILEGES ON wkshop_db.* TO 'wkshop_user'@'localhost';

-- 권한 새로고침
FLUSH PRIVILEGES;

-- 확인
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'wkshop_user';

