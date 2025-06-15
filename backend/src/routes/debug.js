const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/authentication');

const router = express.Router();
const prisma = new PrismaClient();

// デバッグ用: ユーザー情報と会社情報を確認
router.get('/user-company-info', authenticate, async (req, res, next) => {
  try {
    // 現在のユーザー情報を取得
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        company: true,
        managedCompany: true
      }
    });

    // 全ユーザーと会社情報を取得
    const allUsers = await prisma.user.findMany({
      include: {
        company: true,
        managedCompany: true
      },
      orderBy: { email: 'asc' }
    });

    // 全会社情報を取得
    const allCompanies = await prisma.company.findMany({
      include: {
        users: {
          select: { id: true, email: true, role: true }
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        currentUser: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role,
          companyId: currentUser.companyId,
          managedCompanyId: currentUser.managedCompanyId,
          company: currentUser.company,
          managedCompany: currentUser.managedCompany
        },
        allUsers: allUsers.map(user => ({
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          managedCompanyId: user.managedCompanyId,
          companyName: user.company?.name,
          managedCompanyName: user.managedCompany?.name
        })),
        allCompanies: allCompanies.map(company => ({
          id: company.id,
          name: company.name,
          userCount: company.users.length,
          users: company.users
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
