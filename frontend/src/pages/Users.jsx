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
  TableSortLabel,
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
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  DragIndicator as DragIndicatorIcon,
  Assignment as AssignmentIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon
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

// バリデーションスキーマ
const userSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  role: yup.string().required('ロールは必須です'),
  companyId: yup.string().nullable(),
  position: yup.string().nullable()
});

// ロールの表示名マッピング
const roleLabels = {
  ADMIN: '管理者',
  COMPANY: '会社',
  MANAGER: 'マネージャー',
  MEMBER: 'メンバー'
};

// ロールのアイコンコンポーネント
const RoleIcon = ({ role }) => {
  switch (role) {
    case 'ADMIN':
      return <AdminIcon />;
    case 'COMPANY':
      return <BusinessIcon />;
    case 'MANAGER':
      return <ManagerIcon />;
    default:
      return <PersonIcon />;
  }
};

// ステータスの表示名マッピング
const statusLabels = {
  active: '有効',
  inactive: '無効',
  pending: '保留中'
};

// ステータスの色マッピング
const statusColors = {
  active: 'success',
  inactive: 'error',
  pending: 'warning'
};

// メンバー行コンポーネント
const MemberRow = ({ member, onEdit, onSelect, selected }) => {
  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect(member);
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
          <EmailIcon sx={{ mr: 1, fontSize: 'small' }} />
          {member.email}
        </Box>
      </TableCell>
      <TableCell>{member.position || '-'}</TableCell>
      <TableCell>
        {member.lastLoginAt
          ? new Date(member.lastLoginAt).toLocaleString()
          : '未ログイン'}
      </TableCell>
      <TableCell>
        {new Date(member.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell align="right">
        <Tooltip title="メンバー編集">
          <IconButton size="small" onClick={() => onEdit(member)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

// チーム行コンポーネントを修正
const TeamRow = ({ manager, members, onEdit, onDelete, onSelect, selectedMembers }) => {
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
            <ManagerIcon sx={{ mr: 1, color: 'warning.main' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {manager.firstName} {manager.lastName} チーム
              </Typography>
              <Typography variant="body2" color="text.secondary">
                チームリーダー: {manager.position || '役職未設定'}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EmailIcon sx={{ mr: 1, fontSize: 'small' }} />
            {manager.email}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={`${members.length}名のメンバー`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </TableCell>
        <TableCell>
          {manager.lastLoginAt
            ? new Date(manager.lastLoginAt).toLocaleString()
            : '未ログイン'}
        </TableCell>
        <TableCell>
          {new Date(manager.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell align="right">
          <Tooltip title="チーム編集">
            <IconButton size="small" onClick={() => onEdit(manager)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="チーム削除">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                if (window.confirm('このチームを削除してもよろしいですか？\n所属メンバーは未所属になります。')) {
                  onDelete(manager.id);
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
                チームメンバー一覧
              </Typography>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onEdit={onEdit}
                  onSelect={onSelect}
                  selected={selectedMembers.some(m => m.id === member.id)}
                />
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// 未所属メンバー表示用のコンポーネントを修正
const UnassignedMembersRow = ({ members, onEdit, onDelete, onSelect, selectedMembers }) => {
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
                チーム未所属のメンバー
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
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onEdit={onEdit}
                  onSelect={onSelect}
                  selected={selectedMembers.some(m => m.id === member.id)}
                />
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// マネージャー割り当てダイアログを修正
const AssignManagerDialog = ({ open, onClose, selectedMembers, managers, onAssign }) => {
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const handleAssign = () => {
    onAssign(selectedMembers, selectedManagerId);
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
            <InputLabel>割り当て先</InputLabel>
            <Select
              value={selectedManagerId}
              label="割り当て先"
              onChange={(e) => setSelectedManagerId(e.target.value)}
            >
              <MenuItem value="">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>未所属</Typography>
                </Box>
              </MenuItem>
              {managers.map((manager) => (
                <MenuItem key={manager.id} value={manager.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ManagerIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography>
                      {manager.firstName} {manager.lastName} チーム
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

const Users = () => {
  // チーム一覧用の状態
  const [teamPage, setTeamPage] = useState(0);
  const [teamRowsPerPage, setTeamRowsPerPage] = useState(10);
  const [teamOrderBy, setTeamOrderBy] = useState('createdAt');
  const [teamOrder, setTeamOrder] = useState('desc');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamFilters, setTeamFilters] = useState({
    status: ''
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // DndContextのsensorsをトップレベルで定義
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 会社一覧の取得
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get('/api/companies');
      if (currentUser?.role === 'COMPANY') {
        return response.data.data.companies.filter(company => company.manager.id === currentUser.id);
      }
      return response.data.data.companies;
    }
  });

  // チーム一覧の取得（マネージャーとメンバーを含む）
  const { data: teamData, isLoading: isTeamLoading } = useQuery({
    queryKey: ['teams', teamPage, teamRowsPerPage, teamOrderBy, teamOrder, teamSearchQuery, teamFilters],
    queryFn: async () => {
      // マネージャーとメンバーの両方を取得
      const [managersResponse, membersResponse] = await Promise.all([
        api.get('/api/users', {
          params: {
            page: teamPage + 1,
            limit: teamRowsPerPage,
            sort: `${teamOrderBy}:${teamOrder}`,
            search: teamSearchQuery,
            role: 'MANAGER',
            ...teamFilters
          }
        }),
        api.get('/api/users', {
          params: {
            page: 1,
            limit: 1000, // メンバーは全件取得
            role: 'MEMBER',
            ...teamFilters
          }
        })
      ]);

      console.log('Teams API response:', {
        managers: managersResponse.data.data.users.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          companyId: u.company?.id,
          role: u.role
        })),
        members: membersResponse.data.data.users.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          companyId: u.company?.id,
          role: u.role,
          managerId: u.managerId
        }))
      });

      // マネージャーとメンバーのデータを結合
      const managers = managersResponse.data.data.users;
      const members = membersResponse.data.data.users;

      // 各マネージャーに所属メンバーを追加
      const teamsWithMembers = managers.map(manager => ({
        ...manager,
        members: members.filter(member => member.managerId === manager.id)
      }));

      return {
        users: [...teamsWithMembers, ...members.filter(member => !member.managerId)],
        pagination: managersResponse.data.data.pagination
      };
    }
  });

  // ユーザーの作成/更新
  const saveUser = useMutation({
    mutationFn: async (values) => {
      const userData = {
        ...values,
        role: values.role.toUpperCase(),
        companyId: values.companyId || null,
        position: values.position || null
      };
      
      console.log('Sending user data:', userData);
      
      try {
      if (selectedUser) {
          const { data } = await api.patch(`/api/users/${selectedUser.id}`, userData);
        return data;
      } else {
          const { data } = await api.post('/api/users', userData);
      return data;
        }
      } catch (error) {
        console.error('API Error Response:', {
          status: error.response?.status,
          data: error.response?.data,
          validationErrors: error.response?.data?.error?.errors,
          requestBody: error.response?.data?.error?.requestBody
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      
      // 更新されたユーザーデータをキャッシュに反映
      if (selectedUser) {
        queryClient.setQueryData(['teams', teamPage, teamRowsPerPage, teamOrderBy, teamOrder, teamSearchQuery, teamFilters], 
          oldData => ({
            ...oldData,
            users: oldData.users.map(user => 
              user.id === selectedUser.id ? data.data.user : user
            )
          })
        );
      }

      setSuccess(selectedUser ? 'ユーザーを更新しました' : 'ユーザーを作成しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error saving user:', error.response?.data);
      
      if (error.response?.data?.error?.errors) {
        const validationErrors = error.response.data.error.errors;
        const errorMessages = validationErrors.map(err => {
          const field = err.param;
          const message = err.msg;
          const value = error.response.data.error.requestBody?.[field];
          return `${field}: ${message} (値: ${value})`;
        }).join('\n');
        setError(`バリデーションエラー:\n${errorMessages}`);
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
        setError(errorMessage);
      }
      setSuccess('');
    }
  });

  // ユーザーの削除
  const deleteUser = useMutation({
    mutationFn: async (userId) => {
      const { data } = await api.delete(`/api/users/${userId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setSuccess('ユーザーを削除しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'ユーザーの削除に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // ユーザーのステータス変更
  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      const { data } = await api.patch(`/api/users/${userId}`, { isActive });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setSuccess('ユーザーのステータスを更新しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'ステータスの更新に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // フォーム
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      companyId: '',
      position: ''
    },
    validationSchema: userSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        console.log('Form values:', values);
        await saveUser.mutateAsync(values);
      } catch (error) {
        // Error handling is done in saveUser.mutate
      } finally {
        setSubmitting(false);
      }
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (user = null) => {
    setSelectedUser(user);
    if (user) {
      formik.setValues({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyId: user.company?.id || '',
        position: user.position || ''
      });
    } else {
      formik.resetForm({
        values: {
          firstName: '',
          lastName: '',
          email: '',
          role: currentUser?.role === 'ADMIN' ? '' : 'MEMBER',
          companyId: '',
          position: ''
        }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    formik.resetForm();
  };

  // テーブルのソート
  const handleRequestSort = (property) => {
    const isAsc = teamOrderBy === property && teamOrder === 'asc';
    setTeamOrder(isAsc ? 'desc' : 'asc');
    setTeamOrderBy(property);
  };

  // ページネーション
  const handleChangePage = (event, newPage) => {
    setTeamPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setTeamRowsPerPage(parseInt(event.target.value, 10));
    setTeamPage(0);
  };

  // 検索
  const handleSearch = (event) => {
    setTeamSearchQuery(event.target.value);
    setTeamPage(0);
  };

  // フィルター
  const handleFilterChange = (name, value) => {
    setTeamFilters(prev => ({ ...prev, [name]: value }));
    setTeamPage(0);
  };

  // ドラッグ&ドロップのハンドラーを修正
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    console.log('Drag end event:', {
      active: {
        id: active.id,
        data: active.data.current
      },
      over: over ? {
        id: over.id,
        data: over.data.current
      } : null
    });

    if (!over) {
      console.log('No drop target');
      return;
    }

    // ドラッグ元のメンバーを特定
    const activeMember = teamData.users.find(user => user.id === active.id);
    if (!activeMember || activeMember.role !== 'MEMBER') {
      console.log('Invalid drag source:', { activeMember });
      return;
    }

    // ドロップ先のマネージャーIDを取得
    const targetManagerId = over.data.current.managerId;
    
    // 同じチームへの移動は無視
    if (activeMember.managerId === targetManagerId) {
      console.log('Same team, ignoring');
      return;
    }

    try {
      console.log('Updating member assignment:', {
        memberId: activeMember.id,
        currentManagerId: activeMember.managerId,
        targetManagerId: targetManagerId
      });

      // バックエンドAPIを呼び出してメンバーの所属を更新
      await api.patch(`/api/users/${activeMember.id}`, {
        managerId: targetManagerId
      });

      // キャッシュを更新
      queryClient.invalidateQueries(['teams']);
      setSuccess('メンバーの所属を更新しました');
    } catch (error) {
      console.error('Error updating member assignment:', error);
      setError('メンバーの所属更新に失敗しました');
    }
  };

  // メンバー選択の処理
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [assignManagerDialogOpen, setAssignManagerDialogOpen] = useState(false);

  // メンバー選択の処理
  const handleMemberSelect = (member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id);
      
      // 既に選択されている場合は選択解除
      if (isSelected) {
        return prev.filter(m => m.id !== member.id);
      }

      // 会社管理者の場合の権限チェック
      if (currentUser?.role === 'COMPANY') {
        // メンバーが自分の会社に所属しているか確認
        if (member.company?.id !== currentUser.managedCompany?.id) {
          setError('自分の会社のメンバーのみ選択可能です');
          return prev;
        }
      }

      // 選択可能な場合は追加
      return [...prev, member];
    });
  };

  // マネージャー割り当ての処理
  const handleAssignManager = async (members, managerId) => {
    try {
      if (!currentUser) {
        setError('認証情報が見つかりません。再度ログインしてください。');
        return;
      }

      // デバッグ情報を出力
      console.log('Assigning manager:', {
        currentUser: {
          id: currentUser.id,
          role: currentUser.role,
          managedCompanyId: currentUser.managedCompany?.id,
          managedCompanyName: currentUser.managedCompany?.name
        },
        selectedMembers: members.map(m => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          role: m.role,
          companyId: m.company?.id,
          companyName: m.company?.name
        })),
        targetManagerId: managerId,
        targetManager: teamData?.users.find(m => m.id === managerId)
      });

      // 会社管理者の場合は、自分の会社のメンバーとマネージャーのみ割り当て可能
      if (currentUser.role === 'COMPANY') {
        const companyId = currentUser.managedCompany?.id;
        
        if (!companyId) {
          setError('会社情報が見つかりません。再度ログインしてください。');
          return;
        }

        // 選択されたメンバーが自分の会社のメンバーかどうかを確認
        const invalidMembers = members.filter(member => member.company?.id !== companyId);
        if (invalidMembers.length > 0) {
          console.error('Invalid members:', invalidMembers.map(m => ({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`,
            companyId: m.company?.id,
            expectedCompanyId: companyId
          })));
          setError('自分の会社のメンバーのみ割り当て可能です');
          return;
        }

        // 割り当て先のマネージャーが自分の会社のマネージャーかどうかを確認
        if (managerId) {
          const targetManager = teamData?.users.find(m => m.id === managerId);
          if (!targetManager) {
            setError('選択されたマネージャーが見つかりません');
            return;
          }
          if (targetManager.company?.id !== companyId) {
            console.error('Invalid manager:', {
              id: targetManager.id,
              name: `${targetManager.firstName} ${targetManager.lastName}`,
              companyId: targetManager.company?.id,
              expectedCompanyId: companyId
            });
            setError('自分の会社のマネージャーのみ選択可能です');
            return;
          }
          if (targetManager.role !== 'MANAGER') {
            setError('選択されたユーザーはマネージャーではありません');
            return;
          }
        }
      }

      // 進捗状況を表示
      setSuccess(`メンバーの割り当てを開始します... (0/${members.length})`);

      // メンバーを順次処理
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const member of members) {
        try {
          // 各リクエストの間に少し待機時間を入れる
          await new Promise(resolve => setTimeout(resolve, 500));

          // 更新データの準備
          const updateData = {
            managerId: managerId || null
          };

          // 会社管理者の場合は、会社IDを明示的に設定
          if (currentUser.role === 'COMPANY') {
            updateData.companyId = currentUser.managedCompany?.id;
          }

          console.log('Updating member:', {
            memberId: member.id,
            memberName: `${member.firstName} ${member.lastName}`,
            updateData,
            currentUser: {
              id: currentUser.id,
              role: currentUser.role,
              managedCompanyId: currentUser.managedCompany?.id
            }
          });

          // メンバーの所属を更新
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

      // キャッシュを更新
      queryClient.invalidateQueries(['teams']);

      // 最終結果を表示
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
      console.error('Error assigning manager:', {
        error: {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        },
        currentUser: {
          id: currentUser?.id,
          role: currentUser?.role,
          managedCompanyId: currentUser?.managedCompany?.id
        }
      });
      setError('メンバーの所属更新に失敗しました');
    }
  };

  // デバッグ情報を表示する関数
  const showDebugInfo = () => {
    console.log('=== Debug Information ===');
    console.log('Current User:', {
      id: currentUser?.id,
      name: `${currentUser?.firstName} ${currentUser?.lastName}`,
      role: currentUser?.role,
      companyId: currentUser?.managedCompany?.id,
      companyName: currentUser?.managedCompany?.name
    });

    console.log('Selected Members:', selectedMembers.map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      role: m.role,
      companyId: m.company?.id,
      companyName: m.company?.name,
      managerId: m.managerId
    })));

    console.log('Available Managers:', teamData?.users.filter(m => m.role === 'MANAGER').map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      role: m.role,
      companyId: m.company?.id,
      companyName: m.company?.name,
      managedMembers: teamData?.users.filter(mem => mem.managerId === m.id).length || 0
    })));

    console.log('All Members:', teamData?.users.map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      role: m.role,
      companyId: m.company?.id,
      companyName: m.company?.name,
      managerId: m.managerId,
      managerName: m.manager ? `${m.manager.firstName} ${m.manager.lastName}` : 'None'
    })));
  };

  if (isTeamLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, position: 'relative', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          チーム管理
        </Typography>
        <Box>
          {/* デバッグボタン - 開発環境でのみ表示 */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={showDebugInfo}
              sx={{ mr: 2 }}
            >
              デバッグ情報
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            ユーザーを追加
          </Button>
        </Box>
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
        {/* チーム一覧 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <ManagerIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                チーム一覧
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                （{teamData?.pagination.total || 0}チーム）
              </Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="チームを検索..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
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
                    value={teamFilters.status}
                    label="ステータス"
                    onChange={(e) => setTeamFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="">すべて</MenuItem>
                    <MenuItem value="active">有効</MenuItem>
                    <MenuItem value="inactive">無効</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>チーム名</TableCell>
                    <TableCell>チームリーダー</TableCell>
                    <TableCell>メンバー数</TableCell>
                    <TableCell>最終ログイン</TableCell>
                    <TableCell>作成日</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* 未所属メンバーを表示 */}
                  {teamData?.users.filter(user => user.role === 'MEMBER' && !user.managerId).length > 0 && (
                    <UnassignedMembersRow
                      members={teamData?.users.filter(user => user.role === 'MEMBER' && !user.managerId) || []}
                      onEdit={handleOpenDialog}
                      onDelete={deleteUser.mutate}
                      onSelect={handleMemberSelect}
                      selectedMembers={selectedMembers}
                    />
                  )}
                  
                  {/* チームと所属メンバーを表示 */}
                  {teamData?.users
                    .filter(user => user.role === 'MANAGER')
                    .map((manager) => (
                      <TeamRow
                        key={manager.id}
                        manager={manager}
                        members={manager.members || []}
                        onEdit={handleOpenDialog}
                        onDelete={deleteUser.mutate}
                        onSelect={handleMemberSelect}
                        selectedMembers={selectedMembers}
                      />
                    ))}
                  
                  {teamData?.users.filter(user => user.role === 'MANAGER').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">
                          チームはありません
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={teamData?.pagination.total || 0}
              page={teamPage}
              onPageChange={(e, newPage) => setTeamPage(newPage)}
              rowsPerPage={teamRowsPerPage}
              onRowsPerPageChange={(e) => {
                setTeamRowsPerPage(parseInt(e.target.value, 10));
                setTeamPage(0);
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

      {/* フローティングアクションボタン */}
      <Zoom in={selectedMembers.length > 0}>
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setAssignManagerDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <AssignmentIcon sx={{ mr: 1 }} />
          選択したメンバーをマネージャーに割り当て ({selectedMembers.length}名)
        </Fab>
      </Zoom>

      {/* マネージャー割り当てダイアログ */}
      <AssignManagerDialog
        open={assignManagerDialogOpen}
        onClose={() => setAssignManagerDialogOpen(false)}
        selectedMembers={selectedMembers}
        managers={teamData?.users.filter(user => user.role === 'MANAGER') || []}
        onAssign={handleAssignManager}
      />

      {/* ユーザー作成/編集ダイアログ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={formik.handleSubmit}>
        <DialogTitle>
            {selectedUser ? 'ユーザーを編集' : 'ユーザーを追加'}
        </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="firstName"
                  label="名前（名）"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                  helperText={formik.touched.firstName && formik.errors.firstName}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="lastName"
                  label="名前（姓）"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                  helperText={formik.touched.lastName && formik.errors.lastName}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="email"
                  label="メールアドレス"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>ロール</InputLabel>
                  <Select
                    name="role"
                    value={formik.values.role}
                    label="ロール"
                    onChange={formik.handleChange}
                    error={formik.touched.role && Boolean(formik.errors.role)}
                  >
                    {currentUser?.role === 'ADMIN' 
                      ? Object.entries(roleLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                        ))
                      : ['MANAGER', 'MEMBER'].map((role) => (
                          <MenuItem key={role} value={role}>
                            {roleLabels[role]}
                          </MenuItem>
                        ))
                    }
                  </Select>
                  {formik.touched.role && formik.errors.role && (
                    <FormHelperText error>{formik.errors.role}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                {currentUser?.role === 'ADMIN' && (
                  <FormControl fullWidth>
                    <InputLabel>会社</InputLabel>
                    <Select
                      name="companyId"
                      value={formik.values.companyId}
                      label="会社"
                      onChange={formik.handleChange}
                      error={formik.touched.companyId && Boolean(formik.errors.companyId)}
                    >
                      <MenuItem value="">選択してください</MenuItem>
                      {companiesData?.map((company) => (
                        <MenuItem key={company.id} value={company.id}>
                          {company.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.companyId && formik.errors.companyId && (
                      <FormHelperText error>{formik.errors.companyId}</FormHelperText>
                    )}
                  </FormControl>
                )}
                {currentUser?.role === 'COMPANY' && (
                  <input type="hidden" name="companyId" value={currentUser.managedCompany?.id} />
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="position"
                  label="役職"
                  value={formik.values.position}
                  onChange={formik.handleChange}
                  error={formik.touched.position && Boolean(formik.errors.position)}
                  helperText={formik.touched.position && formik.errors.position}
                />
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
              {selectedUser ? '更新' : '作成'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Users; 