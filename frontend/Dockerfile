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

# 権限設定
RUN chmod -R 755 /app

EXPOSE 3000

# 開発サーバーを起動
CMD ["npm", "run", "dev"]
