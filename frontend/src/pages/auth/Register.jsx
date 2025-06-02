import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaEnvelope, FaLock, FaBuilding, FaUserPlus } from 'react-icons/fa';

const validationSchema = yup.object({
  firstName: yup
    .string()
    .required('名前は必須です')
    .min(2, '名前は2文字以上である必要があります'),
  lastName: yup
    .string()
    .required('苗字は必須です')
    .min(2, '苗字は2文字以上である必要があります'),
  email: yup
    .string()
    .email('正しいメールアドレスを入力してください')
    .required('メールアドレスは必須です'),
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
    .required('パスワード確認は必須です'),
  companyName: yup
    .string()
    .required('会社名は必須です')
    .min(2, '会社名は2文字以上である必要があります')
});

const Register = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: ''
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setError('');
      setSuccess(false);
      
      const { success, error, data } = await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        role: 'COMPANY',
        company: {
          name: values.companyName
        }
      });

      if (success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(error);
      }
    }
  });

  return (
    <form onSubmit={formik.handleSubmit} className="w3-container w3-margin-top">
      {error && (
        <div className="w3-panel w3-red w3-round-large w3-margin-bottom">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="w3-panel w3-green w3-round-large w3-margin-bottom">
          <p>登録が完了しました！メールアドレスを確認してアカウントを有効化してください。ログインページに移動します...</p>
        </div>
      )}
      
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-half">
          <label className="w3-text-blue"><b><FaUser className="w3-margin-right" />名前</b></label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            className={`w3-input w3-border w3-round-large ${
              formik.touched.firstName && formik.errors.firstName ? 'w3-border-red' : ''
            }`}
            placeholder="名前を入力してください"
            value={formik.values.firstName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            autoComplete="given-name"
            required
          />
          {formik.touched.firstName && formik.errors.firstName && (
            <p className="w3-text-red w3-small">{formik.errors.firstName}</p>
          )}
        </div>
        <div className="w3-half">
          <label className="w3-text-blue"><b><FaUser className="w3-margin-right" />苗字</b></label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            className={`w3-input w3-border w3-round-large ${
              formik.touched.lastName && formik.errors.lastName ? 'w3-border-red' : ''
            }`}
            placeholder="苗字を入力してください"
            value={formik.values.lastName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            autoComplete="family-name"
            required
          />
          {formik.touched.lastName && formik.errors.lastName && (
            <p className="w3-text-red w3-small">{formik.errors.lastName}</p>
          )}
        </div>
      </div>

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
          required
        />
        {formik.touched.email && formik.errors.email && (
          <p className="w3-text-red w3-small">{formik.errors.email}</p>
        )}
      </div>

      <div className="w3-margin-bottom">
        <label className="w3-text-blue"><b><FaBuilding className="w3-margin-right" />会社名</b></label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          className={`w3-input w3-border w3-round-large ${
            formik.touched.companyName && formik.errors.companyName ? 'w3-border-red' : ''
          }`}
          placeholder="会社名を入力してください"
          value={formik.values.companyName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          required
        />
        {formik.touched.companyName && formik.errors.companyName && (
          <p className="w3-text-red w3-small">{formik.errors.companyName}</p>
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
          autoComplete="new-password"
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
          required
        />
        {formik.touched.confirmPassword && formik.errors.confirmPassword && (
          <p className="w3-text-red w3-small">{formik.errors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        className="w3-button w3-blue w3-round-large w3-block w3-margin-bottom"
        disabled={formik.isSubmitting || success}
      >
        <FaUserPlus className="w3-margin-right" />
        {formik.isSubmitting ? '登録中...' : '新規登録'}
      </button>

      <div className="w3-center w3-margin-top">
        <RouterLink to="/login" className="w3-text-blue w3-hover-text-blue-gray">
          既にアカウントをお持ちの方はこちら
        </RouterLink>
      </div>
    </form>
  );
};

export default Register;