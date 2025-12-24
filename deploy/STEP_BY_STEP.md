# 단계별 배포 가이드

AWS Lightsail Ubuntu LTS 24 서버에 배포하는 상세 가이드입니다.

## 📋 사전 준비

1. AWS Lightsail 인스턴스 생성 완료
2. 도메인 `wkshop.kr`이 인스턴스 IP로 연결됨
3. SSH 키 준비 완료

## 🚀 배포 단계

### 1단계: 서버 접속

```bash
# 방법 1: Lightsail 콘솔에서 브라우저로 접속
# 방법 2: SSH 키 사용
ssh -i your-key.pem ubuntu@wkshop.kr
```

### 2단계: 서버 초기 설정

서버에 접속한 후:

```bash
# 배포 파일들을 서버에 업로드 (로컬에서 실행)
scp -i your-key.pem -r deploy/ ubuntu@wkshop.kr:~/

# 서버에서 실행
cd ~/deploy
chmod +x setup.sh
sudo ./setup.sh
```

또는 수동으로:

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지
sudo apt install -y curl wget git build-essential

# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # 확인

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
sudo mysql < ~/deploy/database-setup.sql

# 비밀번호 변경이 필요한 경우
sudo mysql -u root -p
```

MariaDB에서:
```sql
ALTER USER 'wkshop_user'@'localhost' IDENTIFIED BY 'your_secure_password';
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

**방법 2: SCP로 업로드 (로컬에서 실행)**

```bash
# 전체 프로젝트 업로드
scp -i your-key.pem -r client server ubuntu@wkshop.kr:/var/www/wkshop/
```

**방법 3: rsync 사용 (로컬에서 실행)**

```bash
rsync -avz -e "ssh -i your-key.pem" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'build' \
  client/ server/ deploy/ \
  ubuntu@wkshop.kr:/var/www/wkshop/
```

### 5단계: 서버 애플리케이션 설정

```bash
cd /var/www/wkshop/server

# 의존성 설치
npm install --production

# 환경 변수 설정
cp ../deploy/env.production.example .env
nano .env  # 비밀번호 등 수정

# 빌드
npm run build

# PM2로 실행
pm2 start dist/index.js --name wkshop-api
pm2 startup  # 시스템 재시작 시 자동 시작
pm2 save

# 로그 확인
pm2 logs wkshop-api
```

### 6단계: 클라이언트 빌드

```bash
cd /var/www/wkshop/client

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 빌드 확인
ls -la dist/
```

### 7단계: Nginx 설정

```bash
# Nginx 설정 파일 복사
sudo cp /var/www/wkshop/deploy/nginx.conf /etc/nginx/sites-available/wkshop

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/wkshop /etc/nginx/sites-enabled/

# 기본 설정 제거 (선택사항)
sudo rm -f /etc/nginx/sites-enabled/default

# 설정 파일 검증
sudo nginx -t

# Nginx 재시작
sudo systemctl reload nginx
```

### 8단계: 배포 확인

```bash
# 서버 상태 확인
pm2 status
pm2 logs wkshop-api --lines 20

# Nginx 상태 확인
sudo systemctl status nginx

# 로컬에서 API 테스트
curl http://localhost:3000/api/health

# 웹사이트 접속 테스트
curl http://localhost
```

브라우저에서 확인:
- ✅ http://wkshop.kr
- ✅ http://wkshop.kr/api/health
- ✅ http://wkshop.kr/api

## 🔄 업데이트 배포

코드 변경 후 재배포:

```bash
cd /var/www/wkshop
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## 📝 주요 명령어

### PM2 관리
```bash
pm2 list                    # 프로세스 목록
pm2 logs wkshop-api        # 로그 확인
pm2 restart wkshop-api     # 재시작
pm2 stop wkshop-api        # 중지
pm2 monit                  # 실시간 모니터링
```

### Nginx 관리
```bash
sudo systemctl status nginx    # 상태 확인
sudo systemctl restart nginx   # 재시작
sudo systemctl reload nginx    # 설정만 리로드
sudo nginx -t                  # 설정 파일 검증
sudo tail -f /var/log/nginx/wkshop-error.log  # 에러 로그
```

### 데이터베이스 관리
```bash
sudo systemctl status mariadb
sudo mysql -u wkshop_user -p wkshop_db
```

## 🐛 문제 해결

### 포트 충돌
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Nginx 502 오류
- PM2가 실행 중인지 확인: `pm2 status`
- 서버 로그 확인: `pm2 logs wkshop-api`
- 포트 확인: `netstat -tulpn | grep 3000`

### 권한 오류
```bash
sudo chown -R $USER:$USER /var/www/wkshop
sudo chmod -R 755 /var/www/wkshop
```

### 빌드 오류
```bash
# Node.js 버전 확인
node --version

# 캐시 정리 후 재설치
rm -rf node_modules package-lock.json
npm install
```

## 🔒 보안 체크리스트

- [ ] MariaDB root 비밀번호 변경
- [ ] 데이터베이스 사용자 강력한 비밀번호 설정
- [ ] .env 파일 권한 설정: `chmod 600 .env`
- [ ] SSH 키 기반 인증만 허용
- [ ] 불필요한 포트 닫기
- [ ] 정기적인 시스템 업데이트
- [ ] 로그 모니터링 설정

## 📊 모니터링

```bash
# 시스템 리소스 확인
htop

# 디스크 사용량
df -h

# 메모리 사용량
free -h

# 네트워크 연결 확인
netstat -tulpn
```

