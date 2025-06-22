const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * プロジェクト関連のビジネスロジック
 */
class ProjectService {
  /**
   * プロジェクト一覧を取得
   */
  static async getProjects(userId, userRole, companyId, filters = {}) {
    const { search, status, managerId, companyFilter } = filters;

    let where = {};
    
    // 権限による絞り込み
    if (userRole === 'ADMIN') {
      if (companyFilter) {
        where.companyId = companyFilter;
      }
    } else if (userRole === 'COMPANY') {
      where.companyId = companyId;
    } else {
      // MEMBER または MANAGER の場合は参加しているプロジェクトのみ
      where.members = {
        some: { userId }
      };
    }

    // フィルター適用
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (managerId) {
      where.members = {
        some: {
          userId: managerId,
          isManager: true
        }
      };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return projects.map(project => this.formatProjectResponse(project));
  }

  /**
   * ユーザーの参加プロジェクト一覧を取得
   */
  static async getUserProjects(userId) {
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        members: {
          where: { userId },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      company: project.company,
      isManager: project.members[0]?.isManager || false,
      allocation: project.members[0]?.allocation || 0
    }));
  }

  /**
   * プロジェクト詳細を取得
   */
  static async getProjectById(id, userId, userRole, companyId) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // アクセス権限チェック
    if (!this.canAccessProject(project, userId, userRole, companyId)) {
      throw new AppError('このプロジェクトにアクセスする権限がありません', 403);
    }

    return this.formatProjectResponse(project);
  }

  /**
   * プロジェクトを作成
   */
  static async createProject(data, userId, userRole, companyId) {
    const {
      name,
      description,
      startDate,
      endDate,
      status = 'PLANNED',
      managerIds = [],
      memberIds = [],
      skillIds = [],
      clientCompanyName,
      clientContactName,
      clientContactPhone,
      clientContactEmail,
      clientPrefecture,
      clientCity,
      clientStreetAddress,
      companyId: requestCompanyId
    } = data;

    // 会社ID決定
    const targetCompanyId = userRole === 'ADMIN' && requestCompanyId ? requestCompanyId : companyId;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status,
        companyId: targetCompanyId,
        clientCompanyName,
        clientContactName,
        clientContactPhone,
        clientContactEmail,
        clientPrefecture,
        clientCity,
        clientStreetAddress
      }
    });

    // メンバー追加
    await this.addProjectMembers(project.id, managerIds, memberIds);

    // スキル追加
    if (skillIds.length > 0) {
      await this.addProjectSkills(project.id, skillIds);
    }

    return await this.getProjectById(project.id, userId, userRole, companyId);
  }

  /**
   * プロジェクトを更新
   */
  static async updateProject(id, data, userId, userRole, companyId) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // アクセス権限チェック
    if (!this.canModifyProject(project, userId, userRole, companyId)) {
      throw new AppError('このプロジェクトを編集する権限がありません', 403);
    }

    const {
      name,
      description,
      startDate,
      endDate,
      status,
      managerIds,
      memberIds,
      skillIds,
      clientCompanyName,
      clientContactName,
      clientContactPhone,
      clientContactEmail,
      clientPrefecture,
      clientCity,
      clientStreetAddress
    } = data;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) updateData.status = status;
    if (clientCompanyName !== undefined) updateData.clientCompanyName = clientCompanyName;
    if (clientContactName !== undefined) updateData.clientContactName = clientContactName;
    if (clientContactPhone !== undefined) updateData.clientContactPhone = clientContactPhone;
    if (clientContactEmail !== undefined) updateData.clientContactEmail = clientContactEmail;
    if (clientPrefecture !== undefined) updateData.clientPrefecture = clientPrefecture;
    if (clientCity !== undefined) updateData.clientCity = clientCity;
    if (clientStreetAddress !== undefined) updateData.clientStreetAddress = clientStreetAddress;

    await prisma.project.update({
      where: { id },
      data: updateData
    });

    // メンバー更新
    if (managerIds !== undefined || memberIds !== undefined) {
      await this.updateProjectMembers(id, managerIds || [], memberIds || []);
    }

    // スキル更新
    if (skillIds !== undefined) {
      await this.updateProjectSkills(id, skillIds);
    }

    return await this.getProjectById(id, userId, userRole, companyId);
  }

  /**
   * プロジェクトを削除
   */
  static async deleteProject(id, userId, userRole, companyId) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    if (!this.canModifyProject(project, userId, userRole, companyId)) {
      throw new AppError('このプロジェクトを削除する権限がありません', 403);
    }

    await prisma.project.delete({
      where: { id }
    });

    return { message: 'プロジェクトが削除されました' };
  }

  /**
   * プロジェクトメンバーを追加
   */
  static async addProjectMembers(projectId, managerIds = [], memberIds = []) {
    const allMembers = [
      ...managerIds.map(id => ({ userId: id, isManager: true })),
      ...memberIds.map(id => ({ userId: id, isManager: false }))
    ];

    if (allMembers.length > 0) {
      await prisma.projectMembership.createMany({
        data: allMembers.map(member => ({
          projectId,
          userId: member.userId,
          isManager: member.isManager,
          startDate: new Date()
        })),
        skipDuplicates: true
      });
    }
  }

  /**
   * プロジェクトメンバーを更新
   */
  static async updateProjectMembers(projectId, managerIds, memberIds) {
    // 既存メンバーを削除
    await prisma.projectMembership.deleteMany({
      where: { projectId }
    });

    // 新しいメンバーを追加
    await this.addProjectMembers(projectId, managerIds, memberIds);
  }

  /**
   * プロジェクトスキルを追加
   */
  static async addProjectSkills(projectId, skillIds) {
    await prisma.projectRequiredSkill.createMany({
      data: skillIds.map(skillId => ({
        projectId,
        skillId
      })),
      skipDuplicates: true
    });
  }

  /**
   * プロジェクトスキルを更新
   */
  static async updateProjectSkills(projectId, skillIds) {
    await prisma.projectRequiredSkill.deleteMany({
      where: { projectId }
    });

    if (skillIds.length > 0) {
      await this.addProjectSkills(projectId, skillIds);
    }
  }

  /**
   * プロジェクトにメンバーを追加
   */
  static async addMemberToProject(projectId, userId, allocation, isManager = false) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    const existingMembership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (existingMembership) {
      throw new AppError('このユーザーは既にプロジェクトのメンバーです', 400);
    }

    await prisma.projectMembership.create({
      data: {
        projectId,
        userId,
        allocation: parseInt(allocation),
        isManager,
        startDate: new Date()
      }
    });

    return { message: 'メンバーが追加されました' };
  }

  /**
   * プロジェクトからメンバーを削除
   */
  static async removeMemberFromProject(projectId, userId) {
    const membership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (!membership) {
      throw new AppError('メンバーが見つかりません', 404);
    }

    await prisma.projectMembership.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    return { message: 'メンバーが削除されました' };
  }

  /**
   * プロジェクトへのアクセス権限チェック
   */
  static canAccessProject(project, userId, userRole, companyId) {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'COMPANY' && project.companyId === companyId) return true;
    
    // メンバーまたはマネージャーかチェック
    return project.members.some(member => member.userId === userId);
  }

  /**
   * プロジェクトの編集権限チェック
   */
  static canModifyProject(project, userId, userRole, companyId) {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'COMPANY' && project.companyId === companyId) return true;
    return false;
  }
  /**
   * プロジェクトレスポンスのフォーマット
   */
  static formatProjectResponse(project) {
    const managers = project.members.filter(m => m.isManager);
    const members = project.members.filter(m => !m.isManager);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      clientCompanyName: project.clientCompanyName,
      clientContactName: project.clientContactName,
      clientContactPhone: project.clientContactPhone,
      clientContactEmail: project.clientContactEmail,
      clientPrefecture: project.clientPrefecture,
      clientCity: project.clientCity,
      clientStreetAddress: project.clientStreetAddress,
      company: project.company,
      managers,
      members,
      skills: project.skills || [],
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  /**
   * プロジェクトにメンバーを追加
   */
  static async addMemberToProject(projectId, userId, allocation = 100, isManager = false) {
    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // 既にメンバーかチェック
    const existingMember = project.members.find(member => member.userId === userId);
    if (existingMember) {
      throw new AppError('このユーザーは既にプロジェクトのメンバーです', 400);
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    // プロジェクトメンバーとして追加
    const projectMember = await prisma.projectMembership.create({
      data: {
        projectId,
        userId,
        allocation: parseFloat(allocation) / 100, // パーセンテージを小数に変換
        isManager,
        startDate: new Date(),
        endDate: null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return {
      message: 'プロジェクトメンバーを追加しました',
      member: projectMember
    };
  }

  /**
   * プロジェクトからメンバーを削除
   */
  static async removeMemberFromProject(projectId, userId) {
    // メンバーシップの存在確認
    const membership = await prisma.projectMembership.findFirst({
      where: {
        projectId,
        userId
      }
    });

    if (!membership) {
      throw new AppError('プロジェクトメンバーが見つかりません', 404);
    }

    // メンバーシップを削除
    await prisma.projectMembership.delete({
      where: { id: membership.id }
    });

    return {
      message: 'プロジェクトメンバーを削除しました'
    };
  }

  /**
   * プロジェクトメンバーの工数配分を更新
   */
  static async updateMemberAllocation(projectId, userId, allocation) {
    // メンバーシップの存在確認
    const membership = await prisma.projectMembership.findFirst({
      where: {
        projectId,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!membership) {
      throw new AppError('プロジェクトメンバーが見つかりません', 404);
    }

    // 工数配分を更新
    const updatedMembership = await prisma.projectMembership.update({
      where: { id: membership.id },
      data: {
        allocation: parseFloat(allocation) / 100 // パーセンテージを小数に変換
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return updatedMembership;
  }
}

module.exports = ProjectService;
