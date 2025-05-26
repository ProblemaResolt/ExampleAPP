const rateLimit = require('express-rate-limit');
const Redis = require('redis');
const RedisStore = require('rate-limit-redis').default;

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.connect().catch(console.error);

const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Specific limiter for auth routes
const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 本来の上限（開発中は無効化）
  skip: (req) => true, // すべてのリクエストをスキップ（レートリミット無効化）
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  rateLimiter,
  authLimiter
}; 