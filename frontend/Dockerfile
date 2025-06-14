# 開発環境用Dockerfile（IOエラー回避 + ライブリロード対応）
FROM node:20-alpine

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

# npmキャッシュをクリアして確実にインストール
RUN npm cache clean --force

# 依存関係をインストール（開発依存関係も含む）- メモリ最適化
RUN NODE_OPTIONS="--max_old_space_size=4096" npm ci --verbose --prefer-offline --no-audit --no-fund

# 設定ファイルとソースコードをコピー
COPY vite.config.js ./
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/

EXPOSE 3000

# 開発サーバーとして起動
CMD ["npm", "run", "dev"]
