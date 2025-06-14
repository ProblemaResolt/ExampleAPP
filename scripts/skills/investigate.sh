#!/bin/bash

# スキル管理ページ問題調査スクリプト
echo "=== スキル管理ページ問題調査 ==="

# 1. データベース状態確認
echo "1. データベース状態確認中..."
cd /d/dev/app/backend
node ../scripts/skills/check-global-skills.js

echo ""
echo "2. Dockerコンテナ状態確認中..."
cd /d/dev/app
docker-compose ps

echo ""
echo "3. バックエンドログ確認..."
docker-compose logs --tail=20 backend

echo ""
echo "4. API エンドポイント確認（注意: 認証トークンが必要）"
echo "TEST_TOKEN環境変数を設定してからAPI テストを実行してください:"
echo "TEST_TOKEN=your_token_here node scripts/skills/test-api-endpoints.js"

echo ""
echo "=== 調査完了 ==="
echo "問題が特定できない場合は、以下を確認してください:"
echo "- フロントエンドのネットワークタブでAPIリクエストの詳細"
echo "- 認証状態とユーザー権限"
echo "- データベースにシードデータが正しく投入されているか"
