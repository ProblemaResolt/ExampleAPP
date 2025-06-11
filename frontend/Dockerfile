FROM node:20-alpine

# Windows Docker I/O エラー対策の環境変数は.envファイルから読み込み
WORKDIR /app

# パッケージ管理ツールのインストール
RUN apk add --no-cache git

# npm設定の最適化
RUN npm config set fetch-retry-mintimeout 60000 && \
    npm config set fetch-retry-maxtimeout 300000 && \
    npm config set fetch-retry-factor 10 && \
    npm config set fetch-retries 15 && \
    npm config set fund false && \
    npm config set audit false && \
    npm config set update-notifier false

# package.jsonをコピー
COPY package*.json ./

# 依存関係をインストール（Windows I/O エラー対策）
RUN npm install --prefer-offline --no-audit --no-fund --timeout=600000 || \
    npm install --force --no-audit --no-fund --timeout=600000

# 全ソースコードをコピー（ボリュームマウントを使わない）
COPY . .

# ファイルコピーの確認と権限設定
RUN ls -la /app/src/styles/ && \
    ls -la /app/src/components/Snackbar.jsx && \
    mkdir -p /app/.vite /app/dist /app/node_modules/.cache && \
    chmod -R 755 /app

EXPOSE 3000

# ヘルスチェック用のcurlをインストール
RUN apk add --no-cache curl

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# 開発サーバーを起動
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
