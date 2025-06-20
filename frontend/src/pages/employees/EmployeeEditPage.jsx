import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import api from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { usePageSkills } from '../../hooks/usePageSkills';
import Breadcrumb from '../../components/common/Breadcrumb';
import Snackbar from '../../components/Snackbar';

// バリデーションスキーマ
const employeeSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  position: yup.string().nullable(),
  phone: yup.string().nullable(),
  prefecture: yup.string().nullable(),
  city: yup.string().nullable(),
  streetAddress: yup.string().nullable(),
  role: yup.string().required('ロールは必須です'),
  isActive: yup.boolean(),  skills: yup.array().of(
    yup.object().shape({
      companySelectedSkillId: yup.string().required('スキルは必須です'),
      years: yup.number().min(0, '年数は0以上でなければなりません').nullable()
    })
  ).required('スキルセットは必須です').nullable()
});

const EmployeeEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const prevSkillsLength = useRef(0);
  const [skillInput, setSkillInput] = useState("");
  const [debouncedSkillInput, setDebouncedSkillInput] = useState("");
  const inputRef = useRef();

  // ページ専用スキルデータ取得
  const {
    companySkills,
    defaultSkills,
    allSkills,
    skillStats,
    isLoading: pageSkillsLoading
  } = usePageSkills();

  // 社員データ取得
  const { data: employeeData, isLoading: employeeLoading, error: employeeError } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const response = await api.get(`/users/${id}`, {
        params: { include: 'skills' }
      });
      return response.data.data || response.data;
    },
    enabled: Boolean(id),
    staleTime: 0
  });
  // debounced skill search - 300ms待ってから検索実行
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSkillInput(skillInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [skillInput]);

  // フォーム
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: employeeData?.firstName || '',
      lastName: employeeData?.lastName || '',
      email: employeeData?.email || '',
      role: employeeData?.role || '',
      position: employeeData?.position || '',
      phone: employeeData?.phone || '',
      prefecture: employeeData?.prefecture || '',
      city: employeeData?.city || '',
      streetAddress: employeeData?.streetAddress || '',      skills: employeeData?.userSkills?.map(skill => ({
        companySelectedSkillId: skill.companySelectedSkillId || skill.skillId || skill.id,
        years: skill.years || ''
      })) || [],
      isActive: employeeData?.isActive !== undefined ? employeeData.isActive : true
    },
    validationSchema: employeeSchema,
    onSubmit: (values) => {
      const employeeData = {
        ...values,
        companyId: currentUser.managedCompanyId || currentUser.companyId,        skills: values.skills?.map(skill => ({
          companySelectedSkillId: skill.companySelectedSkillId,
          years: skill.years ? parseInt(skill.years, 10) : null
        })) || []
      };
      updateEmployee.mutate(employeeData);
    }
  });

  useEffect(() => {
    if (formik.values.skills.length > prevSkillsLength.current) {
      const selects = document.querySelectorAll(".employee-skill-select");
      if (selects.length > 0) {
        selects[selects.length - 1].focus();
        selects[selects.length - 1].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
    prevSkillsLength.current = formik.values.skills.length;
  }, [formik.values.skills.length]);

  // 社員の更新
  const updateEmployee = useMutation({
    mutationFn: async (employeeData) => {
      const { data } = await api.patch(`/users/${id}`, employeeData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      queryClient.invalidateQueries(['employee', id]);
      showSuccess('社員情報を更新しました');
      navigate('/employees');
    },
    onError: (error) => {
      let errorMessage;
      if (error.response?.data?.message === '指定されたスキルの中に、この会社に属さないものが含まれています') {
        errorMessage = 'エラー: 選択されたスキルの中に、会社で利用可能でないものが含まれています。スキル管理画面で必要なスキルを会社に追加してから再度お試しください。';
      } else {        errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
      }
      showError(errorMessage);
    }
  });
  // スキル選択（会社選択済みスキルのみ）
  const handleSelectSkill = (skill) => {
    if (formik.values.skills.some((s) => s.companySelectedSkillId === skill.id)) return;

    formik.setFieldValue("skills", [
      ...(formik.values.skills || []),
      { companySelectedSkillId: skill.id, years: "" },
    ]);
    setSkillInput("");
    inputRef.current?.focus();
  };

  // スキル削除
  const removeSkill = (index) => {
    const newSkills = formik.values.skills.filter((_, i) => i !== index);
    formik.setFieldValue("skills", newSkills);
  };

  // フィルタリングされたスキル（会社選択済みスキルのみ表示）
  const filteredSkills = companySkills?.filter(skill =>
    skill?.skillName?.toLowerCase().includes(debouncedSkillInput.toLowerCase()) &&
    !formik.values.skills.some(s => s.companySelectedSkillId === skill.id)
  ) || [];

  // パンくずリスト
  const breadcrumbItems = [
    { label: '社員管理', path: '/employees' },
    { label: employeeData ? `${employeeData.lastName} ${employeeData.firstName} の編集` : '社員を編集' }
  ];

  // ローディング状態
  if (employeeLoading || pageSkillsLoading) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaSpinner className="fa-spin w3-xxlarge" />
        <p>読み込み中...</p>
      </div>
    );
  }

  // エラー状態
  if (employeeError) {
    return (
      <div className="w3-container w3-margin-top">
        <Breadcrumb items={breadcrumbItems} />
        <div className="w3-panel w3-red w3-card">
          <h3>エラー</h3>
          <p>社員情報の読み込みに失敗しました。</p>
          <button
            className="w3-button w3-white"
            onClick={() => navigate('/employees')}
          >
            社員管理に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w3-container w3-margin-top">
      {/* パンくずリスト */}
      <Breadcrumb items={breadcrumbItems} />

      {/* ページタイトル */}
      <div className="w3-white w3-margin-bottom">
        <header className="w3-container w3-blue w3-padding">
          <div className="w3-bar">
            <div className="w3-bar-item">
              <h2>社員を編集: {employeeData?.lastName} {employeeData?.firstName}</h2>
              <p>社員の基本情報とスキル情報を編集してください。</p>
            </div>
          </div>
        </header>
      </div>

      {/* アクションボタン */}
      <div className="w3-bar w3-margin-bottom">
        <button
          className="w3-button w3-grey"
          onClick={() => navigate('/employees')}
        >
          <FaArrowLeft className="w3-margin-right" />
          社員管理に戻る
        </button>
      </div>

      {/* メインフォーム */}
      <div className="w3-white">
        <form onSubmit={formik.handleSubmit}>
          <div className="w3-container w3-padding">
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>
                  <FaUser className="w3-margin-right" />
                  名前（姓）
                </label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.lastName && formik.errors.lastName
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="lastName"
                  type="text"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <div className="w3-text-red">{formik.errors.lastName}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>
                  <FaUser className="w3-margin-right" />
                  名前（名）
                </label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.firstName && formik.errors.firstName
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="firstName"
                  type="text"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <div className="w3-text-red">{formik.errors.firstName}</div>
                )}
              </div>
            </div>

            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>
                  <FaEnvelope className="w3-margin-right" />
                  メールアドレス
                </label>
                <input
                  className={`w3-input w3-border ${
                    formik.touched.email && formik.errors.email
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
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
                  type="text"
                  value={formik.values.position}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
            </div>

            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>ロール</label>
                <select
                  className={`w3-select w3-border ${
                    formik.touched.role && formik.errors.role
                      ? "w3-border-red"
                      : ""
                  }`}
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <option value="">選択してください</option>
                  <option value="MANAGER">マネージャー</option>
                  <option value="MEMBER">メンバー</option>
                  {currentUser?.role === 'COMPANY' && (
                    <option value="COMPANY">管理者</option>
                  )}
                </select>
                {formik.touched.role && formik.errors.role && (
                  <div className="w3-text-red">{formik.errors.role}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>
                  <FaPhone className="w3-margin-right" />
                  電話番号
                </label>
                <input
                  className="w3-input w3-border"
                  name="phone"
                  type="tel"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
            </div>

            <div className="w3-row-padding">
              <div className="w3-col m4">
                <label>
                  <FaMapMarkerAlt className="w3-margin-right" />
                  都道府県
                </label>
                <input
                  className="w3-input w3-border"
                  name="prefecture"
                  type="text"
                  value={formik.values.prefecture}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              <div className="w3-col m4">
                <label>市区町村</label>
                <input
                  className="w3-input w3-border"
                  name="city"
                  type="text"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              <div className="w3-col m4">
                <label>町名・番地</label>
                <input
                  className="w3-input w3-border"
                  name="streetAddress"
                  type="text"
                  value={formik.values.streetAddress}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
            </div>

            <div className="w3-row-padding">
              <div className="w3-col m12">
                <label>
                  <input
                    type="checkbox"
                    className="w3-check"
                    name="isActive"
                    checked={formik.values.isActive}
                    onChange={formik.handleChange}
                  />
                  <span> アカウントを有効にする</span>
                </label>
              </div>
            </div>

            {/* スキル設定 */}
            <div className="w3-section">
              <h4>スキル設定</h4>
              
              {/* 選択済みスキル一覧 */}
              {formik.values.skills && formik.values.skills.length > 0 && (
                <div className="w3-margin-bottom">
                  <h5>選択済みスキル</h5>                  {formik.values.skills.map((skill, index) => {
                    const skillData = companySkills?.find(s => s.id === skill.companySelectedSkillId);
                    return (
                      <div key={index} className="w3-card w3-margin-bottom">
                        <div className="w3-container w3-light-gray">
                          <div className="w3-row">
                            <div className="w3-col s8">
                              <strong>{skillData?.skillName || skillData?.globalSkill?.name || '不明なスキル'}</strong>
                              {skillData?.category && (
                                <span className="w3-tag w3-small w3-blue w3-margin-left">
                                  {skillData.category}
                                </span>
                              )}
                            </div>
                            <div className="w3-col s2">
                              <input
                                className="w3-input employee-skill-select"
                                type="number"
                                placeholder="年数"
                                min="0"
                                step="0.5"
                                value={skill.years}
                                onChange={(e) => {
                                  const newSkills = [...formik.values.skills];
                                  newSkills[index].years = e.target.value;
                                  formik.setFieldValue("skills", newSkills);
                                }}
                              />
                            </div>
                            <div className="w3-col s2">
                              <button
                                type="button"
                                className="w3-button w3-red w3-small"
                                onClick={() => removeSkill(index)}
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* スキル検索・追加 */}
              <div className="w3-margin-bottom">
                <label>スキルを検索・追加</label>
                <input
                  ref={inputRef}
                  className="w3-input w3-border"
                  type="text"
                  placeholder="スキル名で検索..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                />
                
                {skillInput && (
                  <div className="w3-border w3-white" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredSkills.length > 0 ? (
                      filteredSkills.slice(0, 10).map((skill) => (
                        <div
                          key={skill.id}
                          className="w3-bar-item w3-button w3-hover-light-gray"
                          onClick={() => handleSelectSkill(skill)}
                        >                          <div>
                            <strong>{skill?.skillName || skill?.globalSkill?.name || '不明なスキル'}</strong>
                            {skill?.category && (
                              <span className="w3-tag w3-small w3-blue w3-margin-left">
                                {skill.category}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="w3-bar-item w3-text-gray">
                        該当するスキルが見つかりません
                      </div>
                    )}
                  </div>
                )}
              </div>

              {formik.touched.skills && formik.errors.skills && (
                <div className="w3-text-red">{formik.errors.skills}</div>
              )}
            </div>
          </div>

          {/* フッター（ボタン） */}
          <footer className="w3-container w3-padding w3-border-top">
            <div className="w3-bar w3-right">
              <button
                type="button"
                className="w3-button w3-white w3-border w3-round-large w3-margin-right"
                onClick={() => navigate('/employees')}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="w3-button w3-blue w3-round-large"
                disabled={updateEmployee.isPending}
              >
                {updateEmployee.isPending ? '更新中...' : '更新'}
              </button>
            </div>
            <div className="w3-clear"></div>
          </footer>
        </form>
      </div>

      {/* スナックバー */}
      <Snackbar />
    </div>
  );
};

export default EmployeeEditPage;
