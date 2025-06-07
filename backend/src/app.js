require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const Redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis').default;

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const subscriptionRoutes = require('./routes/subscriptions');
const activityRoutes = require('./routes/activities');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const skillRoutes = require('./routes/skills');
const adminSkillRoutes = require('./routes/admin-skills');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const workScheduleRoutes = require('./routes/workSchedule');

// Import middleware
const { errorHandler } = require('./middleware/error');
const { rateLimiter } = require('./middleware/rateLimiter');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.connect().catch(console.error);

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
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sess',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');

// Rate limiting
const apiRateLimiter = rateLimiter;
app.use('/api/', apiRateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/admin/skills', adminSkillRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/work-schedule', workScheduleRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and database connections...');
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

module.exports = app;  