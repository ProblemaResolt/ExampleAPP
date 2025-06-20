import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaArrowLeft } from 'react-icons/fa';
import api from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { usePageSkills } from '../../hooks/usePageSkills';
import { useSkillsRefresh } from '../../hooks/useSkillsRefresh';
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

const EmployeeCreatePage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const prevSkillsLength = useRef(0);
  const [skillInput, setSkillInput] = useState("");
  const [debouncedSkillInput, setDebouncedSkillInput] = useState("");
  const inputRef = useRef();
  // ページ専用スキルデータ取得（マウント時にリフレッシュ）
  const {
    companySkills,
    defaultSkills,
    allSkills,
    skillStats,
    isLoading: pageSkillsLoading
  } = usePageSkills({ refreshOnMount: true, enableBackground: true });

  // スキルリフレッシュ機能
  const { refetchAllSkills } = useSkillsRefresh();
  // ページ読み込み時にスキルデータを確実に最新化（初回のみ）
  useEffect(() => {
    refetchAllSkills();
  }, []); // 依存配列を空にして初回マウント時のみ実行
  // debounced skill search - 300ms待ってから検索実行
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSkillInput(skillInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [skillInput]);

  // フォーム
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      position: '',
      phone: '',
      prefecture: '',
      city: '',
      streetAddress: '',
      skills: [],
      isActive: true
    },
    validationSchema: employeeSchema,    onSubmit: (values) => {
      const employeeData = {
        ...values,
        companyId: currentUser.managedCompanyId || currentUser.companyId,
        skills: values.skills?.map(skill => ({
          companySelectedSkillId: skill.companySelectedSkillId,
          years: skill.years ? parseInt(skill.years, 10) : null
        })) || []
      };
      createEmployee.mutate(employeeData);
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

  // 社員の作成
  const createEmployee = useMutation({
    mutationFn: async (employeeData) => {
      const { data } = await api.post('/users', employeeData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      showSuccess('社員を追加しました。ログイン情報とメール確認リンクを含むメールを送信しました。');
      navigate('/employees');
    },
    onError: (error) => {
      let errorMessage;
      if (error.response?.data?.message === '指定されたスキルの中に、この会社に属さないものが含まれています') {
        errorMessage = 'エラー: 選択されたスキルの中に、会社で利用可能でないものが含まれています。スキル管理画面で必要なスキルを会社に追加してから再度お試しください。';      } else {
        errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
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
  };  // フィルタリングされたスキル（会社選択済みスキルのみ表示）
  const filteredSkills = companySkills?.filter(skill => {
    const skillName = skill?.skillName || skill?.globalSkill?.name || '';
    return skillName.toLowerCase().includes(debouncedSkillInput.toLowerCase()) &&
           !formik.values.skills.some(s => s.companySelectedSkillId === skill.id);
  }) || [];

  // パンくずリスト
  const breadcrumbItems = [
    { label: '社員管理', path: '/employees' },
    { label: '社員を追加' }
  ];

  return (
    <div className="w3-container w3-margin-top">
      {/* パンくずリスト */}
      <Breadcrumb items={breadcrumbItems} />

      {/* ページタイトル */}
      <div className="w3-white w3-margin-bottom">
        <header className="w3-container w3-blue w3-padding">
          <div className="w3-bar">
            <div className="w3-bar-item">
              <h2>社員を追加</h2>
              <p>新しい社員の基本情報とスキル情報を入力してください。</p>
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

      {/* メール通知について */}
      <div className="w3-white w3-margin-bottom">
        <div className="w3-container w3-padding w3-pale-blue w3-border-bottom">
          <p className="w3-small w3-margin-bottom">
            <strong>📧 メール通知について:</strong><br />
            新しい社員を追加すると、以下のメールが自動送信されます：
          </p>
          <ul className="w3-small w3-margin-left">
            <li>自動生成された安全なログイン情報（メールアドレスとパスワード）</li>
            <li>メールアドレス確認リンク</li>
          </ul>
          <p className="w3-small w3-text-gray">
            セキュリティのため、パスワードは自動生成されます。社員は初回ログイン後にパスワードを変更できます。
          </p>
        </div>
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
                )}              </div>

              {/* 利用可能なスキル一覧（カテゴリ別） */}
              <div className="w3-margin-bottom">
                <label>利用可能なスキル一覧</label>
                <div className="w3-border w3-white w3-padding">
                  {Object.entries(
                    companySkills?.reduce((groups, skill) => {
                      const skillName = skill?.skillName || skill?.globalSkill?.name || '不明なスキル';
                      const category = skill?.category || skill?.globalSkill?.category || 'その他';
                      
                      // 既に選択済みのスキルは除外
                      if (formik.values.skills.some(s => s.companySelectedSkillId === skill.id)) {
                        return groups;
                      }
                      
                      if (!groups[category]) {
                        groups[category] = [];
                      }
                      groups[category].push({ ...skill, displayName: skillName });
                      return groups;
                    }, {}) || {}
                  ).map(([category, skills]) => (
                    <div key={category} className="w3-margin-bottom">
                      <h6 className="w3-text-blue w3-margin-bottom">
                        <strong>{category}</strong>
                      </h6>
                      <div className="w3-flex w3-wrap">
                        {skills.map((skill) => (
                          <span key={skill.id} style={{ margin: '2px' }}>
                            <button
                              type="button"
                              className="w3-button w3-small w3-white w3-border w3-round w3-hover-blue"
                              onClick={() => handleSelectSkill(skill)}
                              title={`${skill.displayName}を追加`}
                            >
                              <span className="w3-small">+ {skill.displayName}</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!companySkills || companySkills.length === 0) && (
                    <div className="w3-center w3-text-gray w3-padding">
                      利用可能なスキルがありません。
                      <br />
                      <a href="/skills" className="w3-text-blue">スキル管理</a>でスキルを追加してください。
                    </div>
                  )}
                </div>
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
                disabled={createEmployee.isPending}
              >
                {createEmployee.isPending ? '作成中...' : '作成'}
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

export default EmployeeCreatePage;
