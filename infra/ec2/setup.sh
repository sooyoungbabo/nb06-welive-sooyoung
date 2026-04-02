#!/bin/bash
set -e

cd "$(dirname "$0")/../.."

npm ci --omit=dev  # 로컬에서 빌드한 것으로 서버 구동
npx prisma generate
npx prisma migrate deploy

pm2 delete all || true
pm2 start infra/ec2/ecosystem.config.js
pm2 save
pm2 startup || true