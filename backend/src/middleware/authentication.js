const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('./error');

const prisma = new PrismaClient();

const generateToken = (user) => {
  const tokenData = { 
    userId: user.id,  // userIdとして統一
    id: user.id,      // 後方互換性のため
    email: user.email,
    role: user.role
  };

  // Add company manager information if applicable
  if (user.role === 'COMPANY' && user.managedCompany) {
    tokenData.managedCompanyId = user.managedCompany.id;
    tokenData.managedCompanyName = user.managedCompany.name;
  }

  return jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '60d' }
  );
};

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        managedCompany: {
          select: {
            id: true,
            name: true
          }
        }
      }    });

    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    if (!user.isActive) {
      throw new AppError('User account is inactive', 401);
    }    // Set user data from token and database
    req.user = {
      ...user,
      id: decoded.userId || decoded.id || user.id,
      role: decoded.role || user.role,
      companyId: user.company?.id,
      managedCompanyId: decoded.managedCompanyId || user.managedCompany?.id,
      managedCompanyName: decoded.managedCompanyName || user.managedCompany?.name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    
    // 配列が渡された場合はフラット化する
    const allowedRoles = roles.flat();
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

const checkCompanyAccess = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.body.companyId;
    if (!companyId) {
      return next(new AppError('Company ID is required', 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        company: true,
        managedCompany: true
      }
    });

    // Admin has access to all companies
    if (user.role === 'ADMIN') {
      return next();
    }

    // Company manager has access to their own company
    if (user.role === 'COMPANY' && user.managedCompany?.id === companyId) {
      return next();
    }

    // Manager has access to their company
    if (user.role === 'MANAGER' && user.company?.id === companyId) {
      return next();
    }

    // Member has access to their company
    if (user.role === 'MEMBER' && user.company?.id === companyId) {
      return next();
    }

    throw new AppError('You do not have access to this company', 403);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  authenticate,
  authorize,
  checkCompanyAccess
};