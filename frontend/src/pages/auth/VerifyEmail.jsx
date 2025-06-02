import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaArrowLeft } from 'react-icons/fa';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      if (token) {
        const result = await verifyEmail(token);
        if (result.success) {
          // 成功メッセージを表示してからログインページへリダイレクト
          setTimeout(() => {
            navigate('/login', {
              state: { message: 'メールアドレスの確認が完了しました。ログインしてください。' }
            });
          }, 3000);
        } else {
          setError(result.error);
        }
      }
      setIsLoading(false);
    };

    verify();
  }, [token, verifyEmail, navigate]);

  if (isLoading) {
    return (
      <div className="w3-container w3-center" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="w3-margin-bottom">
          <FaSpinner className="w3-spin w3-xxxlarge w3-text-blue" />
        </div>
        <h3 className="w3-text-blue">メールアドレスを確認中...</h3>
        <p className="w3-text-gray">しばらくお待ちください</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w3-container w3-center" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="w3-card-4 w3-round-large w3-white" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="w3-container w3-padding">
            <div className="w3-margin-bottom">
              <FaTimesCircle className="w3-xxxlarge w3-text-red" />
            </div>
            <div className="w3-panel w3-red w3-round-large">
              <p>{error}</p>
            </div>
            <button
              className="w3-button w3-blue w3-round-large w3-block"
              onClick={() => navigate('/login')}
            >
              <FaArrowLeft className="w3-margin-right" />
              ログインページへ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w3-container w3-center" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div className="w3-card-4 w3-round-large w3-white" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="w3-container w3-padding">
          <div className="w3-margin-bottom">
            <FaCheckCircle className="w3-xxxlarge w3-text-green" />
          </div>
          <div className="w3-panel w3-green w3-round-large">
            <p>メールアドレスの確認が完了しました。ログインページへリダイレクトします...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail; 