# AWS Lightsail 배포 및 업데이트 가이드

## 목차
1. [개요](#개요)
2. [필수 준비사항](#필수-준비사항)
3. [초기 서버 설정](#초기-서버-설정)
4. [애플리케이션 배포](#애플리케이션-배포)
5. [데이터베이스 설정](#데이터베이스-설정)
6. [환경 변수 설정](#환경-변수-설정)
7. [애플리케이션 실행](#애플리케이션-실행)
8. [업데이트 절차](#업데이트-절차)
9. [백업 및 복구](#백업-및-복구)
10. [모니터링 및 로그](#모니터링-및-로그)
11. [문제 해결](#문제-해결)

---

## 개요

이 문서는 Node.js 기반의 풀스택 애플리케이션을 AWS Lightsail에 배포하고 관리하는 방법을 설명합니다.

### 애플리케이션 구조
- **클라이언트**: React + TypeScript + Vite (빌드된 정적 파일)
- **서버**: Node.js + Express + TypeScript
- **데이터베이스**: MariaDB
- **이미지 저장**: 로컬 파일 시스템 (`uploads/` 디렉토리)

---

## 필수 준비사항

### 1. AWS Lightsail 인스턴스 생성
- **OS**: Ubuntu 22.04 LTS 권장
- **플랜**: 애플리케이션 규모에 맞는 플랜 선택 (최소 512MB RAM 권장)
- **네트워크**: 고정 IP 할당 및 포트 열기 (HTTP: 80, 애플리케이션: 3000)
- **도메인**: wkshop.kr (HTTP 프로토콜 사용, HTTPS 미사용)

### 2. 필수 소프트웨어 설치
서버에 SSH 접속 후 다음 소프트웨어를 설치합니다:

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 설치 (LTS 버전)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MariaDB 설치
sudo apt install -y mariadb-server mariadb-client

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2

# Nginx 설치 (리버스 프록시)
sudo apt install -y nginx

# Git 설치
sudo apt install -g git

# 필수 빌드 도구
sudo apt install -y build-essential
```

### 3. 방화벽 설정
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 3000/tcp  # 애플리케이션 포트 (필요시)
# sudo ufw allow 3306/tcp  # MariaDB 포트 (외부 접속이 필요한 경우에만 활성화)
sudo ufw enable
```

---

## 초기 서버 설정

### 1. 사용자 및 디렉토리 생성
```bash
# 애플리케이션 전용 사용자 생성
sudo useradd -m -s /bin/bash wkadmin
sudo mkdir -p /home/wkadmin/app
sudo chown -R wkadmin:wkadmin /home/wkadmin/app

# 업로드 디렉토리 생성 (server 폴더 내부)
sudo mkdir -p /home/wkadmin/app/server/uploads
sudo chown -R wkadmin:wkadmin /home/wkadmin/app/server/uploads
```

### 2. MariaDB 설정
```bash
# MariaDB 보안 설정 (외부 접속 허용을 위한 옵션)
sudo mysql_secure_installation
# 다음 옵션들을 선택합니다:
# - Validate password plugin: n (간단한 비밀번호 정책 사용 시) 또는 y (강력한 비밀번호 정책 사용 시)
# - Change root password: y (새로운 root 비밀번호 설정)
# - Remove anonymous users: y (익명 사용자 제거)
# - Disallow root login remotely: n (root 원격 접속 허용)
# - Remove test database: y (테스트 데이터베이스 제거)
# - Reload privilege tables: y (권한 테이블 재로드)

# MariaDB 접속
sudo mysql -u root -p

# 데이터베이스 및 사용자 생성
CREATE DATABASE wk_megafactory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# wkadmin 사용자 생성 (localhost 및 외부 접속 모두 허용)
CREATE USER 'wkadmin'@'localhost' IDENTIFIED BY 'TianXian007!';
CREATE USER 'wkadmin'@'%' IDENTIFIED BY 'TianXian007!';
GRANT ALL PRIVILEGES ON wk_megafactory.* TO 'wkadmin'@'localhost';
GRANT ALL PRIVILEGES ON wk_megafactory.* TO 'wkadmin'@'%';

# root 사용자도 외부 접속 허용 (필요한 경우)
# CREATE USER 'root'@'%' IDENTIFIED BY 'root_비밀번호';
# GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

FLUSH PRIVILEGES;
EXIT;
```

### 3. MariaDB 외부 접속 설정
외부에서 접속할 수 있도록 MariaDB 설정을 변경합니다:

```bash
# MariaDB 설정 파일 편집
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf

# bind-address 라인을 찾아서 다음과 같이 수정:
# bind-address = 0.0.0.0  (모든 인터페이스에서 접속 허용)
# 또는 주석 처리: # bind-address = 127.0.0.1

# 설정 저장 후 MariaDB 재시작
sudo systemctl restart mariadb

# 방화벽에서 MariaDB 포트(3306) 열기 (선택사항, 외부 접속이 필요한 경우)
sudo ufw allow 3306/tcp
```

**보안 주의사항**: 
- 외부 접속을 허용할 경우 강력한 비밀번호를 사용해야 합니다.
- 가능하면 특정 IP 주소만 허용하도록 방화벽 규칙을 설정하는 것을 권장합니다.
- 프로덕션 환경에서는 VPN이나 SSH 터널을 통한 접속을 고려해보세요.

---

## 애플리케이션 배포

### 1. 코드 업로드
로컬 개발 환경에서:

```bash
# 프로젝트 루트에서
# 클라이언트 빌드
cd client
npm install
npm run build  # TypeScript 타입 체크 없이 빌드 (타입 체크가 필요한 경우: npm run build:check)
cd ..

# 서버 빌드 (TypeScript 컴파일)
cd server
npm install
npm run build

# 마이그레이션 파일 복사 (중요!)
mkdir -p dist/database/migrations
cp -r src/database/migrations/*.sql dist/database/migrations/

cd ..
```

### 2. 파일 전송
#### 방법 A: Git 사용 (권장)
```bash
# 서버에서
sudo su - wkadmin
cd /home/wkadmin/app
git clone [프로젝트_저장소_URL] .

# Git 소유권 오류 해결 (필요시)
# "fatal: detected dubious ownership in repository" 오류가 발생하는 경우:
git config --global --add safe.directory /home/wkadmin/app
# 또는 특정 디렉토리만:
git config --global --add safe.directory '*'
```

#### 방법 B: SCP 사용
```bash
# 로컬에서
scp -r client/dist server/dist server/package.json server/node_modules [wkadmin@서버IP]:/home/wkadmin/app/
```

#### 방법 C: ZIP 파일 전송
```bash
# 로컬에서 압축
tar -czf app.tar.gz client/dist server/dist server/package.json server/node_modules

# 전송
scp app.tar.gz wkadmin@서버IP:/home/wkadmin/app/

# 서버에서 압축 해제
cd /home/wkadmin/app
tar -xzf app.tar.gz
```

### 3. 프로젝트 구조
서버의 `/home/wkadmin/app` 디렉토리 구조:
```
/home/wkadmin/app/
├── client/
│   └── dist/          # 빌드된 클라이언트 파일
├── server/
│   ├── dist/          # 컴파일된 서버 코드
│   ├── node_modules/  # 서버 의존성
│   ├── uploads/       # 업로드된 이미지 파일
│   └── package.json   # 서버 패키지 정보
└── .env              # 환경 변수 (서버에서 생성)
```

---

## 데이터베이스 설정

### 1. 마이그레이션 실행
```bash
# 서버에서
cd /home/wkadmin/app/server
npm install  # 필요한 경우

# 마이그레이션 파일을 서버에 복사 (또는 Git에서 가져오기)
# server/src/database/migrations/ 디렉토리의 모든 SQL 파일 확인

# MariaDB 접속하여 마이그레이션 실행
mysql -u wkadmin -p wk_megafactory < server/src/database/migrations/001_create_xxx.sql
mysql -u wkadmin -p wk_megafactory < server/src/database/migrations/002_create_xxx.sql
# ... 모든 마이그레이션 파일 실행
```

**주의**: 마이그레이션 파일은 번호 순서대로 실행해야 합니다.

### 2. 초기 데이터 삽입 (필요시)
```bash
mysql -u wkadmin -p wk_megafactory < server/src/database/seeds/initial_data.sql
```

---

## 환경 변수 설정

### 1. 서버 환경 변수 (.env)
`/home/wkadmin/app/server/.env` 파일 생성:

```env
# 서버 설정
NODE_ENV=production
PORT=3000

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=wkadmin
DB_PASSWORD=TianXian007!
DB_NAME=wk_megafactory

# 세션 설정
SESSION_SECRET=048f27942d4835d469825a3814741b44

# 업로드 디렉토리
UPLOAD_DIR=/home/wkadmin/app/server/uploads

# CORS 설정 (프로덕션 도메인)
CORS_ORIGIN=http://wkshop.kr

# API URL (클라이언트가 접근할 서버 URL)
API_URL=http://wkshop.kr/api
SERVER_URL=http://wkshop.kr
```

### 2. 클라이언트 환경 변수
빌드 시 환경 변수 주입 (Vite):

```bash
# 로컬에서 빌드 시
cd client
VITE_API_URL=http://wkshop.kr/api \
VITE_SERVER_URL=http://wkshop.kr \
npm run build
```

또는 `.env.production` 파일 생성:
```env
VITE_API_URL=http://wkshop.kr/api
VITE_SERVER_URL=http://wkshop.kr
```

**중요**: 프로덕션 빌드 시 반드시 올바른 도메인으로 빌드해야 합니다. `localhost:3000`이 포함된 빌드는 프로덕션에서 작동하지 않습니다.

---

## 애플리케이션 실행

### 1. PM2를 사용한 프로세스 관리
```bash
# wkadmin로 전환
sudo su - wkadmin
cd /home/wkadmin/app/server

# PM2로 애플리케이션 시작
pm2 start dist/index.js --name "app-server" --env production

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

### 2. Nginx 설정 (리버스 프록시)
`/etc/nginx/sites-available/app` 파일 생성:

```nginx
server {
    listen 80;
    server_name wkshop.kr www.wkshop.kr;

    # 클라이언트 정적 파일
    location / {
        root /home/wkadmin/app/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 프록시
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 파일 업로드 크기 제한
        client_max_body_size 50M;
    }

    # 업로드된 이미지 제공
    location /uploads {
        alias /home/wkadmin/app/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

심볼릭 링크 생성 및 Nginx 재시작:
```bash
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
sudo nginx -t  # 설정 테스트
sudo systemctl restart nginx
```

**참고**: 이 문서는 HTTP 프로토콜만 사용하도록 설정되어 있습니다. HTTPS는 사용하지 않습니다.

---

## 업데이트 절차

### 1. 코드 업데이트 준비
로컬 개발 환경에서:

```bash
# 최신 코드 가져오기
git pull origin main

# 클라이언트 빌드
cd client
npm install  # 의존성 변경 시
npm run build
cd ..

# 서버 빌드
cd server
npm install  # 의존성 변경 시
npm run build
cd ..
```

### 2. 서버에 배포

#### 방법 A: Git 사용 (권장)
```bash
# 서버에서
sudo su - wkadmin
cd /home/wkadmin/app

# Git 소유권 오류 해결 (최초 1회 또는 오류 발생 시)
# "fatal: detected dubious ownership in repository" 오류가 발생하는 경우:
git config --global --add safe.directory /home/wkadmin/app

# 최신 코드 가져오기
git pull origin main

# 클라이언트 재빌드 (또는 이미 빌드된 파일 전송)
cd client
npm install  # 의존성 변경 시
npm run build  # TypeScript 타입 체크 없이 빌드 (타입 체크가 필요한 경우: npm run build:check)
cd ..

# 서버 재빌드
cd server
npm install  # 의존성 변경 시
npm run build
cd ..
```

#### 방법 B: 파일 직접 전송
```bash
# 로컬에서 빌드 후
scp -r client/dist wkadmin@서버IP:/home/wkadmin/app/client/
scp -r server/dist wkadmin@서버IP:/home/wkadmin/app/server/
```

### 3. 데이터베이스 마이그레이션 (필요시)
새로운 마이그레이션 파일이 있는 경우:

```bash
# 서버에서
cd /home/wkadmin/app/server

# 새로운 마이그레이션 파일 확인
ls -la src/database/migrations/

# 마이그레이션 실행
mysql -u wkadmin -p wk_megafactory < src/database/migrations/XXX_new_migration.sql
```

### 4. 애플리케이션 재시작
```bash
# PM2 재시작
pm2 restart app-server

# 또는 완전 재시작
pm2 stop app-server
pm2 start dist/index.js --name "app-server" --env production
```

### 5. 변경 사항 확인
```bash
# PM2 로그 확인
pm2 logs app-server

# Nginx 로그 확인 (필요시)
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 애플리케이션 상태 확인
pm2 status
```

---

## 백업 및 복구

### 1. 데이터베이스 백업
```bash
# 자동 백업 스크립트 (cron에 등록 가능)
#!/bin/bash
BACKUP_DIR="/home/wkadmin/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 데이터베이스 백업
mysqldump -u wkadmin -p'비밀번호' wk_megafactory > $BACKUP_DIR/db_backup_$DATE.sql

# 오래된 백업 삭제 (30일 이상)
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +30 -delete
```

### 2. 업로드 파일 백업
```bash
# 업로드 디렉토리 백업
tar -czf /home/wkadmin/backups/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz /home/wkadmin/app/server/uploads
```

### 3. 데이터베이스 복구
```bash
# 백업 파일로 복구
mysql -u wkadmin -p wk_megafactory < /home/wkadmin/backups/db_backup_YYYYMMDD_HHMMSS.sql
```

### 4. 업로드 파일 복구
```bash
# 백업 파일로 복구
tar -xzf /home/wkadmin/backups/uploads_backup_YYYYMMDD_HHMMSS.tar.gz -C /
```

---

## 모니터링 및 로그

### 1. PM2 모니터링
```bash
# 실시간 모니터링
pm2 monit

# 상태 확인
pm2 status

# 로그 보기
pm2 logs app-server
pm2 logs app-server --lines 100  # 최근 100줄

# 에러 로그만 보기
pm2 logs app-server --err
```

### 2. 시스템 리소스 모니터링
```bash
# CPU 및 메모리 사용량
htop

# 디스크 사용량
df -h

# MariaDB 프로세스 확인
sudo systemctl status mariadb
```

### 3. Nginx 로그
```bash
# 액세스 로그
sudo tail -f /var/log/nginx/access.log

# 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### 4. 애플리케이션 로그
애플리케이션 로그는 PM2를 통해 관리됩니다:
```bash
# 로그 파일 위치
~/.pm2/logs/app-server-out.log  # 표준 출력
~/.pm2/logs/app-server-error.log  # 에러 출력
```

---

## 문제 해결

### 1. ERR_CONNECTION_REFUSED 오류 (서버가 실행되지 않는 경우)

**증상**: 브라우저 콘솔에 `localhost:3000/api/... Failed to load resource: net::ERR_CONNECTION_REFUSED` 오류

**원인**: Node.js 서버(포트 3000)가 실행되지 않음

**해결 방법**:

**1단계: PM2 상태 확인**
```bash
pm2 status
```

**2단계: 서버가 실행되지 않은 경우**
```bash
# wkadmin 사용자로 전환
sudo su - wkadmin
cd /home/wkadmin/app/server

# .env 파일 확인
ls -la .env
cat .env

# PM2로 서버 시작
pm2 start dist/index.js --name "app-server"
pm2 save

# 로그 확인
pm2 logs app-server --err --lines 50
```

**3단계: 에러가 발생하는 경우 로그 확인**
```bash
# PM2 에러 로그
pm2 logs app-server --err --lines 100

# 직접 실행하여 에러 확인
cd /home/wkadmin/app/server
node dist/index.js
```

**4단계: 포트 확인**
```bash
# 3000번 포트가 사용 중인지 확인
sudo netstat -tulpn | grep 3000
# 또는
sudo ss -tulpn | grep 3000
```

**일반적인 원인:**
- PM2 프로세스가 시작되지 않음
- 데이터베이스 연결 실패 (로그에서 확인 가능)
- .env 파일 누락 또는 잘못된 설정
- 포트 충돌

### 2. 데이터베이스 연결 오류
```bash
# MariaDB 서비스 상태 확인
sudo systemctl status mariadb

# MariaDB 접속 테스트
mysql -u wkadmin -p -h localhost wk_megafactory

# .env 파일 확인
cat /home/wkadmin/app/server/.env | grep DB_
```

### 6. 파일 업로드 오류
```bash
# 업로드 디렉토리 권한 확인
ls -la /home/wkadmin/app/server/uploads

# 권한 수정 (필요시)
sudo chown -R wkadmin:wkadmin /home/wkadmin/app/server/uploads
sudo chmod -R 755 /home/wkadmin/app/server/uploads
```

### 7. Nginx 502 Bad Gateway 오류

**증상**: 브라우저 콘솔에 `POST http://wkshop.kr/api/... 502 (Bad Gateway)` 오류

**원인**: Nginx가 Node.js 서버(포트 3000)에 연결할 수 없음

**해결 방법**:

**1단계: PM2 상태 확인**
```bash
pm2 status
```

**2단계: 서버가 실행되지 않은 경우**
```bash
# wkadmin 사용자로 전환
sudo su - wkadmin
cd /home/wkadmin/app/server

# 서버 시작
pm2 start dist/index.js --name "app-server"
pm2 save

# 로그 확인
pm2 logs app-server --lines 50
```

**3단계: 포트 확인**
```bash
# 3000번 포트가 사용 중인지 확인
sudo netstat -tulpn | grep 3000
# 또는
sudo ss -tulpn | grep 3000
```

**4단계: 서버 오류 확인**
```bash
# PM2 에러 로그 확인
pm2 logs app-server --err --lines 100

# 서버를 직접 실행하여 오류 확인
cd /home/wkadmin/app/server
node dist/index.js
```

**5단계: Nginx 에러 로그 확인**
```bash
sudo tail -f /var/log/nginx/error.log
```

**6단계: Nginx 재시작 (필요시)**
```bash
sudo nginx -t  # 설정 테스트
sudo systemctl restart nginx
```

**일반적인 원인:**
- PM2 프로세스가 실행되지 않음
- 서버 시작 시 오류 발생 (마이그레이션 파일 누락, DB 연결 실패 등)
- 포트 충돌
- 서버가 크래시됨

### 8. 메모리 부족
```bash
# 메모리 사용량 확인
free -h

# PM2 메모리 제한 설정
pm2 start dist/index.js --name "app-server" --max-memory-restart 400M
pm2 save
```

### 9. 디스크 공간 부족
```bash
# 디스크 사용량 확인
df -h

# 큰 파일 찾기
sudo du -h /home/wkadmin/app/server/uploads | sort -rh | head -20

# 오래된 로그 파일 정리
pm2 flush  # PM2 로그 삭제
```

---

## 추가 보안 권장사항

### 1. 방화벽 최소 권한 원칙
```bash
# 불필요한 포트는 열지 않기
# 3000번 포트는 localhost에서만 접근 가능하도록 (Nginx를 통해서만 접근)
```

### 2. 데이터베이스 접근 제한 (외부 접속 허용 시)
```bash
# MariaDB 설정 파일 수정
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
# bind-address = 0.0.0.0  # 모든 인터페이스에서 접속 허용 (외부 접속 허용 시)
# 또는 bind-address = 127.0.0.1  # localhost만 허용 (외부 접속 차단 시)
# 변경 후 sudo systemctl restart mariadb
```

### 3. SSH 보안 강화
```bash
# SSH 키 인증 사용 (비밀번호 인증 비활성화)
# /etc/ssh/sshd_config 파일 수정
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PermitRootLogin no
```

### 4. 정기적인 업데이트
```bash
# 시스템 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 패키지 취약점 확인
npm audit
npm audit fix
```

---

## 체크리스트

### 초기 배포 시
- [ ] AWS Lightsail 인스턴스 생성 및 네트워크 설정
- [ ] 필수 소프트웨어 설치 (Node.js, MariaDB, PM2, Nginx)
- [ ] MariaDB 데이터베이스 및 사용자 생성
- [ ] 코드 업로드 및 빌드
- [ ] 환경 변수 설정 (.env)
- [ ] 데이터베이스 마이그레이션 실행
- [ ] PM2로 애플리케이션 시작
- [ ] Nginx 설정 (HTTP만 사용)
- [ ] 백업 스크립트 설정

### 업데이트 시
- [ ] 코드 변경사항 확인 및 테스트
- [ ] 로컬에서 빌드 테스트
- [ ] 서버에 코드 배포
- [ ] 데이터베이스 마이그레이션 실행 (필요시)
- [ ] 애플리케이션 재시작
- [ ] 기능 테스트
- [ ] 로그 확인

---

## 참고 사항

- 이 가이드는 기본적인 배포 절차를 설명합니다. 실제 환경에 맞게 조정이 필요할 수 있습니다.
- 프로덕션 환경에서는 반드시 백업 전략을 수립하고 정기적으로 실행해야 합니다.
- 보안 패치 및 시스템 업데이트는 정기적으로 수행해야 합니다.
- 모니터링 도구를 활용하여 애플리케이션의 상태를 지속적으로 확인하는 것을 권장합니다.

