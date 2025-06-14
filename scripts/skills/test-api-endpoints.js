const axios = require('axios');

// テスト用の認証トークンとベースURL
const BASE_URL = 'http://localhost/api';
const TEST_TOKEN = process.env.TEST_TOKEN || '';

async function testSkillsAPI() {
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const results = {
    companySkills: null,
    availableSkills: null,
    globalSkills: null,
    errors: []
  };

  try {
    // 1. 会社選択済みスキルAPI
    console.log('Testing /api/skills/company...');
    try {
      const companyResponse = await axios.get(`${BASE_URL}/skills/company`, { headers });
      results.companySkills = {
        status: companyResponse.status,
        dataStructure: companyResponse.data.status,
        skillsCount: companyResponse.data.data?.skills?.length || 0
      };
      console.log(`✅ Company skills: ${results.companySkills.skillsCount} items`);
    } catch (error) {
      results.errors.push(`Company skills API: ${error.response?.status} - ${error.message}`);
      console.log(`❌ Company skills API failed: ${error.response?.status}`);
    }

    // 2. 利用可能スキルAPI
    console.log('Testing /api/skills/company/available...');
    try {
      const availableResponse = await axios.get(`${BASE_URL}/skills/company/available`, { headers });
      results.availableSkills = {
        status: availableResponse.status,
        dataStructure: availableResponse.data.status,
        skillsCount: availableResponse.data.data?.skills?.length || 0
      };
      console.log(`✅ Available skills: ${results.availableSkills.skillsCount} items`);
    } catch (error) {
      results.errors.push(`Available skills API: ${error.response?.status} - ${error.message}`);
      console.log(`❌ Available skills API failed: ${error.response?.status}`);
    }

    // 3. グローバルスキルAPI（管理者のみ）
    console.log('Testing /api/skills/global...');
    try {
      const globalResponse = await axios.get(`${BASE_URL}/skills/global`, { headers });
      results.globalSkills = {
        status: globalResponse.status,
        dataStructure: globalResponse.data.status,
        skillsCount: globalResponse.data.data?.skills?.length || 0
      };
      console.log(`✅ Global skills: ${results.globalSkills.skillsCount} items`);
    } catch (error) {
      results.errors.push(`Global skills API: ${error.response?.status} - ${error.message}`);
      console.log(`❌ Global skills API failed: ${error.response?.status}`);
    }

  } catch (error) {
    results.errors.push(`General error: ${error.message}`);
  }

  return results;
}

// スクリプト実行時の処理
if (require.main === module) {
  console.log('=== スキルAPI動作確認 ===');
  console.log('注意: 有効な認証トークンが必要です');
  
  testSkillsAPI()
    .then(results => {
      console.log('\n=== 結果サマリー ===');
      if (results.companySkills) {
        console.log(`会社選択済みスキル: ${results.companySkills.skillsCount}件`);
      }
      if (results.availableSkills) {
        console.log(`利用可能スキル: ${results.availableSkills.skillsCount}件`);
      }
      if (results.globalSkills) {
        console.log(`グローバルスキル: ${results.globalSkills.skillsCount}件`);
      }
      
      if (results.errors.length > 0) {
        console.log('\n=== エラー ===');
        results.errors.forEach(error => console.log(`❌ ${error}`));
      }
    })
    .catch(error => {
      console.error('スクリプト実行エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { testSkillsAPI };
