const rateLimit = require('express-rate-limit');
const Redis = require('redis');
const RedisStore = require('rate-limit-redis').default;

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.connect().catch(console.error);

// 開発環境ではレート制限を緩和
const isDevelopment = process.env.NODE_ENV === 'development';

const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 開発環境: 1分、本番環境: 15分
  max: isDevelopment ? 1000 : 100, // 開発環境: 1000リクエスト、本番環境: 100リクエスト
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 認証用のレート制限
const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // 開発環境: 1分、本番環境: 1時間
  max: isDevelopment ? 100 : 5, // 開発環境: 100リクエスト、本番環境: 5リクエスト
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  rateLimiter,
  authLimiter
}; 