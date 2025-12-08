#!/bin/bash

# 빠른 배포 스크립트
# 로컬에서 실행하여 서버에 배포합니다
# 사용법: ./quick-deploy.sh <server-ip-or-domain>

set -e

if [ -z "$1" ]; then
    echo "사용법: ./quick-deploy.sh <server-ip-or-domain>"
    echo "예: ./quick-deploy.sh ubuntu@wkshop.kr"
    exit 1
fi

SERVER=$1
PROJECT_ROOT="/var/www/wkshop"

echo "🚀 배포를 시작합니다..."

# 1. 서버 빌드
echo "📦 서버 빌드 중..."
cd server
npm run build
cd ..

# 2. 클라이언트 빌드
echo "📦 클라이언트 빌드 중..."
cd client
npm run build
cd ..

# 3. 서버에 파일 업로드
echo "📤 서버에 파일 업로드 중..."
rsync -avz --exclude 'node_modules' --exclude '.git' \
  --exclude '*.log' --exclude '.env' \
  server/ $SERVER:$PROJECT_ROOT/server/
rsync -avz --exclude 'node_modules' --exclude '.git' \
  --exclude '*.log' \
  client/dist/ $SERVER:$PROJECT_ROOT/client/dist/

# 4. 서버에서 의존성 설치 및 재시작
echo "🔄 서버 재시작 중..."
ssh $SERVER << 'ENDSSH'
cd /var/www/wkshop/server
npm install --production
pm2 restart wkshop-api || pm2 start dist/index.js --name wkshop-api
pm2 save
sudo systemctl reload nginx
ENDSSH

echo "✅ 배포가 완료되었습니다!"
