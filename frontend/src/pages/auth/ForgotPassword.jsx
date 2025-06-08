import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../../utils/axios';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';

const validationSchema = yup.object({
  email: yup
    .string()
    .email('正しいメールアドレスを入力してください')
    .required('メールアドレスは必須です')
});

const ForgotPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: ''
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setError('');
      setSuccess(false);
      setIsSubmitting(true);

      try {
        await api.post('/auth/forgot-password', { email: values.email });
        setSuccess('パスワードリセットのメールを送信しました');
      } catch (error) {
        setError(error.response?.data?.message || 'メールの送信に失敗しました');
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
          メールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
        </p>
      </div>

      {error && (
        <div className="w3-panel w3-red w3-round-large w3-margin-bottom">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="w3-panel w3-green w3-round-large w3-margin-bottom">
          <p>パスワードリセット手順をメールアドレスに送信しました。</p>
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
          disabled={success}
          required
        />
        {formik.touched.email && formik.errors.email && (
          <p className="w3-text-red w3-small">{formik.errors.email}</p>
        )}
      </div>

      <button
        type="submit"
        className="w3-button w3-blue w3-round-large w3-block w3-margin-bottom"
        disabled={isSubmitting || success}
      >
        <FaEnvelope className="w3-margin-right" />
        {isSubmitting ? '送信中...' : 'リセットリンクを送信'}
      </button>

      <div className="w3-center w3-margin-top">
        <RouterLink to="/login" className="w3-text-blue w3-hover-text-blue-gray">
          <FaArrowLeft className="w3-margin-right" />
          ログインページに戻る
        </RouterLink>
      </div>
    </form>
  );
};

export default ForgotPassword; 