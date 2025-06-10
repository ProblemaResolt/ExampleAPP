FROM node:20

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# npmキャッシュをクリアして、依存関係をインストール
RUN npm cache clean --force
RUN npm install

# ソースコードをコピー
COPY . .

# ポートを公開
EXPOSE 3000

# 開発サーバーを起動
CMD ["npm", "run", "dev"]