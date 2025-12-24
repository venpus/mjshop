#!/bin/bash

# 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 오류 발생 시 스크립트 중단

echo "🚀 배포를 시작합니다..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
PROJECT_ROOT="/var/www/wkshop"
SERVER_DIR="$PROJECT_ROOT/server"
CLIENT_DIR="$PROJECT_ROOT/client"

# 1. 서버 애플리케이션 배포
echo -e "${YELLOW}📦 서버 애플리케이션 빌드 중...${NC}"
cd $SERVER_DIR
npm install --production
npm run build

# 2. 클라이언트 애플리케이션 빌드
echo -e "${YELLOW}📦 클라이언트 애플리케이션 빌드 중...${NC}"
cd $CLIENT_DIR
npm install
npm run build

# 3. PM2로 서버 재시작
echo -e "${YELLOW}🔄 서버 재시작 중...${NC}"
pm2 restart wkshop-api || pm2 start $SERVER_DIR/dist/index.js --name wkshop-api

# 4. Nginx 설정 리로드
echo -e "${YELLOW}🔄 Nginx 설정 리로드 중...${NC}"
sudo nginx -t && sudo systemctl reload nginx

echo -e "${GREEN}✅ 배포가 완료되었습니다!${NC}"
echo -e "${GREEN}📍 웹사이트: http://wkshop.kr${NC}"
echo -e "${GREEN}📍 API Health: http://wkshop.kr/api/health${NC}"

# PM2 상태 확인
pm2 status

