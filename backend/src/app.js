require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// const passport = require('passport'); // 検証中: 一時的に無効化
const { PrismaClient } = require('@prisma/client'); // 検証中: 再有効化テスト
// const Redis = require('redis'); // 検証中: 一時的に無効化
// const session = require('express-session'); // 検証中: 一時的に無効化
// const RedisStore = require('connect-redis').default; // 検証中: 一時的に無効化

// Import routes
const authRoutes = require('./routes/auth'); // 検証中: 再有効化テスト
const userRoutes = require('./routes/users'); // 検証中: 再有効化テスト
const companyRoutes = require('./routes/companies'); // 検証中: 再有効化テスト
const subscriptionRoutes = require('./routes/subscriptions'); // 検証中: 再有効化テスト
// const activityRoutes = require('./routes/activities'); // 検証中: 一時的に無効化
const projectRoutes = require('./routes/projects'); // 検証中: 再有効化テスト
const adminRoutes = require('./routes/admin'); // 検証中: 再有効化テスト
const skillRoutes = require('./routes/skills'); // 検証中: 再有効化テスト
// const adminSkillRoutes = require('./routes/admin-skills'); // 検証中: 一時的に無効化
const attendanceRoutes = require('./routes/attendance'); // 検証中: 再有効化テスト
// const leaveRoutes = require('./routes/leave'); // 検証中: 一時的に無効化
const workScheduleRoutes = require('./routes/workSchedule'); // 検証中: 再有効化テスト
// const projectWorkSettingsRoutes = require('./routes/projectWorkSettings'); // 検証中: 一時的に無効化
// const debugRoutes = require('./routes/debug'); // 検証中: 一時的に無効化

// Import middleware
const { errorHandler } = require('./middleware/error'); // 検証中: 再有効化テスト
// const { rateLimiter } = require('./middleware/rateLimiter'); // 検証中: 一時的に無効化

// Import tasks
// const { startProjectTasks } = require('./tasks/projectTasks'); // 検証中: 一時的に無効化

// Import scheduled tasks
// const { scheduleExpiredMemberRemoval } = require('./utils/scheduledTasks'); // 検証中: 一時的に無効化

// Initialize Prisma
const prisma = new PrismaClient(); // 検証中: 再有効化テスト

// Initialize Redis client
// const redisClient = Redis.createClient({
//   url: process.env.REDIS_URL
// });

// redisClient.connect().catch(console.error);

// Initialize Express app
const app = express();

// Trust proxy setting for rate limiter
app.set('trust proxy', 1); // Trust only the first proxy (Nginx)

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https:", "http:"],
      fontSrc: ["'self'", "https://storage.aahub.org", "data:", "https:", "http:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      connectSrc: ["'self'", "https://storage.aahub.org", "http://localhost:*", "ws://localhost:*"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:80', 'http://localhost', process.env.FRONTEND_URL]
    : process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(morgan('dev'));

// Session configuration
// app.use(session({
//   store: new RedisStore({ client: redisClient }),
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   name: 'sess',
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     httpOnly: true,
//     maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
//   }
// }));

// Initialize Passport
// app.use(passport.initialize());
// app.use(passport.session());
// require('./config/passport');

// Rate limiting
// const apiRateLimiter = rateLimiter;
// app.use('/api/', apiRateLimiter);

// Routes
app.use('/api/auth', authRoutes); // 検証中: 再有効化テスト
app.use('/api/users', userRoutes); // 検証中: 再有効化テスト
app.use('/api/companies', companyRoutes); // 検証中: 再有効化テスト
app.use('/api/subscriptions', subscriptionRoutes); // 検証中: 再有効化テスト
// app.use('/api/activities', activityRoutes); // 検証中: 一時的に無効化
app.use('/api/projects', projectRoutes); // 検証中: 再有効化テスト
app.use('/api/skills', skillRoutes); // 検証中: 再有効化テスト
// app.use('/api/admin/skills', adminSkillRoutes); // 検証中: 一時的に無効化
app.use('/api/admin', adminRoutes); // 検証中: 再有効化テスト
app.use('/api/attendance', attendanceRoutes); // 検証中: 再有効化テスト
// app.use('/api/leave', leaveRoutes); // 検証中: 一時的に無効化
app.use('/api/work-schedule', workScheduleRoutes); // 検証中: 再有効化テスト
// app.use('/api/project-work-settings', projectWorkSettingsRoutes); // 検証中: 一時的に無効化
// app.use('/api/debug', debugRoutes); // 検証中: 一時的に無効化

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling middleware (should be last)
// app.use(errorHandler); // 検証中: 一時的に無効化

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  // スケジュールタスクを開始
  // scheduleExpiredMemberRemoval(); // 検証中: 一時的に無効化
});

// スケジュールタスクを開始
// if (process.env.NODE_ENV !== 'test') {
//   startProjectTasks();
// }

// Handle graceful shutdown
// process.on('SIGTERM', async () => {
//   await prisma.$disconnect();
//   await redisClient.quit();
//   process.exit(0);
// });

module.exports = app;