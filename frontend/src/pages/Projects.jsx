import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  FormHelperText,
  Checkbox,
  Fab,
  Zoom,
  Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProjectMemberPeriodDialog from '../components/ProjectMemberPeriodDialog';

// バリデーションスキーマ
const projectSchema = yup.object({
  name: yup.string().required('プロジェクト名は必須です'),
  description: yup.string(),
  startDate: yup.date().required('開始日は必須です'),
  endDate: yup.date()
    .nullable()
    .transform((value, originalValue) => {
      // 空文字列、null、undefined の場合は null を返す
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return null;
      }
      // それ以外の場合は日付として変換を試みる
      const date = new Date(originalValue);
      return isNaN(date.getTime()) ? null : date;
    }),
  status: yup.string().required('ステータスは必須です'),
  managerId: yup.string().required('プロジェクトマネージャーは必須です')
});

// ステータスの表示名マッピング
const statusLabels = {
  ACTIVE: '進行中',
  COMPLETED: '完了',
  ON_HOLD: '保留中',
  CANCELLED: '中止'
};

// ステータスの色マッピング
const statusColors = {
  ACTIVE: 'success',
  COMPLETED: 'info',
  ON_HOLD: 'warning',
  CANCELLED: 'error'
};

// メンバー行コンポーネント
const MemberRow = ({ member, project, onEdit, onSelect, selected, onPeriodEdit }) => {
  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect(member);
  };

  // プロジェクトメンバーシップの開始日と終了日を取得
  const projectMembership = member.projectMembership || {};
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return '-';
    }
  };

  return (
    <TableRow hover>
      <TableCell padding="checkbox">
        <Checkbox
          checked={selected}
          onChange={handleCheckboxClick}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
          {member.firstName} {member.lastName}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BusinessIcon sx={{ mr: 1, fontSize: 'small' }} />
          {member.position || '-'}
        </Box>
      </TableCell>
      <TableCell>{formatDate(projectMembership.startDate)}</TableCell>
      <TableCell>{formatDate(projectMembership.endDate)}</TableCell>
      <TableCell>
        {member.lastLoginAt
          ? new Date(member.lastLoginAt).toLocaleString()
          : '未ログイン'}
      </TableCell>
      <TableCell>
        {new Date(member.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell align="right">
        {!project ? (
          <Tooltip title="メンバー編集">
            <IconButton size="small" onClick={(e) => {
              e.stopPropagation();
              onEdit(member);
            }}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="メンバー期間編集">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onPeriodEdit(member, project);
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
};

// プロジェクト行コンポーネント
const ProjectRow = ({ project, members, onEdit, onDelete, onSelect, onPeriodEdit, selectedMembers }) => {
  const [expanded, setExpanded] = useState(false);

  // プロジェクトのメンバーを取得
  const projectMembers = project.members || [];
  console.log('Project members for', project.name, ':', projectMembers); // デバッグログ追加

  return (
    <>
      <TableRow hover sx={{ bgcolor: 'background.default' }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', pl: 2 }}>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 1 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {project.name}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  プロジェクトマネージャー: {project.manager?.firstName} {project.manager?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ステータス: {statusLabels[project.status]}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  メンバー数: {projectMembers.length}名
                </Typography>
              </Box>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, fontSize: 'small' }} />
            {project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : '未設定'}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={statusLabels[project.status]}
            color={statusColors[project.status]}
            size="small"
          />
        </TableCell>
        <TableCell>
          {new Date(project.startDate).toLocaleDateString()}
        </TableCell>
        <TableCell>
          {project.endDate ? new Date(project.endDate).toLocaleDateString() : '未設定'}
        </TableCell>
        <TableCell align="right">
          <Tooltip title="プロジェクト編集">
            <IconButton size="small" onClick={() => onEdit(project)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="プロジェクト削除">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                if (window.confirm('このプロジェクトを削除してもよろしいですか？\n所属メンバーは未所属になります。')) {
                  onDelete(project.id);
                }
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ pl: 4, pr: 2, py: 1, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                プロジェクトメンバー一覧 ({projectMembers.length}名)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>名前</TableCell>
                      <TableCell>役職</TableCell>
                      <TableCell>開始日</TableCell>
                      <TableCell>終了日</TableCell>
                      <TableCell>最終ログイン</TableCell>
                      <TableCell>作成日</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projectMembers.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        project={project}
                        onEdit={onEdit}
                        onSelect={onSelect}
                        onPeriodEdit={onPeriodEdit}
                        selected={selectedMembers.some(m => m.id === member.id)}
                      />
                    ))}
                    {projectMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary">
                            メンバーが割り当てられていません
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// 未所属メンバー表示用のコンポーネント
const UnassignedMembersRow = ({ members, onEdit, onSelect, onPeriodEdit, selectedMembers }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow hover sx={{ bgcolor: 'background.default' }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', pl: 2 }}>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ mr: 1 }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                未所属メンバー
              </Typography>
              <Typography variant="body2" color="text.secondary">
                プロジェクト未所属のメンバー
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell colSpan={4}>
          <Chip
            label={`${members.length}名のメンバー`}
            color="default"
            variant="outlined"
            size="small"
          />
        </TableCell>
        <TableCell align="right">
          <Tooltip title="メンバー編集">
            <IconButton size="small" onClick={() => onEdit(members[0])}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ pl: 4, pr: 2, py: 1, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                未所属メンバー一覧
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>名前</TableCell>
                      <TableCell>役職</TableCell>
                      <TableCell>最終ログイン</TableCell>
                      <TableCell>作成日</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        onEdit={onEdit}
                        onSelect={onSelect}
                        onPeriodEdit={onPeriodEdit}
                        selected={selectedMembers.some(m => m.id === member.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// メンバー割り当てダイアログ
const AssignMemberDialog = ({ open, onClose, selectedMembers, projects, onAssign }) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const handleAssign = () => {
    onAssign(selectedMembers, selectedProjectId);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        メンバーの割り当て
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            選択されたメンバー: {selectedMembers.length}名
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>割り当て先プロジェクト</InputLabel>
            <Select
              value={selectedProjectId}
              label="割り当て先プロジェクト"
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <MenuItem value="">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>未所属</Typography>
                </Box>
              </MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography>
                      {project.name}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        <Button 
          onClick={handleAssign} 
          variant="contained"
        >
          割り当て
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Projects = () => {
  // プロジェクト一覧用の状態
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: ''
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // DndContextのsensorsをトップレベルで定義
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ&ドロップの処理
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = projectsData?.projects.findIndex(project => project.id === active.id);
      const newIndex = projectsData?.projects.findIndex(project => project.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // プロジェクトの順序を更新
        const reorderedProjects = arrayMove(projectsData.projects, oldIndex, newIndex);
        
        // TODO: バックエンドAPIを呼び出して順序を保存
        // 現在はフロントエンド側でのみ順序を変更
        queryClient.setQueryData(['projects', page, rowsPerPage, searchQuery, filters], {
          ...projectsData,
          projects: reorderedProjects
        });
      }
    }
  };

  // プロジェクト一覧の取得
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', page, rowsPerPage, searchQuery, filters],
    queryFn: async () => {
      const response = await api.get('/api/projects', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: searchQuery,
          ...filters
        }
      });
      console.log('Fetched projects:', response.data.data.projects); // デバッグログ追加
      return response.data.data;
    }
  });

  // マネージャー一覧の取得（プロジェクトマネージャー選択用）
  const { data: managersData, isLoading: isLoadingManagers } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          role: ['MANAGER'],
          limit: 1000,
          include: ['company']
        }
      });
      return response.data.data.users;
    }
  });

  // 全メンバー一覧の取得（未所属メンバー表示用）
  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          limit: 1000,
          include: ['projectMemberships', 'company']
        }
      });
      return response.data.data.users;
    }
  });

  // 未所属メンバーのフィルタリングロジック
  const unassignedMembers = membersData?.filter(member => {
    const hasActiveProject = member.projects?.some(project => {
      const now = new Date();
      const startDate = project.startDate ? new Date(project.startDate) : null;
      const endDate = project.endDate ? new Date(project.endDate) : null;
      return startDate && startDate <= now && (!endDate || endDate > now);
    });
    return !hasActiveProject;
  });

  console.log('Unassigned members:', unassignedMembers);

  // プロジェクトの作成/更新
  const saveProject = useMutation({
    mutationFn: async (values) => {
      console.log('Current user info:', {
        id: currentUser?.id,
        role: currentUser?.role,
        email: currentUser?.email,
        managedCompanyId: currentUser?.managedCompanyId,
        companyId: currentUser?.companyId,
        managedCompany: currentUser?.managedCompany
      });
      
      // 会社IDの設定
      let companyId;
      if (currentUser?.role === 'COMPANY') {
        companyId = currentUser.managedCompanyId;
        console.log('Company manager creating project:', {
          managedCompanyId: companyId,
          managedCompany: currentUser.managedCompany
        });
      } else if (currentUser?.role === 'MANAGER') {
        companyId = currentUser.companyId;
        console.log('Manager creating project:', {
          companyId: companyId,
          company: currentUser.company
        });
      }

      if (!companyId) {
        console.error('Company ID not found:', {
          userRole: currentUser?.role,
          managedCompanyId: currentUser?.managedCompanyId,
          companyId: currentUser?.companyId,
          currentUser: currentUser
        });
        throw new Error('会社IDが見つかりません');
      }

      const projectData = {
        ...values,
        companyId,
        status: values.status.toUpperCase(),
        startDate: new Date(values.startDate).toISOString(),
        endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
        managerId: values.managerId // マネージャーIDを明示的に設定
      };
      
      console.log('Processed project data:', projectData);
      
      try {
        if (selectedProject) {
          const { data } = await api.patch(`/api/projects/${selectedProject.id}`, projectData);
          return data;
        } else {
          const { data } = await api.post('/api/projects', projectData);
          return data;
        }
      } catch (error) {
        console.error('API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          requestData: projectData,
          currentUser: {
            id: currentUser?.id,
            role: currentUser?.role,
            email: currentUser?.email,
            managedCompanyId: currentUser?.managedCompanyId,
            companyId: currentUser?.companyId
          }
        });
        throw error;
      }
    },
    onSuccess: () => {
      // クエリの無効化を修正
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['members'] })
      ]);
      setSuccess(selectedProject ? 'プロジェクトを更新しました' : 'プロジェクトを作成しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Project save error:', {
        response: error.response?.data,
        validationErrors: error.response?.data?.error?.errors,
        requestData: error.config?.data,
        message: error.message
      });
      
      let errorMessage = 'プロジェクトの保存に失敗しました';
      
      if (error.response?.data?.error?.errors) {
        const validationErrors = error.response.data.error.errors;
        const errorMessages = validationErrors.map(err => {
          const field = err.field || err.param;
          const message = err.message || err.msg;
          const value = error.response.data.error.requestBody?.[field];
          return `${field}: ${message}${value ? ` (値: ${value})` : ''}`;
        }).join('\n');
        errorMessage = `バリデーションエラー:\n${errorMessages}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setSuccess('');
    }
  });

  // プロジェクトの削除
  const deleteProject = useMutation({
    mutationFn: async (projectId) => {
      const { data } = await api.delete(`/api/projects/${projectId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSuccess('プロジェクトを削除しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'プロジェクトの削除に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // フォーム
  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'ACTIVE',
      managerId: ''
    },
    validationSchema: projectSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        console.log('Form submitted with values:', {
          ...values,
          currentUser: {
            role: currentUser?.role,
            companyId: currentUser?.companyId,
            managedCompany: currentUser?.managedCompany
          }
        });
        await saveProject.mutateAsync(values);
      } catch (error) {
        console.error('Form submission error:', {
          error: error.message,
          response: error.response?.data,
          validationErrors: error.response?.data?.error?.errors
        });
        // Error handling is done in saveProject.mutate
      } finally {
        setSubmitting(false);
      }
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (project = null) => {
    setSelectedProject(project);
    if (project) {
      // 日付の処理を修正
      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        } catch (e) {
          console.error('Date parsing error:', e);
          return '';
        }
      };

      formik.setValues({
        name: project.name,
        description: project.description || '',
        startDate: formatDate(project.startDate),
        endDate: formatDate(project.endDate),
        status: project.status,
        managerId: project.managerId
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProject(null);
    formik.resetForm();
  };

  // メンバー選択の処理
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [assignMemberDialogOpen, setAssignMemberDialogOpen] = useState(false);

  // メンバー選択の処理
  const handleMemberSelect = (member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id);
      if (isSelected) {
        return prev.filter(m => m.id !== member.id);
      }
      return [...prev, member];
    });
  };

  // メンバー割り当ての処理
  const handleAssignMember = async (members, projectId) => {
    try {
      setSuccess(`メンバーの割り当てを開始します... (0/${members.length})`);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const member of members) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));

          const updateData = {
            projectId: projectId || null
          };

          const response = await api.patch(`/api/users/${member.id}`, updateData);
          console.log('Update response:', response.data);
          
          successCount++;
          setSuccess(`メンバーの割り当てを処理中... (${successCount}/${members.length})`);
        } catch (error) {
          errorCount++;
          console.error('Error updating member:', {
            memberId: member.id,
            memberName: `${member.firstName} ${member.lastName}`,
            error: {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message
            }
          });
          const errorMessage = error.response?.data?.message || error.response?.data?.error || '更新に失敗しました';
          errors.push({
            member: `${member.firstName} ${member.lastName}`,
            error: errorMessage
          });
        }
      }

      // クエリの無効化を修正
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] })
      ]);

      // メンバー一覧を即時再取得
      await queryClient.refetchQueries({ queryKey: ['members'] });

      // 結果の表示
      if (errorCount === 0) {
        setSuccess(`${successCount}名のメンバーの所属を更新しました`);
      } else {
        setError(`${errorCount}名のメンバーの更新に失敗しました。\n${errors.map(e => `${e.member}: ${e.error}`).join('\n')}`);
        if (successCount > 0) {
          setSuccess(`${successCount}名のメンバーの所属を更新しました`);
        }
      }

      setSelectedMembers([]);
    } catch (error) {
      console.error('Error assigning member:', error);
      setError('メンバーの所属更新に失敗しました');
    }
  };

  // メンバー期間の更新
  const updateMemberPeriod = useMutation({
    mutationFn: async ({ projectId, userId, startDate, endDate }) => {
      // プロジェクトの終了日を取得
      const project = projectsData?.projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error('プロジェクトが見つかりません');
      }

      // プロジェクトの終了日がある場合、メンバーの終了日がそれを超えていないかチェック
      if (project.endDate && endDate) {
        const projectEndDate = new Date(project.endDate);
        const memberEndDate = new Date(endDate);
        // 時刻部分を切り捨てて日付のみで比較
        projectEndDate.setHours(0, 0, 0, 0);
        memberEndDate.setHours(0, 0, 0, 0);
        if (memberEndDate > projectEndDate) {
          throw new Error('メンバーの終了日はプロジェクトの終了日を超えることはできません');
        }
      }

      // プロジェクトの開始日より前の開始日は設定できない
      const projectStartDate = new Date(project.startDate);
      const memberStartDate = new Date(startDate);
      // 時刻部分を切り捨てて日付のみで比較
      projectStartDate.setHours(0, 0, 0, 0);
      memberStartDate.setHours(0, 0, 0, 0);
      if (memberStartDate < projectStartDate) {
        throw new Error('メンバーの開始日はプロジェクトの開始日より前には設定できません');
      }

      const { data } = await api.patch(`/api/projects/${projectId}/members/${userId}/period`, {
        startDate,
        endDate
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSuccess('メンバーの期間を更新しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || error.message || 'メンバーの期間更新に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // メンバー期間編集ダイアログを開く
  const handleOpenPeriodDialog = (member, project) => {
    setSelectedMember(member);
    setSelectedProject(project);
    setPeriodDialogOpen(true);
  };

  // メンバー期間編集ダイアログを閉じる
  const handleClosePeriodDialog = () => {
    setPeriodDialogOpen(false);
    setSelectedMember(null);
    setSelectedProject(null);
  };

  // メンバー期間の保存
  const handleSaveMemberPeriod = async (values) => {
    if (!selectedMember || !selectedProject) return;
    
    await updateMemberPeriod.mutateAsync({
      projectId: selectedProject.id,
      userId: selectedMember.id,
      ...values
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          プロジェクト管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          プロジェクトを追加
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                プロジェクト一覧
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                （{projectsData?.pagination.total || 0}プロジェクト）
              </Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="プロジェクトを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={filters.status}
                    label="ステータス"
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="">すべて</MenuItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>プロジェクト名</TableCell>
                    <TableCell>プロジェクトマネージャー</TableCell>
                    <TableCell>ステータス</TableCell>
                    <TableCell>開始日</TableCell>
                    <TableCell>終了日</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unassignedMembers?.length > 0 && (
                    <UnassignedMembersRow
                      members={unassignedMembers || []}
                      onEdit={handleOpenDialog}
                      onSelect={handleMemberSelect}
                      onPeriodEdit={handleOpenPeriodDialog}
                      selectedMembers={selectedMembers}
                    />
                  )}
                  
                  {projectsData?.projects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      members={project.members || []}
                      onEdit={handleOpenDialog}
                      onDelete={deleteProject.mutate}
                      onSelect={handleMemberSelect}
                      onPeriodEdit={handleOpenPeriodDialog}
                      selectedMembers={selectedMembers}
                    />
                  ))}
                  
                  {projectsData?.projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          プロジェクトはありません
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={projectsData?.pagination.total || 0}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="表示件数:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} / ${count}`
              }
            />
          </CardContent>
        </Card>
      </DndContext>

      <Zoom in={selectedMembers.length > 0}>
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setAssignMemberDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <AssignmentIcon sx={{ mr: 1 }} />
          選択したメンバーをプロジェクトに割り当て ({selectedMembers.length}名)
        </Fab>
      </Zoom>

      <AssignMemberDialog
        open={assignMemberDialogOpen}
        onClose={() => setAssignMemberDialogOpen(false)}
        selectedMembers={selectedMembers}
        projects={projectsData?.projects || []}
        onAssign={handleAssignMember}
      />

      <ProjectMemberPeriodDialog
        open={periodDialogOpen}
        onClose={handleClosePeriodDialog}
        member={selectedMember}
        project={selectedProject}
        onSave={handleSaveMemberPeriod}
        projectStartDate={selectedProject?.startDate}
        projectEndDate={selectedProject?.endDate}
      />

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {selectedProject ? 'プロジェクトを編集' : 'プロジェクトを追加'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="プロジェクト名"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="説明"
                  multiline
                  rows={3}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="startDate"
                  label="開始日"
                  type="date"
                  value={formik.values.startDate}
                  onChange={formik.handleChange}
                  error={formik.touched.startDate && Boolean(formik.errors.startDate)}
                  helperText={formik.touched.startDate && formik.errors.startDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="endDate"
                  label="終了日"
                  type="date"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  error={formik.touched.endDate && Boolean(formik.errors.endDate)}
                  helperText={formik.touched.endDate && formik.errors.endDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    name="status"
                    value={formik.values.status}
                    label="ステータス"
                    onChange={formik.handleChange}
                    error={formik.touched.status && Boolean(formik.errors.status)}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.status && formik.errors.status && (
                    <FormHelperText error>{formik.errors.status}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>プロジェクトマネージャー</InputLabel>
                  <Select
                    name="managerId"
                    value={formik.values.managerId}
                    label="プロジェクトマネージャー"
                    onChange={formik.handleChange}
                    error={formik.touched.managerId && Boolean(formik.errors.managerId)}
                  >
                    {managersData?.map((manager) => (
                      <MenuItem key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName}
                        {manager.company && ` (${manager.company.name})`}
                      </MenuItem>
                    ))}
                  </Select>
                  {formik.touched.managerId && formik.errors.managerId && (
                    <FormHelperText error>{formik.errors.managerId}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting}
            >
              {selectedProject ? '更新' : '作成'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Projects; 