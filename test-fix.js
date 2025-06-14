const https = require('http');

async function testAPI() {
  try {
    console.log('Testing login...');
    
    // Login first
    const loginData = JSON.stringify({
      email: 'company1@example.com',
      password: 'Company123!'
    });

    const loginOptions = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const loginResponse = await new Promise((resolve, reject) => {
      const req = https.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log('Login response status:', res.statusCode);
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            console.log('Login failed:', data);
            reject(new Error('Login failed'));
          }
        });
      });

      req.on('error', reject);
      req.write(loginData);
      req.end();
    });

    console.log('Login successful');
    const token = loginResponse.data.token;

    // Now test the skills endpoint
    console.log('\nTesting skills endpoint...');
    
    const skillsOptions = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/skills/company/available',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const skillsResponse = await new Promise((resolve, reject) => {
      const req = https.request(skillsOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log('Skills endpoint response status:', res.statusCode);
          console.log('Skills endpoint response:', data);
          resolve({ status: res.statusCode, data });
        });
      });

      req.on('error', reject);
      req.end();
    });

    if (skillsResponse.status === 200) {
      console.log('\n✅ SUCCESS: Skills endpoint is working!');
      const skillsData = JSON.parse(skillsResponse.data);
      console.log(`Found ${skillsData.data.availableSkills.length} available skills`);
    } else {
      console.log('\n❌ FAILED: Skills endpoint returned error');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
