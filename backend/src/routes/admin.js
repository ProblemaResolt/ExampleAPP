const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/authentication');

const prisma = new PrismaClient();

// すべての管理者エンドポイントにADMIN権限を要求
router.use(authenticate);
router.use(authorize('ADMIN'));

// システム統計情報を取得
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalCompanies,
      totalProjects,
      activeProjects,
      systemAlerts
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.project.count(),
      prisma.project.count({
        where: {
          status: 'ACTIVE'
        }
      }),
      // システムアラートの代わりに最近のアクティビティ数を取得
      prisma.activity.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 過去24時間
          }
        }
      })
    ]);    res.json({
      status: 'success',
      data: {
        totalUsers,
        totalCompanies,
        totalProjects,
        activeProjects,
        systemAlerts
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'システム統計の取得に失敗しました' });
  }
});

// システム全体のユーザー統計（個人情報を除く）
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      AND: [
        search ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        role ? { role: role } : {}
      ]
    };    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true, // メールアドレスのみ（個人名は除外）
          role: true,
          isActive: true,
          createdAt: true,
          company: {
            select: {
              name: true // 会社名のみ（住所、連絡先等の詳細情報は除外）
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.user.count({ where: whereClause })
    ]);    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

// システム全体のユーザー作成（管理用途のみ）
router.post('/users', async (req, res) => {
  try {
    const { firstName, lastName, email, role, companyId, password } = req.body;

    // システム管理者は管理者アカウントのみ作成可能
    if (!['ADMIN', 'COMPANY'].includes(role)) {
      return res.status(403).json({ 
        error: 'システム管理者は管理者アカウント（ADMIN、COMPANY）のみ作成できます' 
      });
    }

    // 既存ユーザーのチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に使用されています' });
    }

    // パスワードのハッシュ化
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        role,
        companyId: companyId || null,
        password: hashedPassword,
        isActive: true,
        isEmailVerified: true
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        company: {
          select: {
            name: true
          }
        }
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'ユーザーの作成に失敗しました' });
  }
});

// システム全体のユーザー更新（管理用途のみ）
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, companyId, isActive } = req.body;

    // 更新対象ユーザーの確認
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // 自分自身は削除・無効化できない
    if (parseInt(id) === req.user.id && isActive === false) {
      return res.status(400).json({ error: '自分自身を無効化することはできません' });
    }

    // システム管理者は管理者アカウントのみ編集可能
    if (role && !['ADMIN', 'COMPANY'].includes(role)) {
      return res.status(403).json({ 
        error: 'システム管理者は管理者アカウント（ADMIN、COMPANY）のみ編集できます' 
      });
    }

    // 他のユーザーが同じメールアドレスを使用していないかチェック
    if (email && email !== targetUser.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: parseInt(id) }
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'このメールアドレスは既に使用されています' });
      }
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (companyId !== undefined) updateData.companyId = companyId || null;
    if (isActive !== undefined) updateData.isActive = isActive;    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        company: {
          select: {
            name: true
          }
        }
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating admin user:', error);
    res.status(500).json({ error: 'ユーザーの更新に失敗しました' });
  }
});

// システム全体のユーザー削除
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // 自分自身は削除できない
    if (userId === req.user.id) {
      return res.status(400).json({ error: '自分自身を削除することはできません' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'ユーザーが削除されました' });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({ error: 'ユーザーの削除に失敗しました' });
  }
});

// システム全体の会社管理（基本情報のみ、詳細な社員情報は除外）
router.get('/companies', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,        select: {
          id: true,
          name: true,
          description: true,
          website: true, // 基本的な会社情報のみ（住所、電話番号等の詳細な連絡先情報は除外）
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              projects: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.company.count({ where: whereClause })
    ]);    res.json({
      status: 'success',
      data: {
        companies,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin companies:', error);
    res.status(500).json({ error: '会社一覧の取得に失敗しました' });
  }
});

// 監査ログの取得
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', startDate = '', endDate = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    // 検索条件
    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // 日付範囲フィルター
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.activity.count({ where: whereClause })
    ]);

    res.json({
      activities,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: '監査ログの取得に失敗しました' });
  }
});

module.exports = router;
