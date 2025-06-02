import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { FaSpinner, FaCreditCard, FaGoogle, FaEye, FaEyeSlash, FaGithub } from 'react-icons/fa';
import api from '../utils/axios';

// バリデーションスキーマ
const profileSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  phone: yup.string().matches(/^\+?[1-9]\d{1,14}$/, '有効な電話番号を入力してください'),
  company: yup.string(),
  position: yup.string()
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('現在のパスワードは必須です'),
  newPassword: yup
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .matches(/[A-Z]/, 'パスワードには大文字を含めてください')
    .matches(/[a-z]/, 'パスワードには小文字を含めてください')
    .matches(/[0-9]/, 'パスワードには数字を含めてください')
    .required('新しいパスワードは必須です'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'パスワードが一致しません')
    .required('パスワードの確認は必須です')
});

// ロールの表示名マッピング
const roleLabels = {
  ADMIN: 'システム管理者',
  COMPANY: '管理者',
  MANAGER: 'マネージャー',
  USER: '一般ユーザー'
};

// ロールの色マッピング
const roleColors = {
  ADMIN: 'w3-red',
  COMPANY: 'w3-orange',
  MANAGER: 'w3-blue',
  USER: 'w3-gray'
};

const Profile = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  // ユーザー情報の取得
  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUserProfile
  });

  // プロフィール更新
  const updateProfile = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      setSuccess('プロフィールを更新しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'プロフィールの更新に失敗しました');
      setSuccess('');
    }
  });

  // パスワード変更
  const changePassword = useMutation({
    mutationFn: updateUserPassword,
    onSuccess: () => {
      setSuccess('パスワードを変更しました');
      setError('');
      passwordFormik.resetForm();
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'パスワードの変更に失敗しました');
      setSuccess('');
    }
  });

  // SNS連携
  const linkSocial = useMutation({
    mutationFn: linkAuthProvider,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'SNS連携に失敗しました');
    }
  });

  const unlinkSocial = useMutation({
    mutationFn: unlinkAuthProvider,
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      setSuccess('SNS連携を解除しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'SNS連携の解除に失敗しました');
      setSuccess('');
    }
  });

  // プロフィールフォーム
  const profileFormik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: user?.company || '',
      position: user?.position || ''
    },
    validationSchema: profileSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await updateProfile.mutateAsync(values);
    }
  });

  // パスワードフォーム
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validationSchema: passwordSchema,
    onSubmit: async (values) => {
      await changePassword.mutateAsync(values);
    }
  });

  const fetchUserProfile = async () => {
    const { data } = await api.get('/users/me');
    return data;
  };

  const updateUserProfile = async (values) => {
    const { data } = await api.put('/users/me', values);
    return data;
  };

  const updateUserPassword = async (values) => {
    const { data } = await api.put('/users/me/password', values);
    return data;
  };

  const linkAuthProvider = async ({ provider }) => {
    const { data } = await api.post(`/auth/${provider}/link`);
    return data;
  };

  const unlinkAuthProvider = async ({ provider }) => {
    const { data } = await api.post(`/auth/${provider}/unlink`);
    return data;
  };
  if (isLoading) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }

  return (
    <div className="w3-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="w3-margin-bottom">プロフィール</h2>

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

      <div className="w3-card-4 w3-margin-bottom">
        <div className="w3-container">
          <div className="w3-row-padding">
            <div className="w3-col m3">
              <img
                src={user?.avatar || 'https://via.placeholder.com/150'}
                className="w3-circle"
                style={{ width: '100%', maxWidth: '150px' }}
                alt="プロフィール画像"
              />
            </div>
            <div className="w3-col m9">
              <h3>{user?.firstName} {user?.lastName}</h3>
              <p className="w3-text-gray">{user?.email}</p>
              <div className="w3-margin-top">
                <span className={`w3-tag ${roleColors[user?.role] || 'w3-gray'} w3-margin-right`}>
                  {roleLabels[user?.role] || user?.role}
                </span>                {user?.subscription && (
                  <span className="w3-tag w3-blue">
                    <FaCreditCard className="w3-margin-right" />
                    {user.subscription.plan}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w3-bar w3-border-bottom">
        <button
          className={`w3-bar-item w3-button ${activeTab === 0 ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab(0)}
        >
          基本情報
        </button>
        <button
          className={`w3-bar-item w3-button ${activeTab === 1 ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab(1)}
        >
          パスワード変更
        </button>
        <button
          className={`w3-bar-item w3-button ${activeTab === 2 ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab(2)}
        >
          SNS連携
        </button>
      </div>

      <div className="w3-container w3-padding-16">
        {activeTab === 0 && (
          <form onSubmit={profileFormik.handleSubmit}>
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>名前（姓）</label>
                <input
                  className={`w3-input w3-border ${profileFormik.touched.lastName && profileFormik.errors.lastName ? 'w3-border-red' : ''}`}
                  name="lastName"
                  value={profileFormik.values.lastName}
                  onChange={profileFormik.handleChange}
                />
                {profileFormik.touched.lastName && profileFormik.errors.lastName && (
                  <div className="w3-text-red">{profileFormik.errors.lastName}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>名前（名）</label>
                <input
                  className={`w3-input w3-border ${profileFormik.touched.firstName && profileFormik.errors.firstName ? 'w3-border-red' : ''}`}
                  name="firstName"
                  value={profileFormik.values.firstName}
                  onChange={profileFormik.handleChange}
                />
                {profileFormik.touched.firstName && profileFormik.errors.firstName && (
                  <div className="w3-text-red">{profileFormik.errors.firstName}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>メールアドレス</label>
                <input
                  className={`w3-input w3-border ${profileFormik.touched.email && profileFormik.errors.email ? 'w3-border-red' : ''}`}
                  type="email"
                  name="email"
                  value={profileFormik.values.email}
                  onChange={profileFormik.handleChange}
                />
                {profileFormik.touched.email && profileFormik.errors.email && (
                  <div className="w3-text-red">{profileFormik.errors.email}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>電話番号</label>
                <input
                  className={`w3-input w3-border ${profileFormik.touched.phone && profileFormik.errors.phone ? 'w3-border-red' : ''}`}
                  type="tel"
                  name="phone"
                  value={profileFormik.values.phone}
                  onChange={profileFormik.handleChange}
                />
                {profileFormik.touched.phone && profileFormik.errors.phone && (
                  <div className="w3-text-red">{profileFormik.errors.phone}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>会社名</label>
                <input
                  className="w3-input w3-border"
                  name="company"
                  value={profileFormik.values.company}
                  onChange={profileFormik.handleChange}
                />
              </div>
              <div className="w3-col m12">
                <label>役職</label>
                <input
                  className="w3-input w3-border"
                  name="position"
                  value={profileFormik.values.position}
                  onChange={profileFormik.handleChange}
                />
              </div>
            </div>
            <div className="w3-margin-top">
              <button
                type="submit"
                className="w3-button w3-blue"              disabled={updateProfile.isLoading}
              >
                {updateProfile.isLoading ? (
                  <FaSpinner className="fa-spin" />
                ) : (
                  '更新'
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === 1 && (
          <form onSubmit={passwordFormik.handleSubmit}>
            <div className="w3-row-padding">
              <div className="w3-col m12">
                <label>現在のパスワード</label>
                <div className="w3-input-group">
                  <input
                    className={`w3-input w3-border ${passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword ? 'w3-border-red' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordFormik.values.currentPassword}
                    onChange={passwordFormik.handleChange}
                  />
                  <button
                    type="button"
                    className="w3-button w3-gray"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword && (
                  <div className="w3-text-red">{passwordFormik.errors.currentPassword}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>新しいパスワード</label>
                <input
                  className={`w3-input w3-border ${passwordFormik.touched.newPassword && passwordFormik.errors.newPassword ? 'w3-border-red' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordFormik.values.newPassword}
                  onChange={passwordFormik.handleChange}
                />
                {passwordFormik.touched.newPassword && passwordFormik.errors.newPassword && (
                  <div className="w3-text-red">{passwordFormik.errors.newPassword}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>新しいパスワード（確認）</label>
                <input
                  className={`w3-input w3-border ${passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword ? 'w3-border-red' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordFormik.values.confirmPassword}
                  onChange={passwordFormik.handleChange}
                />
                {passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword && (
                  <div className="w3-text-red">{passwordFormik.errors.confirmPassword}</div>
                )}
              </div>
            </div>
            <div className="w3-margin-top">
              <button
                type="submit"
                className="w3-button w3-blue"
                disabled={changePassword.isLoading}
              >                {changePassword.isLoading ? (
                  <FaSpinner className="fa-spin" />
                ) : (
                  'パスワードを変更'
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === 2 && (
          <div className="w3-row-padding">
            <div className="w3-col m6">
              <div className="w3-card-4">
                <div className="w3-container">
                  <h4>Google連携</h4>
                  {user?.googleId ? (
                    <div>
                      <p>連携済み</p>                      <button
                        className="w3-button w3-red"
                        onClick={() => unlinkSocial.mutate({ provider: 'google' })}
                        disabled={unlinkSocial.isLoading}
                      >
                        {unlinkSocial.isLoading ? (
                          <FaSpinner className="fa-spin" />
                        ) : (
                          '連携を解除'
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="w3-button w3-blue"
                      onClick={() => linkSocial.mutate({ provider: 'google' })}
                      disabled={linkSocial.isLoading}
                    >                      {linkSocial.isLoading ? (
                        <FaSpinner className="fa-spin" />
                      ) : (
                        <>
                          <FaGoogle className="w3-margin-right" />
                          Googleと連携
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="w3-col m6">
              <div className="w3-card-4">
                <div className="w3-container">
                  <h4>GitHub連携</h4>
                  {user?.githubId ? (
                    <div>
                      <p>連携済み</p>                      <button
                        className="w3-button w3-red"
                        onClick={() => unlinkSocial.mutate({ provider: 'github' })}
                        disabled={unlinkSocial.isLoading}
                      >
                        {unlinkSocial.isLoading ? (
                          <FaSpinner className="fa-spin" />
                        ) : (
                          '連携を解除'
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="w3-button w3-blue"
                      onClick={() => linkSocial.mutate({ provider: 'github' })}
                      disabled={linkSocial.isLoading}
                    >                      {linkSocial.isLoading ? (
                        <FaSpinner className="fa-spin" />
                      ) : (
                        <>
                          <FaGithub className="w3-margin-right" />
                          GitHubと連携
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 