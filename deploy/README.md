# 배포 가이드

AWS Lightsail Ubuntu LTS 24 서버에 애플리케이션을 배포하는 가이드입니다.

## 서버 사양
- OS: Ubuntu LTS 24
- 웹서버: Nginx
- 데이터베이스: MariaDB
- 도메인: http://wkshop.kr
- 프로토콜: HTTP (HTTPS는 추후 적용)

## 배포 전 준비사항

### 1. 서버 접속
```bash
# Lightsail 콘솔에서 SSH 키 다운로드 후
ssh -i your-key.pem ubuntu@wkshop.kr
```

### 2. 서버 초기 설정
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git build-essential
```

## 배포 단계

### 1단계: Node.js 설치
```bash
# Node.js 20.x LTS 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 설치 확인
node --version
npm --version
```

### 2단계: MariaDB 설치 및 설정
```bash
# MariaDB 설치
sudo apt install -y mariadb-server mariadb-client

# MariaDB 보안 설정
sudo mysql_secure_installation

# 데이터베이스 및 사용자 생성
sudo mysql -u root -p
```

MariaDB에서 실행:
```sql
CREATE DATABASE wkshop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wkshop_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON wkshop_db.* TO 'wkshop_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3단계: Nginx 설치 및 설정
```bash
# Nginx 설치
sudo apt install -y nginx

# Nginx 시작 및 자동 시작 설정
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4단계: 애플리케이션 배포
```bash
# 프로젝트 디렉토리 생성
sudo mkdir -p /var/www/wkshop
sudo chown -R $USER:$USER /var/www/wkshop

# Git으로 코드 클론 (또는 파일 업로드)
cd /var/www/wkshop
git clone <your-repo-url> .

# 또는 파일을 직접 업로드
```

### 5단계: PM2 설치 및 설정
```bash
# PM2 전역 설치
sudo npm install -g pm2

# 서버 애플리케이션 빌드 및 실행
cd /var/www/wkshop/server
npm install
npm run build
pm2 start dist/index.js --name wkshop-api

# PM2 자동 시작 설정
pm2 startup
pm2 save
```

### 6단계: 클라이언트 빌드
```bash
cd /var/www/wkshop/client
npm install
npm run build

# 빌드된 파일은 dist/ 폴더에 생성됩니다
```

### 7단계: Nginx 설정
`/etc/nginx/sites-available/wkshop` 파일을 생성하고 설정을 적용합니다.

### 8단계: 방화벽 설정
```bash
# UFW 방화벽 설정
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 배포 후 확인

1. 서버 상태 확인: `pm2 status`
2. Nginx 상태 확인: `sudo systemctl status nginx`
3. MariaDB 상태 확인: `sudo systemctl status mariadb`
4. 웹사이트 접속: http://wkshop.kr

## 유용한 명령어

```bash
# PM2 관리
pm2 list              # 프로세스 목록
pm2 logs wkshop-api   # 로그 확인
pm2 restart wkshop-api # 재시작
pm2 stop wkshop-api   # 중지

# Nginx 관리
sudo systemctl restart nginx
sudo nginx -t         # 설정 파일 검증

# MariaDB 관리
sudo systemctl restart mariadb
sudo mysql -u wkshop_user -p wkshop_db
```
