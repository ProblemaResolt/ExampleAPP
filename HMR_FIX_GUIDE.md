# HMR修正ガイド

## 🔥 HMR WebSocket問題の解決策

### 現在の問題
- Nginx経由 (`localhost/`) でアクセス時にHMR WebSocketが `localhost:5173` に接続失敗
- ファイル更新時に ERR_CONNECTION_RESET エラー

### 解決策1: 設定修正
1. ✅ `vite.config.js`: HMR設定でclientPort=80を指定
2. ✅ `docker-compose.yml`: HMR環境変数を追加
3. ✅ `nginx/conf.d/default.conf`: WebSocketプロキシ設定確認

### 解決策2: 直接アクセス（推奨テスト）
**開発時のみ**: `http://localhost:5173` に直接アクセス
- HMRが確実に動作
- WebSocketエラーなし
- ファイル更新の即座反映

### 解決策3: HMR無効化
```javascript
// vite.config.js
server: {
  hmr: false,  // HMRを完全に無効化
  // 手動リロードで開発
}
```

## テスト手順

### 1. 現在の設定をテスト
```bash
docker-compose restart frontend nginx
```
ブラウザ: `http://localhost`

### 2. 直接アクセステスト  
ブラウザ: `http://localhost:5173`
- ファイル変更
- 自動リロード確認

### 3. 問題が続く場合
- HMR無効化
- 手動リロードで開発継続

## 結論
**直接ポート5173アクセスが最も確実な解決策**
