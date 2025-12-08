# 배포 가이드 - AWS Lightsail Ubuntu LTS 24

## 📋 사전 준비사항

1. AWS Lightsail 인스턴스 생성 완료
2. 도메인 `wkshop.kr`이 Lightsail 인스턴스 IP로 연결됨
3. SSH 키 준비 완료

## 🚀 배포 단계

### 1단계: 서버 접속

```bash
# Lightsail 콘솔에서 SSH 키 다운로드 후
ssh -i your-key.pem ubuntu@wkshop.kr
# 또는
ssh ubuntu@<your-instance-ip>
```

### 2단계: 서버 초기 설정

```bash
# 배포 스크립트를 서버에 업로드한 후
chmod +x setup.sh
sudo ./setup.sh
```

또는 수동으로:

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git build-essential

# Node.js 20.x LTS 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 설치
sudo npm install -g pm2

# MariaDB 설치
sudo apt install -y mariadb-server mariadb-client
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Nginx 설치
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 방화벽 설정
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 3단계: 데이터베이스 설정

```bash
# 데이터베이스 및 사용자 생성
sudo mysql < database-setup.sql

# 또는 수동으로
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

### 4단계: 프로젝트 파일 업로드

**방법 1: Git 사용 (권장)**
```bash
# 프로젝트 디렉토리 생성
sudo mkdir -p /var/www/wkshop
sudo chown -R $USER:$USER /var/www/wkshop

# Git 저장소 클론
cd /var/www/wkshop
git clone <your-repo-url> .
```

**방법 2: SCP로 파일 업로드**
```bash
# 로컬에서 실행
scp -i your-key.pem -r client server deploy ubuntu@wkshop.kr:/var/www/wkshop/
```

**방법 3: rsync 사용**
```bash
# 로컬에서 실행
rsync -avz -e "ssh -i your-key.pem" --exclude 'node_modules' --exclude '.git' \
  client/ server/ ubuntu@wkshop.kr:/var/www/wkshop/
```

### 5단계: 서버 애플리케이션 설정

```bash
cd /var/www/wkshop/server

# 의존성 설치
npm install --production

# 환경 변수 설정
cp ../deploy/.env.production .env
nano .env  # 데이터베이스 비밀번호 등 수정

# 빌드
npm run build

# PM2로 실행
pm2 start dist/index.js --name wkshop-api
pm2 startup  # 시스템 재시작 시 자동 시작 설정
pm2 save
```

### 6단계: 클라이언트 빌드

```bash
cd /var/www/wkshop/client

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build
```

### 7단계: Nginx 설정

```bash
# Nginx 설정 파일 복사
sudo cp deploy/nginx.conf /etc/nginx/sites-available/wkshop

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/wkshop /etc/nginx/sites-enabled/

# 기본 설정 비활성화 (선택사항)
sudo rm /etc/nginx/sites-enabled/default

# 설정 파일 검증
sudo nginx -t

# Nginx 재시작
sudo systemctl reload nginx
```

### 8단계: 배포 확인

```bash
# 서버 상태 확인
pm2 status
pm2 logs wkshop-api

# Nginx 상태 확인
sudo systemctl status nginx

# 웹사이트 접속 테스트
curl http://localhost/api/health
```

브라우저에서 확인:
- http://wkshop.kr
- http://wkshop.kr/api/health

## 🔄 업데이트 배포

코드 변경 후 재배포:

```bash
cd /var/www/wkshop
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

또는 수동으로:

```bash
# 서버 재빌드
cd /var/www/wkshop/server
npm run build
pm2 restart wkshop-api

# 클라이언트 재빌드
cd /var/www/wkshop/client
npm run build

# Nginx 리로드
sudo systemctl reload nginx
```

## 🛠️ 유지보수 명령어

### PM2 관리
```bash
pm2 list                    # 프로세스 목록
pm2 logs wkshop-api        # 로그 확인
pm2 restart wkshop-api     # 재시작
pm2 stop wkshop-api        # 중지
pm2 delete wkshop-api      # 삭제
pm2 monit                  # 모니터링
```

### Nginx 관리
```bash
sudo systemctl status nginx    # 상태 확인
sudo systemctl restart nginx   # 재시작
sudo systemctl reload nginx    # 설정 리로드
sudo nginx -t                  # 설정 파일 검증
sudo tail -f /var/log/nginx/wkshop-error.log  # 에러 로그
```

### MariaDB 관리
```bash
sudo systemctl status mariadb   # 상태 확인
sudo systemctl restart mariadb # 재시작
sudo mysql -u wkshop_user -p wkshop_db  # 데이터베이스 접속
```

### 로그 확인
```bash
# PM2 로그
pm2 logs wkshop-api

# Nginx 로그
sudo tail -f /var/log/nginx/wkshop-access.log
sudo tail -f /var/log/nginx/wkshop-error.log

# 시스템 로그
sudo journalctl -u nginx -f
```

## 🔒 보안 체크리스트

- [ ] MariaDB root 비밀번호 설정 완료
- [ ] 데이터베이스 사용자 비밀번호 강력하게 설정
- [ ] .env 파일 권한 설정 (chmod 600)
- [ ] 방화벽 설정 확인
- [ ] 불필요한 포트 닫기
- [ ] 정기적인 시스템 업데이트
- [ ] PM2 로그 로테이션 설정
- [ ] 백업 전략 수립

## 📝 문제 해결

### 포트가 이미 사용 중인 경우
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Nginx 502 Bad Gateway 오류
- PM2가 실행 중인지 확인: `pm2 status`
- 서버 로그 확인: `pm2 logs wkshop-api`
- 포트 확인: `netstat -tulpn | grep 3000`

### 권한 오류
```bash
sudo chown -R $USER:$USER /var/www/wkshop
sudo chmod -R 755 /var/www/wkshop
```

## 🔄 HTTPS 설정 (추후)

HTTPS를 설정할 때는 Let's Encrypt를 사용하는 것을 권장합니다:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d wkshop.kr -d www.wkshop.kr
```
