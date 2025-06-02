import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';

const validationSchema = yup.object({
  email: yup
    .string()
    .email('正しいメールアドレスを入力してください')
    .required('メールアドレスは必須です'),
  password: yup
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .required('パスワードは必須です')
});

const Login = () => {
  const [error, setError] = useState('');
  const { login } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError('');
        const { success, error } = await login(values.email, values.password);
        if (!success) {
          setError(error);
        }
      } finally {
        setSubmitting(false);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    formik.handleSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="w3-container w3-margin-top">
      {error && (
        <div className="w3-panel w3-red w3-round-large w3-margin-bottom">
          <p>{error}</p>
        </div>
      )}
      
      <div className="w3-margin-bottom">
        <label className="w3-text-blue"><b><FaEnvelope className="w3-margin-right" />メールアドレス</b></label>
        <input
          type="email"
          id="email"
          name="email"
          className={`w3-input w3-border w3-round-large ${
            formik.touched.email && formik.errors.email ? 'w3-border-red' : ''
          }`}
          placeholder="メールアドレスを入力してください"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          autoComplete="email"
          autoFocus
          required
        />
        {formik.touched.email && formik.errors.email && (
          <p className="w3-text-red w3-small">{formik.errors.email}</p>
        )}
      </div>

      <div className="w3-margin-bottom">
        <label className="w3-text-blue"><b><FaLock className="w3-margin-right" />パスワード</b></label>
        <input
          type="password"
          id="password"
          name="password"
          className={`w3-input w3-border w3-round-large ${
            formik.touched.password && formik.errors.password ? 'w3-border-red' : ''
          }`}
          placeholder="パスワードを入力してください"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          autoComplete="current-password"
          required
        />
        {formik.touched.password && formik.errors.password && (
          <p className="w3-text-red w3-small">{formik.errors.password}</p>
        )}
      </div>

      <div className="w3-margin-bottom">
        <label className="w3-check">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formik.values.rememberMe}
            onChange={formik.handleChange}
          />
          <span className="w3-checkmark"></span>
          ログイン状態を保持する
        </label>
      </div>

      <button
        type="submit"
        className="w3-button w3-blue w3-round-large w3-block w3-margin-bottom"
        disabled={formik.isSubmitting}
      >
        <FaSignInAlt className="w3-margin-right" />
        {formik.isSubmitting ? 'ログイン中...' : 'ログイン'}
      </button>

      <div className="w3-row w3-margin-top">
        <div className="w3-col s6">
          <RouterLink to="/forgot-password" className="w3-text-blue w3-hover-text-blue-gray">
            パスワードを忘れた方
          </RouterLink>
        </div>
        <div className="w3-col s6 w3-right-align">
          <RouterLink to="/register" className="w3-text-blue w3-hover-text-blue-gray">
            アカウントをお持ちでない方
          </RouterLink>
        </div>
      </div>
    </form>
  );
};

export default Login; 