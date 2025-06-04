#!/bin/bash

# 本番環境用 グローバルスキル シードスクリプト
echo "🚀 本番環境: グローバルスキルシード開始..."

# データベース接続確認
echo "📡 データベース接続確認中..."
npx prisma db push --accept-data-loss=false

# グローバルスキルシード実行
echo "🌍 グローバルスキルデータを追加中..."
node prisma/seed-global-skills.js

echo "✅ 本番環境: グローバルスキルシード完了"
