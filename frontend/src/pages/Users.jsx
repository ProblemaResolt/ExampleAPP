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
  Zoom
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
  Assignment as AssignmentIcon
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
const MemberRow = ({ member, onEdit, onDelete, onSelect, selected }) => {
  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect(member);
  };

  const handleRowClick = (e) => {
    // チェックボックスやボタンがクリックされた場合は何もしない
    if (e.target.closest('button') || e.target.closest('input[type="checkbox"]')) {
      return;
    }
    onSelect(member);
  };

  return (
    <TableRow 
      hover
      selected={selected}
      onClick={handleRowClick}
      sx={{ cursor: 'pointer' }}
    >
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
        {member.manager ? (
          <Chip
            label={`${member.manager.firstName} ${member.manager.lastName}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        ) : (
          <Chip
            label="未所属"
            color="default"
            variant="outlined"
            size="small"
          />
        )}
      </TableCell>
      <TableCell>
        {member.lastLoginAt
          ? new Date(member.lastLoginAt).toLocaleString()
          : '未ログイン'}
      </TableCell>
      <TableCell>
        {new Date(member.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell align="right">
        <Tooltip title="編集">
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation();
            onEdit(member);
          }}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="削除">
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('このメンバーを削除してもよろしいですか？')) {
                onDelete(member.id);
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

// マネージャー行コンポーネント
const ManagerRow = ({ manager, members, onEdit, onDelete }) => {
  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ManagerIcon sx={{ mr: 1, color: 'warning.main' }} />
          {manager.firstName} {manager.lastName}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EmailIcon sx={{ mr: 1, fontSize: 'small' }} />
          {manager.email}
        </Box>
      </TableCell>
      <TableCell>{manager.position || '-'}</TableCell>
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
        <Tooltip title="編集">
          <IconButton size="small" onClick={() => onEdit(manager)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="削除">
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              if (window.confirm('このマネージャーを削除してもよろしいですか？\n所属メンバーは未所属になります。')) {
                onDelete(manager.id);
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

// マネージャー割り当てダイアログ
const AssignManagerDialog = ({ open, onClose, selectedMembers, managers, onAssign }) => {
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const handleAssign = () => {
    if (selectedManagerId) {
      onAssign(selectedMembers, selectedManagerId);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        マネージャーを割り当て
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            選択されたメンバー: {selectedMembers.length}名
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>マネージャー</InputLabel>
            <Select
              value={selectedManagerId}
              label="マネージャー"
              onChange={(e) => setSelectedManagerId(e.target.value)}
            >
              <MenuItem value="">未所属</MenuItem>
              {managers.map((manager) => (
                <MenuItem key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button 
          onClick={handleAssign} 
          variant="contained"
          disabled={!selectedManagerId}
        >
          割り当て
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Users = () => {
  // メンバー用の状態
  const [memberPage, setMemberPage] = useState(0);
  const [memberRowsPerPage, setMemberRowsPerPage] = useState(10);
  const [memberOrderBy, setMemberOrderBy] = useState('createdAt');
  const [memberOrder, setMemberOrder] = useState('desc');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilters, setMemberFilters] = useState({
    status: ''
  });

  // マネージャー用の状態
  const [managerPage, setManagerPage] = useState(0);
  const [managerRowsPerPage, setManagerRowsPerPage] = useState(10);
  const [managerOrderBy, setManagerOrderBy] = useState('createdAt');
  const [managerOrder, setManagerOrder] = useState('desc');
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [managerFilters, setManagerFilters] = useState({
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

  // メンバー一覧の取得
  const { data: memberData, isLoading: isMemberLoading } = useQuery({
    queryKey: ['members', memberPage, memberRowsPerPage, memberOrderBy, memberOrder, memberSearchQuery, memberFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: memberPage + 1,
        limit: memberRowsPerPage,
        sort: `${memberOrderBy}:${memberOrder}`,
        search: memberSearchQuery,
        role: 'MEMBER',
        ...memberFilters
      });

      console.log('Fetching members with params:', {
        params: Object.fromEntries(params.entries()),
        currentUser: {
          id: currentUser?.id,
          role: currentUser?.role,
          managedCompanyId: currentUser?.managedCompany?.id
        }
      });

      const response = await api.get(`/api/users?${params}`);
      
      console.log('Members API response:', {
        total: response.data.data.pagination.total,
        users: response.data.data.users.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          companyId: u.company?.id,
          role: u.role,
          managerId: u.managerId,
          manager: u.manager ? {
            id: u.manager.id,
            name: `${u.manager.firstName} ${u.manager.lastName}`
          } : null
        }))
      });

      return response.data.data;
    }
  });

  // マネージャー一覧の取得
  const { data: managerData, isLoading: isManagerLoading } = useQuery({
    queryKey: ['managers', managerPage, managerRowsPerPage, managerOrderBy, managerOrder, managerSearchQuery, managerFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: managerPage + 1,
        limit: managerRowsPerPage,
        sort: `${managerOrderBy}:${managerOrder}`,
        search: managerSearchQuery,
        role: 'MANAGER',
        ...managerFilters
      });

      console.log('Fetching managers with params:', {
        params: Object.fromEntries(params.entries()),
        currentUser: {
          id: currentUser?.id,
          role: currentUser?.role,
          managedCompanyId: currentUser?.managedCompany?.id
        }
      });

      const response = await api.get(`/api/users?${params}`);
      
      console.log('Managers API response:', {
        total: response.data.data.pagination.total,
        users: response.data.data.users.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          companyId: u.company?.id,
          role: u.role,
          managedMembers: memberData?.users.filter(m => m.managerId === u.id).length || 0
        }))
      });

      return response.data.data;
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
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      
      // 更新されたユーザーデータをキャッシュに反映
      if (selectedUser) {
        queryClient.setQueryData(['members', memberPage, memberRowsPerPage, memberOrderBy, memberOrder, memberSearchQuery, memberFilters], 
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
      queryClient.invalidateQueries({ queryKey: ['members', 'managers'] });
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
      queryClient.invalidateQueries({ queryKey: ['members', 'managers'] });
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
    const isAsc = memberOrderBy === property && memberOrder === 'asc';
    setMemberOrder(isAsc ? 'desc' : 'asc');
    setMemberOrderBy(property);
  };

  // ページネーション
  const handleChangePage = (event, newPage) => {
    setMemberPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setMemberRowsPerPage(parseInt(event.target.value, 10));
    setMemberPage(0);
  };

  // 検索
  const handleSearch = (event) => {
    setMemberSearchQuery(event.target.value);
    setMemberPage(0);
  };

  // フィルター
  const handleFilterChange = (name, value) => {
    setMemberFilters(prev => ({ ...prev, [name]: value }));
    setMemberPage(0);
  };

  // マネージャーを追加するためのハンドラー
  const handleAddManager = () => {
    formik.resetForm({
      values: {
        firstName: '',
        lastName: '',
        email: '',
        role: 'MANAGER',
        companyId: currentUser?.managedCompany?.id || '',
        position: ''
      }
    });
    setOpenDialog(true);
  };

  // メンバーの所属変更を処理する関数
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
    const activeMember = memberData.users.find(user => user.id === active.id);
    if (!activeMember || activeMember.role !== 'MEMBER') {
      console.log('Invalid drag source:', { activeMember });
      return;
    }

    // ドロップ先がマネージャーのメンバー表示部分かどうかを確認
    if (over.id.startsWith('manager-members-')) {
      const managerId = over.data.current.managerId;
      const targetManager = managerData.users.find(user => user.id === managerId);
      
      console.log('Drop target:', {
        managerId,
        targetManager,
        activeMember
      });

      if (!targetManager || targetManager.role !== 'MANAGER') {
        console.log('Invalid drop target:', { targetManager });
        return;
      }

      try {
        console.log('Updating member assignment:', {
          memberId: activeMember.id,
          managerId: managerId
        });

        // バックエンドAPIを呼び出してメンバーの所属を更新
        await api.patch(`/api/users/${activeMember.id}`, {
          managerId: managerId
        });

        // キャッシュを更新
        queryClient.invalidateQueries(['members', 'managers']);
        setSuccess('メンバーの所属を更新しました');
      } catch (error) {
        console.error('Error updating member assignment:', error);
        setError('メンバーの所属更新に失敗しました');
      }
    } else {
      console.log('Invalid drop target ID:', over.id);
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
        targetManager: managerData?.users.find(m => m.id === managerId)
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
          const targetManager = managerData?.users.find(m => m.id === managerId);
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
      queryClient.invalidateQueries(['members', 'managers']);

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

    console.log('Available Managers:', managerData?.users.map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      role: m.role,
      companyId: m.company?.id,
      companyName: m.company?.name,
      managedMembers: memberData?.users.filter(mem => mem.managerId === m.id).length || 0
    })));

    console.log('All Members:', memberData?.users.map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      role: m.role,
      companyId: m.company?.id,
      companyName: m.company?.name,
      managerId: m.managerId,
      managerName: m.manager ? `${m.manager.firstName} ${m.manager.lastName}` : 'None'
    })));
  };

  if (isMemberLoading || isManagerLoading) {
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
          ユーザー管理
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
        {/* メンバー一覧 */}
        <Card sx={{ mb: 4 }}>
        <CardContent>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 2, 
              pb: 1, 
              borderBottom: '1px solid', 
              borderColor: 'divider' 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  メンバー一覧
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  （{memberData?.pagination.total || 0}名）
                </Typography>
              </Box>
              {selectedMembers.length > 0 && (
                <Button
                  variant="contained"
                  onClick={() => setAssignManagerDialogOpen(true)}
                >
                  選択したメンバーをマネージャーに割り当て ({selectedMembers.length}名)
                </Button>
              )}
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                  placeholder="メンバーを検索..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
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
                    value={memberFilters.status}
                    label="ステータス"
                    onChange={(e) => setMemberFilters(prev => ({ ...prev, status: e.target.value }))}
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
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedMembers.length === memberData?.users.length}
                        indeterminate={
                          selectedMembers.length > 0 &&
                          selectedMembers.length < memberData?.users.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            // 会社管理者の場合は、自分の会社のメンバーのみ選択
                            const selectableMembers = currentUser?.role === 'COMPANY'
                              ? memberData?.users.filter(m => m.company?.id === currentUser.managedCompany?.id) || []
                              : memberData?.users || [];
                            setSelectedMembers(selectableMembers);
                          } else {
                            setSelectedMembers([]);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>名前</TableCell>
                    <TableCell>メールアドレス</TableCell>
                    <TableCell>役職</TableCell>
                    <TableCell>所属マネージャー</TableCell>
                    <TableCell>最終ログイン</TableCell>
                    <TableCell>作成日</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberData?.users.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      onEdit={handleOpenDialog}
                      onDelete={deleteUser.mutate}
                      onSelect={handleMemberSelect}
                      selected={selectedMembers.some(m => m.id === member.id)}
                    />
                  ))}
                  {memberData?.users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">
                          メンバーはいません
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={memberData?.pagination.total || 0}
              page={memberPage}
              onPageChange={handleChangePage}
              rowsPerPage={memberRowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="表示件数:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} / ${count}`
              }
            />
          </CardContent>
        </Card>

        {/* マネージャー一覧 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <ManagerIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                マネージャー一覧
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                （{managerData?.pagination.total || 0}名）
              </Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="マネージャーを検索..."
                  value={managerSearchQuery}
                  onChange={(e) => setManagerSearchQuery(e.target.value)}
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
                    value={managerFilters.status}
                  label="ステータス"
                    onChange={(e) => setManagerFilters(prev => ({ ...prev, status: e.target.value }))}
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
                    <TableCell>名前</TableCell>
                    <TableCell>メールアドレス</TableCell>
                    <TableCell>役職</TableCell>
                    <TableCell>所属メンバー</TableCell>
                    <TableCell>最終ログイン</TableCell>
                    <TableCell>作成日</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                  {managerData?.users.map((manager) => {
                    const managerMembers = memberData?.users.filter(member => member.managerId === manager.id) || [];
                    return (
                      <ManagerRow
                        key={manager.id}
                        manager={manager}
                        members={managerMembers}
                        onEdit={handleOpenDialog}
                        onDelete={deleteUser.mutate}
                      />
                    );
                  })}
                  {managerData?.users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">
                          マネージャーはいません
                        </Typography>
                </TableCell>
              </TableRow>
                  )}
          </TableBody>
        </Table>
            </TableContainer>

        <TablePagination
          component="div"
              count={managerData?.pagination.total || 0}
              page={managerPage}
              onPageChange={(e, newPage) => setManagerPage(newPage)}
              rowsPerPage={managerRowsPerPage}
              onRowsPerPageChange={(e) => {
                setManagerRowsPerPage(parseInt(e.target.value, 10));
                setManagerPage(0);
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
        managers={managerData?.users || []}
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