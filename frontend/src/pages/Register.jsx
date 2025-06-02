import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { FaUser, FaEnvelope, FaLock, FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';
import api from '../utils/axios';

// バリデーションスキーマ
const registerSchema = yup.object({
  firstName: yup
    .string()
    .required('名前（名）は必須です'),
  lastName: yup
    .string()
    .required('名前（姓）は必須です'),
  email: yup
    .string()
    .email('有効なメールアドレスを入力してください')
    .required('メールアドレスは必須です'),
  password: yup
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含める必要があります'
    )
    .required('パスワードは必須です'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'パスワードが一致しません')
    .required('パスワード（確認）は必須です')
});

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 登録ミューテーション
  const registerMutation = useMutation({
    mutationFn: async (values) => {
      const { data } = await api.post('/api/auth/register', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password
      });
      return data;
    },
    onSuccess: () => {
      // 登録成功後、ログインページへリダイレクト
      navigate('/login', {
        state: { message: '登録が完了しました。メールアドレスの確認をお願いします。' }
      });
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '登録に失敗しました';
      setError(errorMessage);
    }
  });

  // フォーム
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      try {
        await registerMutation.mutateAsync(values);
      } catch (error) {
        // Error handling is done in registerMutation
      }
    }
  });

  return (
    <div className="w3-container" style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="w3-card-4" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="w3-container w3-padding-24">
          <div className="w3-center w3-margin-bottom">
            <h2>新規登録</h2>
            <p className="w3-text-gray">
              すでにアカウントをお持ちの場合は{' '}
              <RouterLink to="/login" className="w3-text-blue">
                ログイン
              </RouterLink>
              してください
            </p>
          </div>

          {error && (
            <div className="w3-panel w3-red">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={formik.handleSubmit}>
            <div className="w3-row-padding">
              <div className="w3-col m6">                <div className="w3-margin-bottom">
                  <label>名前（名）</label>
                  <div className="w3-input-group">
                    <FaUser className="w3-input-group-addon" />
                    <input
                      className={`w3-input w3-border ${formik.touched.firstName && formik.errors.firstName ? 'w3-border-red' : ''}`}
                      name="firstName"
                      type="text"
                      value={formik.values.firstName}
                      onChange={formik.handleChange}
                      placeholder="名を入力"
                    />
                  </div>
                  {formik.touched.firstName && formik.errors.firstName && (
                    <div className="w3-text-red">{formik.errors.firstName}</div>
                  )}
                </div>
              </div>
              <div className="w3-col m6">                <div className="w3-margin-bottom">
                  <label>名前（姓）</label>
                  <div className="w3-input-group">
                    <FaUser className="w3-input-group-addon" />
                    <input
                      className={`w3-input w3-border ${formik.touched.lastName && formik.errors.lastName ? 'w3-border-red' : ''}`}
                      name="lastName"
                      type="text"
                      value={formik.values.lastName}
                      onChange={formik.handleChange}
                      placeholder="姓を入力"
                    />
                  </div>
                  {formik.touched.lastName && formik.errors.lastName && (
                    <div className="w3-text-red">{formik.errors.lastName}</div>
                  )}
                </div>
              </div>
            </div>              <div className="w3-margin-bottom">
                <label>メールアドレス</label>
                <div className="w3-input-group">
                <FaEnvelope className="w3-input-group-addon" />
                <input
                  className={`w3-input w3-border ${formik.touched.email && formik.errors.email ? 'w3-border-red' : ''}`}
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  placeholder="メールアドレスを入力"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <div className="w3-text-red">{formik.errors.email}</div>
              )}
            </div>            <div className="w3-margin-bottom">
              <label>パスワード</label>
              <div className="w3-input-group">
                <FaLock className="w3-input-group-addon" />
                <input
                  className={`w3-input w3-border ${formik.touched.password && formik.errors.password ? 'w3-border-red' : ''}`}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  placeholder="パスワードを入力"
                />
                <button
                  type="button"
                  className="w3-button w3-input-group-addon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <div className="w3-text-red">{formik.errors.password}</div>
              )}
            </div>            <div className="w3-margin-bottom">
              <label>パスワード（確認）</label>
              <div className="w3-input-group">
                <FaLock className="w3-input-group-addon" />
                <input
                  className={`w3-input w3-border ${formik.touched.confirmPassword && formik.errors.confirmPassword ? 'w3-border-red' : ''}`}
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  placeholder="パスワードを再入力"
                />
                <button
                  type="button"
                  className="w3-button w3-input-group-addon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <div className="w3-text-red">{formik.errors.confirmPassword}</div>
              )}
            </div>            <button
              type="submit"
              className="w3-button w3-blue w3-block w3-margin-bottom"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? (
                <FaSpinner className="fa-spin" />
              ) : (
                '登録'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register; 