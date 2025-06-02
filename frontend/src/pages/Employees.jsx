import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { 
  FaUser, 
  FaEnvelope, 
  FaEdit, 
  FaTrash, 
  FaSpinner, 
  FaPlus, 
  FaSearch as FaMagnifyingGlass 
} from 'react-icons/fa';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

// バリデーションスキーマ
const employeeSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  position: yup.string().nullable(),
  role: yup.string().required('ロールは必須です'),
  companyId: yup.string().nullable(),
  skills: yup.array().of(
    yup.object().shape({
      skillId: yup.string().required('スキルは必須です'),
      years: yup.number().min(0, '年数は0以上でなければなりません').nullable()
    })
  ).required('スキルセットは必須です').nullable()
});

// ロールの表示名マッピング
const roleLabels = {
  MANAGER: 'マネージャー',
  MEMBER: 'メンバー'
};

// ロールの色マッピング
const roleColors = {
  MANAGER: 'w3-orange',
  MEMBER: 'w3-blue'
};

// ステータスの表示名マッピング
const statusLabels = {
  active: '有効',
  inactive: '無効'
};

// ステータスの色マッピング
const statusColors = {
  active: 'w3-green',
  inactive: 'w3-red'
};

// 社員編集ダイアログ
const EmployeeDialog = ({ open, onClose, employee, onSubmit, formik, companies, skills }) => {
  if (!open) return null;
  const [skillInput, setSkillInput] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const inputRef = useRef();
  // スキル追加（自由入力）
  const handleAddSkillTag = async () => {
    const name = skillInput.trim();
    if (!name) return;
    setAddingSkill(true);
    try {      // 既存スキルかAPIで新規作成
      let skill = skills?.find(s => s.name === name);
      if (!skill) {
        console.log('Sending POST request to /api/users/skills with:', { name });
        const res = await api.post('/api/users/skills', { name });
        console.log('POST response:', res);
        skill = res.data.data.skill;
      }
      // 既に選択済みなら追加しない
      if (formik.values.skills.some(s => s.skillId === skill.id)) return;
      formik.setFieldValue('skills', [...(formik.values.skills || []), { skillId: skill.id, years: '' }]);
      setSkillInput('');
      inputRef.current?.focus();
    } finally {
      setAddingSkill(false);
    }
  };

  // タグ削除
  const handleRemoveSkillTag = (idx) => {
    const newSkills = [...(formik.values.skills || [])];
    newSkills.splice(idx, 1);
    formik.setFieldValue('skills', newSkills);
  };

  // 年数変更
  const handleSkillYearsChange = (idx, value) => {
    const newSkills = [...(formik.values.skills || [])];
    newSkills[idx].years = value;
    formik.setFieldValue('skills', newSkills);
  };

  // タグ候補
  const tagCandidates = (skills || []).filter(
    s => !formik.values.skills.some(sel => sel.skillId === s.id)
      && (!skillInput || s.name.includes(skillInput))
  );

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '600px' }}>
        <header className="w3-container w3-blue">
          <h3>{employee ? '社員を編集' : '社員を追加'}</h3>
        </header>
        <form onSubmit={onSubmit}>
          <div className="w3-container">
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>名前（名）</label>
                <input
                  className={`w3-input w3-border ${formik.touched.firstName && formik.errors.firstName ? 'w3-border-red' : ''}`}
                  name="firstName"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <div className="w3-text-red">{formik.errors.firstName}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>名前（姓）</label>
                <input
                  className={`w3-input w3-border ${formik.touched.lastName && formik.errors.lastName ? 'w3-border-red' : ''}`}
                  name="lastName"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <div className="w3-text-red">{formik.errors.lastName}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>メールアドレス</label>
                <input
                  className={`w3-input w3-border ${formik.touched.email && formik.errors.email ? 'w3-border-red' : ''}`}
                  type="email"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                />
                {formik.touched.email && formik.errors.email && (
                  <div className="w3-text-red">{formik.errors.email}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>役職</label>
                <input
                  className="w3-input w3-border"
                  name="position"
                  value={formik.values.position}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="w3-col m6">
                <label>ロール</label>
                <select
                  className={`w3-select w3-border ${formik.touched.role && formik.errors.role ? 'w3-border-red' : ''}`}
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                >
                  <option value="">選択してください</option>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {formik.touched.role && formik.errors.role && (
                  <div className="w3-text-red">{formik.errors.role}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>所属会社</label>
                <select
                  className="w3-select w3-border"
                  name="companyId"
                  value={formik.values.companyId}
                  onChange={formik.handleChange}
                >
                  <option value="">未所属</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w3-col m12">
                <label>スキルセットと経験年数</label>
                {/* 選択済みスキルタグ＋年数 */}
                <div style={{ marginBottom: 8 }}>
                  {(formik.values.skills || []).map((skillObj, idx) => {
                    const skill = (skills || []).find(s => s.id === skillObj.skillId);
                    return (
                      <span key={skillObj.skillId} className="w3-tag w3-light-blue w3-margin-right w3-margin-bottom">
                        {skill ? skill.name : '不明スキル'}
                        <input
                          type="number"
                          min="0"
                          max="50"
                          placeholder="年数"
                          value={skillObj.years}
                          onChange={e => handleSkillYearsChange(idx, e.target.value)}
                          style={{ width: 50, marginLeft: 8, marginRight: 4 }}
                          className="w3-input w3-border w3-small"
                        />年
                        <button type="button" className="w3-button w3-tiny w3-red w3-margin-left" onClick={() => handleRemoveSkillTag(idx)}>×</button>
                      </span>
                    );
                  })}
                </div>
                {/* タグ候補＋自由入力 */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    ref={inputRef}
                    className="w3-input w3-border"
                    style={{ flex: 1, minWidth: 0 }}
                    type="text"
                    placeholder="スキル名を入力または選択"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkillTag();
                      }
                    }}
                  />
                  <button type="button" className="w3-button w3-blue" onClick={handleAddSkillTag} disabled={addingSkill || !skillInput.trim()}>
                    追加
                  </button>
                </div>
                {/* 候補タグ */}
                <div style={{ marginTop: 4 }}>
                  {tagCandidates.map(skill => (
                    <span
                      key={skill.id}
                      className="w3-tag w3-light-gray w3-margin-right w3-margin-bottom"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        formik.setFieldValue('skills', [...(formik.values.skills || []), { skillId: skill.id, years: '' }]);
                        setSkillInput('');
                        inputRef.current?.focus();
                      }}
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
                {formik.touched.skills && typeof formik.errors.skills === 'string' && (
                  <div className="w3-text-red">{formik.errors.skills}</div>
                )}
              </div>
            </div>
          </div>
          <footer className="w3-container w3-padding">
            <button type="button" className="w3-button w3-gray" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={formik.isSubmitting}
            >
              {employee ? '更新' : '作成'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

// 社員行コンポーネント
const EmployeeRow = ({ employee, onEdit, onDelete }) => {
  return (
    <tr className="w3-hover-light-gray">
      <td>
        <div className="w3-cell-row">
          <FaUser className="w3-margin-right" />
          {employee.firstName} {employee.lastName}
        </div>
      </td>
      <td>
        <div className="w3-cell-row">
          <FaEnvelope className="w3-margin-right" />
          {employee.email}
        </div>
      </td>
      <td>{employee.position || '-'}</td>
      <td>
        <span className={`w3-tag ${roleColors[employee.role]}`}>
          {roleLabels[employee.role]}
        </span>
      </td>
      <td>
        <span className={`w3-tag ${statusColors[employee.isActive ? 'active' : 'inactive']}`}>
          {statusLabels[employee.isActive ? 'active' : 'inactive']}
        </span>
      </td>
      <td>
        <div>
          {employee.skills && employee.skills.length > 0 ? (
            employee.skills.map(skillObj => (
              <span key={skillObj.skill.id} className="w3-tag w3-light-blue w3-small w3-margin-right">
                {skillObj.skill.name}（{skillObj.years}年）
              </span>
            ))
          ) : (
            <span className="w3-text-gray">-</span>
          )}
        </div>
      </td>
      <td>
        {employee.lastLoginAt
          ? new Date(employee.lastLoginAt).toLocaleString()
          : '未ログイン'}
      </td>
      <td>{new Date(employee.createdAt).toLocaleDateString()}</td>
      <td>
        <div className="w3-bar">
          <button
            className="w3-button w3-small w3-blue"
            onClick={() => onEdit(employee)}
            title="社員編集"
          >
            <FaEdit />
          </button>
          <button
            className="w3-button w3-small w3-red"
            onClick={() => {
              if (window.confirm('この社員を削除してもよろしいですか？')) {
                onDelete(employee.id);
              }
            }}
            title="社員削除"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
};

const Employees = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

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

  // 社員一覧の取得
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', page, rowsPerPage, orderBy, order, searchQuery, filters],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          sort: `${orderBy}:${order}`,
          search: searchQuery,
          ...filters
        }
      });
      return response.data.data;
    }
  });
  // スキル一覧の取得
  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const response = await api.get('/api/users/skills');
      return response.data.data.skills;
    }
  });

  // 社員の作成/更新
  const saveEmployee = useMutation({
    mutationFn: async (values) => {
      const employeeData = {
        ...values,
        role: values.role.toUpperCase(),
        companyId: values.companyId || null,
        position: values.position || null,
        skills: values.skills.map(skill => ({
          skillId: skill.skillId,
          years: skill.years || null
        }))
      };
      
      if (selectedEmployee) {
        const { data } = await api.patch(`/api/users/${selectedEmployee.id}`, employeeData);
        return data;
      } else {
        const { data } = await api.post('/api/users', employeeData);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setSuccess(selectedEmployee ? '社員情報を更新しました' : '社員を追加しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // 社員の削除
  const deleteEmployee = useMutation({
    mutationFn: async (employeeId) => {
      const { data } = await api.delete(`/api/users/${employeeId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setSuccess('社員を削除しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '社員の削除に失敗しました';
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
      position: '',
      skills: [{ skillId: '', years: '' }]
    },
    validationSchema: employeeSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await saveEmployee.mutateAsync(values);
      } catch (error) {
        // エラー処理はsaveEmployee.mutateで行われる
      }
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (employee = null) => {
    setSelectedEmployee(employee);
    if (employee) {
      formik.setValues({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
        companyId: employee.companyId || '',
        position: employee.position || '',
        skills: employee.skills.map(skillObj => ({
          skillId: skillObj.skill.id,
          years: skillObj.years || ''
        }))
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
    formik.resetForm();
  };

  // テーブルのソート
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (isLoading) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }

  return (
    <div className="w3-container">
      <div className="w3-bar w3-margin-bottom">
        <h2 className="w3-bar-item">社員管理</h2>
        <button
          className="w3-button w3-blue w3-right"
          onClick={() => handleOpenDialog()}
        >
          <FaPlus /> 社員を追加
        </button>
      </div>

      {error && (
        <div className="w3-panel w3-red">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="w3-panel w3-green">
          <p>{success}</p>
        </div>
      )}

      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m6">
          <div className="w3-input-group">
            <input
              className="w3-input w3-border"
              type="text"
              placeholder="社員を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="w3-input-group-btn">
              <button className="w3-button w3-blue">
                <FaMagnifyingGlass />
              </button>
            </span>
          </div>
        </div>
        <div className="w3-col m3">
          <select
            className="w3-select w3-border"
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
          >
            <option value="">すべてのロール</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="w3-col m3">
          <select
            className="w3-select w3-border"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">すべてのステータス</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
          </select>
        </div>
      </div>

      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th onClick={() => handleRequestSort('firstName')} style={{ cursor: 'pointer' }}>
                名前 {orderBy === 'firstName' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>メールアドレス</th>
              <th>役職</th>
              <th>ロール</th>
              <th>ステータス</th>
              <th>スキル</th>
              <th>最終ログイン</th>
              <th>作成日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {employeesData?.users.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                onEdit={handleOpenDialog}
                onDelete={deleteEmployee.mutate}
              />
            ))}
            {employeesData?.users.length === 0 && (
              <tr>
                <td colSpan="9" className="w3-center w3-text-gray">
                  社員はありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="w3-bar w3-center w3-margin-top">
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(0)}
          disabled={page === 0}
        >
          &laquo;
        </button>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          &lsaquo;
        </button>
        <span className="w3-bar-item w3-padding">
          {page + 1} / {Math.ceil((employeesData?.pagination.total || 0) / rowsPerPage)}
        </span>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * rowsPerPage >= (employeesData?.pagination.total || 0)}
        >
          &rsaquo;
        </button>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(Math.ceil((employeesData?.pagination.total || 0) / rowsPerPage) - 1)}
          disabled={(page + 1) * rowsPerPage >= (employeesData?.pagination.total || 0)}
        >
          &raquo;
        </button>
        <select
          className="w3-select w3-bar-item"
          style={{ width: 'auto' }}
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        >
          {[5, 10, 25, 50].map(size => (
            <option key={size} value={size}>{size}件表示</option>
          ))}
        </select>
      </div>

      <EmployeeDialog
        open={openDialog}
        onClose={handleCloseDialog}
        employee={selectedEmployee}
        onSubmit={formik.handleSubmit}
        formik={formik}
        companies={companiesData}
        skills={skillsData}
      />
    </div>
  );
};

export default Employees;