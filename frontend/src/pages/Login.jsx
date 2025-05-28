import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';

// バリデーションスキーマ
const loginSchema = yup.object({
  email: yup
    .string()
    .email('有効なメールアドレスを入力してください')
    .required('メールアドレスは必須です'),
  password: yup
    .string()
    .required('パスワードは必須です')
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // フォーム
  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError('');
        const { success, error } = await login(values.email, values.password);
        if (!success) {
          setError(error);
        } else {
          // リダイレクト先の取得（認証が必要なページから来た場合はそのページへ、そうでない場合はダッシュボードへ）
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      } catch (error) {
        setError(error.response?.data?.message || error.response?.data?.error || 'ログインに失敗しました');
      } finally {
        setSubmitting(false);
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
      <div className="w3-card-4" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="w3-container w3-padding-24">
          <div className="w3-center w3-margin-bottom">
            <h2>ログイン</h2>
            <p className="w3-text-gray">
              アカウントをお持ちでない場合は{' '}
              <RouterLink to="/register" className="w3-text-blue">
                新規登録
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
            <div className="w3-margin-bottom">
              <label>メールアドレス</label>
              <div className="w3-input-group">
                <i className="fa fa-envelope w3-input-group-addon"></i>
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
            </div>

            <div className="w3-margin-bottom">
              <label>パスワード</label>
              <div className="w3-input-group">
                <i className="fa fa-lock w3-input-group-addon"></i>
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
                  <i className={`fa fa-eye${showPassword ? '-slash' : ''}`}></i>
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <div className="w3-text-red">{formik.errors.password}</div>
              )}
            </div>

            <button
              type="submit"
              className="w3-button w3-blue w3-block w3-margin-bottom"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? (
                <i className="fa fa-spinner fa-spin"></i>
              ) : (
                'ログイン'
              )}
            </button>

            <div className="w3-center">
              <RouterLink to="/forgot-password" className="w3-text-blue">
                パスワードをお忘れですか？
              </RouterLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 