const { PrismaClient } = require('@prisma/client');

// テスト用のPrismaクライアント
let prisma;

beforeAll(async () => {
  // テスト用のデータベース接続を設定
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/app'
      }
    }
  });
});

afterAll(async () => {
  // テスト後のクリーンアップ
  if (prisma) {
    await prisma.$disconnect();
  }
});

// グローバルにprismaを利用可能にする
global.prisma = prisma;
