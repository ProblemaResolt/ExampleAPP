import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../../utils/axios';
import { FaLock, FaRedo } from 'react-icons/fa';

const validationSchema = yup.object({
  password: yup
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'パスワードは大文字、小文字、数字、特殊文字を含む必要があります'
    )
    .required('パスワードは必須です'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'パスワードが一致しません')
    .required('パスワード確認は必須です')
});

const ResetPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: ''
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setError('');
      setSuccess(false);
      setIsSubmitting(true);

      try {
        await api.post('/auth/reset-password', {
          token,
          password: values.password
        });
        setSuccess('パスワードをリセットしました');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (error) {
        setError(error.response?.data?.message || 'パスワードのリセットに失敗しました');
        setSuccess('');
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  return (
    <form onSubmit={formik.handleSubmit} className="w3-container w3-margin-top">
      <div className="w3-center w3-margin-bottom">
        <h2 className="w3-text-blue">パスワードリセット</h2>
        <p className="w3-text-gray">
          新しいパスワードを入力してください。
        </p>
      </div>

      {error && (
        <div className="w3-panel w3-red w3-round-large w3-margin-bottom">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="w3-panel w3-green w3-round-large w3-margin-bottom">
          <p>パスワードが正常にリセットされました。ログインページに移動しています...</p>
        </div>
      )}

      <div className="w3-margin-bottom">
        <label className="w3-text-blue"><b><FaLock className="w3-margin-right" />新しいパスワード</b></label>
        <input
          type="password"
          id="password"
          name="password"
          className={`w3-input w3-border w3-round-large ${
            formik.touched.password && formik.errors.password ? 'w3-border-red' : ''
          }`}
          placeholder="新しいパスワードを入力してください"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          autoComplete="new-password"
          disabled={success}
          required
        />
        {formik.touched.password && formik.errors.password && (
          <p className="w3-text-red w3-small">{formik.errors.password}</p>
        )}
      </div>

      <div className="w3-margin-bottom">
        <label className="w3-text-blue"><b><FaLock className="w3-margin-right" />パスワード確認</b></label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          className={`w3-input w3-border w3-round-large ${
            formik.touched.confirmPassword && formik.errors.confirmPassword ? 'w3-border-red' : ''
          }`}
          placeholder="パスワードを再入力してください"
          value={formik.values.confirmPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          disabled={success}
          required
        />
        {formik.touched.confirmPassword && formik.errors.confirmPassword && (
          <p className="w3-text-red w3-small">{formik.errors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        className="w3-button w3-blue w3-round-large w3-block w3-margin-bottom"
        disabled={isSubmitting || success}
      >
        <FaRedo className="w3-margin-right" />
        {isSubmitting ? 'リセット中...' : 'パスワードをリセット'}
      </button>
    </form>
  );
};

export default ResetPassword; 