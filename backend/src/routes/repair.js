const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/authentication');
const router = express.Router();
const prisma = new PrismaClient();

router.post('/repair-work-settings', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    
    const results = {
      deletedDuplicates: 0,
      newAssignments: 0,
      finalSettings: []
    };
    
    // Step 1: 現状確認
      const projects = await prisma.project.findMany({
      include: {
        workSettings: {
          orderBy: { createdAt: 'desc' }
        },
        members: true
      }
    });
    
    
    // Step 2: 重複削除
      for (const project of projects) {
      if (project.workSettings.length > 1) {
        const toDelete = project.workSettings.slice(1);
        
        for (const setting of toDelete) {
          // 関連するユーザー割り当ても削除
          await prisma.userProjectWorkSettings.deleteMany({
            where: { projectWorkSettingsId: setting.id }
          });
          
          await prisma.projectWorkSettings.delete({
            where: { id: setting.id }
          });
          
          results.deletedDuplicates++;
        }
      }
    }
    
    // Step 3: メンバーへの自動割り当て
    
    const settingsWithMembers = await prisma.projectWorkSettings.findMany({
      include: {
        project: {
          include: {
            members: true
          }
        },
        userAssignments: true
      }
    });
    
    for (const setting of settingsWithMembers) {
      const assignedUserIds = setting.userAssignments.map(a => a.userId);
      const unassignedMembers = setting.project.members.filter(
        member => !assignedUserIds.includes(member.userId)
      );
      
      if (unassignedMembers.length > 0) {
        
        const assignments = unassignedMembers.map(member => ({
          userId: member.userId,
          projectWorkSettingsId: setting.id,
          startDate: new Date(),
          endDate: null,
          isActive: true
        }));
        
        const created = await prisma.userProjectWorkSettings.createMany({
          data: assignments
        });
        
        results.newAssignments += created.count;
      }
    }
    
    // Step 4: 修復結果の確認
    
    const finalSettings = await prisma.projectWorkSettings.findMany({
      include: {
        project: {
          select: {
            name: true
          }
        },
        userAssignments: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    results.finalSettings = finalSettings.map(setting => ({
      projectName: setting.project.name,
      settingName: setting.name,
      workTime: `${setting.workStartTime} - ${setting.workEndTime}`,
      assignedMembers: setting.userAssignments.length,
      members: setting.userAssignments.map(assignment => 
        `${assignment.user.lastName} ${assignment.user.firstName}`
      )
    }));
    
    
    res.json({
      success: true,
      message: 'プロジェクト勤務設定の修復が完了しました',
      results: results
    });
    
  } catch (error) {
    console.error('修復エラー:', error);
    res.status(500).json({
      success: false,
      message: '修復中にエラーが発生しました',
      error: error.message
    });  }
});

// 修復後の状態確認用API（管理者のみ）
router.get('/check-work-settings', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const settings = await prisma.projectWorkSettings.findMany({
      include: {
        project: {
          select: {
            name: true
          }
        },
        userAssignments: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    const result = settings.map(setting => ({
      projectName: setting.project.name,
      settingName: setting.name,
      workTime: `${setting.workStartTime} - ${setting.workEndTime}`,
      assignedMembers: setting.userAssignments.length,
      members: setting.userAssignments.map(assignment => 
        `${assignment.user.lastName} ${assignment.user.firstName}`
      )
    }));
    
    res.json({
      success: true,
      totalSettings: settings.length,
      settings: result
    });
      } catch (error) {
    console.error('設定確認エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// プロジェクトの勤務設定詳細確認用API（管理者のみ）
router.get('/check-project-details/:projectId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // プロジェクト詳細と勤務設定を取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
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
        },
        workSettings: {
          include: {
            userAssignments: {
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
          }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'プロジェクトが見つかりません'
      });
    }
    
    // メンバーの勤務設定を確認
    const membersWithWorkSettings = [];
    
    for (const membership of project.members) {
      const userId = membership.user.id;
      
      // プロジェクト勤務設定を検索
      let workSettingsAssignment = null;
      
      for (const setting of project.workSettings) {
        const userAssignment = setting.userAssignments?.find(ua => ua.userId === userId && ua.isActive);
        if (userAssignment) {
          workSettingsAssignment = {
            projectWorkSettingName: setting.name,
            workStartTime: setting.workStartTime,
            workEndTime: setting.workEndTime,
            breakTime: setting.breakTime,
            workHours: setting.workHours
          };
          break;
        }
      }
      
      membersWithWorkSettings.push({
        ...membership.user,
        projectMembership: {
          startDate: membership.startDate,
          endDate: membership.endDate,
          allocation: membership.allocation
        },
        workSettingsAssignment
      });
    }
    
    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        workSettings: project.workSettings.map(setting => ({
          id: setting.id,
          name: setting.name,
          workStartTime: setting.workStartTime,
          workEndTime: setting.workEndTime,
          breakTime: setting.breakTime,
          workHours: setting.workHours,
          assignedUsersCount: setting.userAssignments.length
        })),
        members: membersWithWorkSettings
      }
    });
    
  } catch (error) {
    console.error('プロジェクト詳細確認エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
