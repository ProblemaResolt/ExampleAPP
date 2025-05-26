FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install
RUN npm update

# ソースコードをコピー
COPY . .

# ポートを公開
EXPOSE 3000

# Vite開発サーバーをホスト0.0.0.0で起動
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]