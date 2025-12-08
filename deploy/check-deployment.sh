#!/bin/bash

# 배포 상태 확인 스크립트

echo "🔍 배포 상태를 확인합니다..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. PM2 상태 확인
echo -e "${YELLOW}1. PM2 프로세스 상태:${NC}"
pm2 status
echo ""

# 2. Nginx 상태 확인
echo -e "${YELLOW}2. Nginx 상태:${NC}"
sudo systemctl status nginx --no-pager -l
echo ""

# 3. MariaDB 상태 확인
echo -e "${YELLOW}3. MariaDB 상태:${NC}"
sudo systemctl status mariadb --no-pager -l
echo ""

# 4. 포트 확인
echo -e "${YELLOW}4. 포트 사용 상태:${NC}"
sudo netstat -tulpn | grep -E ':(80|3000|3306)' || echo "포트 확인 실패"
echo ""

# 5. 디스크 사용량
echo -e "${YELLOW}5. 디스크 사용량:${NC}"
df -h /var/www/wkshop
echo ""

# 6. 최근 로그 확인
echo -e "${YELLOW}6. 최근 PM2 로그 (마지막 10줄):${NC}"
pm2 logs wkshop-api --lines 10 --nostream || echo "로그 없음"
echo ""

# 7. API Health Check
echo -e "${YELLOW}7. API Health Check:${NC}"
curl -s http://localhost:3000/api/health | jq . || curl -s http://localhost:3000/api/health
echo ""

echo -e "${GREEN}✅ 확인 완료${NC}"
