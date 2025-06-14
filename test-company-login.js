const axios = require('axios');

async function testCompanyLogin() {
  try {
    console.log('COMPANYユーザーでログインテスト開始...');
    
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'company1@example.com',
      password: 'Company123!'
    });

    console.log('ログイン成功:', loginResponse.data.status);
    console.log('ユーザー情報:', {
      id: loginResponse.data.data.user.id,
      email: loginResponse.data.data.user.email,
      role: loginResponse.data.data.user.role,
      companyId: loginResponse.data.data.user.companyId
    });

    const token = loginResponse.data.data.token;
    console.log('トークン取得成功');

    // グローバルスキルAPIにアクセステスト
    console.log('\nグローバルスキルAPIテスト...');
    const skillsResponse = await axios.get('http://localhost:3000/api/skills/global', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('グローバルスキルAPI成功:', skillsResponse.data.status);
    console.log('取得されたスキル数:', skillsResponse.data.data.skills.length);
    console.log('カテゴリ数:', Object.keys(skillsResponse.data.data.categories).length);

    // 会社選択スキルAPIテスト
    console.log('\n会社スキルAPIテスト...');
    const companySkillsResponse = await axios.get('http://localhost:3000/api/skills/company', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('会社スキルAPI成功:', companySkillsResponse.data.status);
    console.log('会社のスキル数:', companySkillsResponse.data.data.skills.length);

    console.log('\n✅ 全てのテストが成功しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('認証エラー: トークンが無効または期限切れの可能性があります');
    } else if (error.response?.status === 403) {
      console.error('認可エラー: COMPANYユーザーにアクセス権限がありません');
    }
  }
}

testCompanyLogin();
