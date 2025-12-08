#!/bin/bash

# 서버 초기 설정 스크립트
# 사용법: sudo ./setup.sh

set -e

echo "🔧 서버 초기 설정을 시작합니다..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 시스템 업데이트
echo -e "${YELLOW}📦 시스템 업데이트 중...${NC}"
apt update && apt upgrade -y

# 2. 필수 패키지 설치
echo -e "${YELLOW}📦 필수 패키지 설치 중...${NC}"
apt install -y curl wget git build-essential

# 3. Node.js 설치
echo -e "${YELLOW}📦 Node.js 설치 중...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}✅ Node.js $(node --version) 설치 완료${NC}"

# 4. PM2 설치
echo -e "${YELLOW}📦 PM2 설치 중...${NC}"
npm install -g pm2

# 5. MariaDB 설치
echo -e "${YELLOW}📦 MariaDB 설치 중...${NC}"
if ! command -v mysql &> /dev/null; then
    apt install -y mariadb-server mariadb-client
    systemctl start mariadb
    systemctl enable mariadb
fi
echo -e "${GREEN}✅ MariaDB 설치 완료${NC}"

# 6. Nginx 설치
echo -e "${YELLOW}📦 Nginx 설치 중...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
echo -e "${GREEN}✅ Nginx 설치 완료${NC}"

# 7. 프로젝트 디렉토리 생성
echo -e "${YELLOW}📁 프로젝트 디렉토리 생성 중...${NC}"
mkdir -p /var/www/wkshop
chown -R $SUDO_USER:$SUDO_USER /var/www/wkshop

# 8. 방화벽 설정
echo -e "${YELLOW}🔥 방화벽 설정 중...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}✅ 서버 초기 설정이 완료되었습니다!${NC}"
echo ""
echo "다음 단계:"
echo "1. MariaDB 데이터베이스 및 사용자 생성"
echo "2. 프로젝트 파일을 /var/www/wkshop에 업로드"
echo "3. Nginx 설정 파일 복사 및 활성화"
echo "4. ./deploy.sh 실행하여 배포"
