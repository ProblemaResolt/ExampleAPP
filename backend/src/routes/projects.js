const express = require('express');
const { authenticate, authorize } = require('../middleware/authentication');
const ProjectController = require('../controllers/ProjectController');
const ProjectValidator = require('../validators/ProjectValidator');

const router = express.Router();

// プロジェクト一覧を取得
router.get('/', 
  authenticate, 
  ProjectController.getProjects
);

// ユーザーの参加プロジェクト一覧を取得
router.get('/my-projects', 
  authenticate, 
  ProjectController.getUserProjects
);

// プロジェクト詳細を取得
router.get('/:id', 
  authenticate, 
  ProjectController.getProjectById
);

// プロジェクトを作成
router.post('/', 
  authenticate, 
  authorize('ADMIN', 'COMPANY'), 
  ProjectValidator.create,
  ProjectController.createProject
);

// プロジェクトを更新
router.put('/:id', 
  authenticate, 
  authorize('ADMIN', 'COMPANY'), 
  ProjectValidator.update,
  ProjectController.updateProject
);

// プロジェクトを削除
router.delete('/:id', 
  authenticate, 
  authorize('ADMIN', 'COMPANY'), 
  ProjectController.deleteProject
);

// プロジェクトにメンバーを追加
router.post('/:id/members', 
  authenticate, 
  authorize('ADMIN', 'COMPANY'), 
  ProjectValidator.addMember,
  ProjectController.addMemberToProject
);

// プロジェクトからメンバーを削除
router.delete('/:id/members/:userId', 
  authenticate, 
  authorize('ADMIN', 'COMPANY'), 
  ProjectController.removeMemberFromProject
);

// プロジェクトメンバーの工数配分を更新
router.patch('/:id/members/:userId/allocation', 
  authenticate, 
  authorize('ADMIN', 'COMPANY'), 
  ProjectValidator.updateMemberAllocation,
  ProjectController.updateMemberAllocation
);

module.exports = router;
