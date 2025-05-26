const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/error');
const { generateToken, generateRefreshToken, authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();
const prisma = new PrismaClient();

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Auth API is running',
    endpoints: {
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      refreshToken: 'POST /api/auth/refresh-token',
      verifyEmail: 'GET /api/auth/verify-email/:token',
      logout: 'POST /api/auth/logout'
    }
  });
});

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('role').isIn(['COMPANY', 'MANAGER', 'MEMBER'])
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new user
router.post('/register', validateRegistration, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        verificationToken: crypto.randomBytes(32).toString('hex'),
        verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.verificationToken);

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', authLimiter, validateLogin, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError('Account is locked. Please try again later', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: user.loginAttempts + 1,
          lockedUntil: user.loginAttempts + 1 >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null // Lock for 15 minutes after 5 attempts
        }
      });

      throw new AppError('Invalid credentials', 401);
    }

    // Reset login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || !user.isActive) {
      throw new AppError('User no longer exists', 401);
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      status: 'success',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid refresh token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Refresh token expired', 401));
    } else {
      next(error);
    }
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationExpiry: null
      }
    });

    res.json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Request password reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal that the email doesn't exist
      return res.json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: resetExpiry
      }
    });

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);

    res.json({
      status: 'success',
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    const refreshToken = generateRefreshToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
  }
);

// GitHub OAuth
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    const refreshToken = generateRefreshToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
  }
);

// Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // Invalidate refresh token (if using token blacklist)
    // For now, we'll just return success
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 