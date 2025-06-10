// ログインテスト用のダイレクト実行スクリプト
// このファイルをフロントエンドで直接実行してログイン機能をテスト

console.log('🔑 直接ログインテスト開始');

// AuthContextから直接ログイン関数を呼び出すテスト
const testDirectLogin = async () => {
  try {
    console.log('📞 直接API呼び出しテスト');
    
    // 直接APIを呼び出してログインをテスト
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    console.log('📝 レスポンス:', response);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ ログイン成功:', data);
      
      // トークンを保存
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        console.log('🎫 トークンを保存しました');
        
        // ユーザーデータを取得
        const userResponse = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${data.data.token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('👤 ユーザーデータ取得成功:', userData);
        } else {
          console.error('❌ ユーザーデータ取得失敗:', userResponse.status);
        }
      }
      
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ ログイン失敗:', errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ ログインエラー:', error);
    return false;
  }
};

// ReactContext経由でのログインテスト
const testContextLogin = async () => {
  try {
    console.log('🔄 AuthContext経由でのログインテスト');
    
    // AuthContextが利用可能かチェック
    if (window.React && window.React.useContext) {
      console.log('⚠️  このテストはReactコンポーネント内で実行する必要があります');
      return false;
    }
    
    // AuthContext経由のテストはコンポーネント内でのみ可能
    console.log('ℹ️  AuthContext テストはコンポーネント内で実行してください');
    return false;
  } catch (error) {
    console.error('❌ AuthContextテストエラー:', error);
    return false;
  }
};

// メイン実行
const runLoginTests = async () => {
  console.log('🚀 ログイン機能の包括的テスト開始');
  
  // 現在の認証状態をクリア
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userData');
  
  console.log('🧹 認証状態をクリアしました');
  
  // 直接APIテスト
  const apiTestResult = await testDirectLogin();
  console.log(`📊 API直接テスト結果: ${apiTestResult ? '✅ 成功' : '❌ 失敗'}`);
  
  // AuthContextテスト
  const contextTestResult = await testContextLogin();
  console.log(`📊 AuthContextテスト結果: ${contextTestResult ? '✅ 成功' : '❌ 失敗'}`);
  
  console.log('🏁 テスト完了');
  
  return {
    apiTest: apiTestResult,
    contextTest: contextTestResult
  };
};

// グローバルに関数を露出
window.testDirectLogin = testDirectLogin;
window.testContextLogin = testContextLogin;
window.runLoginTests = runLoginTests;

// 自動実行
runLoginTests();

console.log('📖 利用可能なテスト関数:');
console.log('- testDirectLogin() - 直接API呼び出しテスト');
console.log('- testContextLogin() - AuthContext経由テスト');
console.log('- runLoginTests() - 全テスト実行');
