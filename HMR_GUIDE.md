# HMR（Hot Module Replacement）設定ガイド

## 🔥 HMRが動作しない場合の対処法

### 方法1: Nginx経由（推奨）
- ブラウザ: `http://localhost`
- HMR設定: シンプル設定（`hmr: true`）

### 方法2: 直接アクセス（開発時のみ）
- ブラウザ: `http://localhost:3000`
- HMRが確実に動作します

### 方法3: 環境変数による切り替え
```javascript
// vite.config.js
hmr: process.env.NODE_ENV === 'development' ? {
  host: 'localhost',
  port: 3000
} : false
```

## 🛠️ トラブルシューティング

### WebSocketエラーが続く場合
1. フロントエンドコンテナ再起動: `docker-compose restart frontend`
2. ブラウザキャッシュクリア: Ctrl+Shift+R
3. 直接ポート3000でアクセス試行

### 現在の設定状況
- ✅ DOM nesting警告修正済み
- ✅ React Fast Refresh有効
- ✅ ファイル監視強化（300ms間隔）
- ✅ エラーオーバーレイ有効（予定）

## 📝 推奨開発フロー
1. コード変更
2. 自動保存
3. 即座にブラウザ反映を確認
4. エラーがある場合は画面上にオーバーレイ表示
