// Login Test Script
// Run this in browser console to test login functionality

console.log('🔑 Login Test Started');

const testCredentials = [
  { email: 'admin@example.com', password: 'admin123' },
  { email: 'admin2@example.com', password: 'admin123' },
  { email: 'superadmin@example.com', password: 'admin123' },
  // Add more credentials from seed data
  { email: 'manager1@techone.co.jp', password: 'Manager123!' },
  { email: 'dev1@techone.co.jp', password: 'Dev123!' }
];

const testLogin = async (credentials) => {
  console.log(`🔄 Testing login for: ${credentials.email}`);
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Login successful for ${credentials.email}:`, data);
      
      // Test token storage and authentication state
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        console.log('🎫 Token stored in localStorage');
        
        // Test /users/me endpoint
        const userResponse = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${data.data.token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('👤 User data fetched:', userData);
        } else {
          console.error(`❌ Failed to fetch user data: ${userResponse.status}`);
        }
      }
      
      return { success: true, data };
    } else {
      console.error(`❌ Login failed for ${credentials.email}:`, data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error(`❌ Login error for ${credentials.email}:`, error);
    return { success: false, error: error.message };
  }
};

// Test all credentials
const runAllTests = async () => {
  console.log('🚀 Starting comprehensive login tests...');
  
  for (const creds of testCredentials) {
    await testLogin(creds);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log('🏁 All login tests completed');
};

// Test specific credential
const testSingleLogin = async (email, password) => {
  return await testLogin({ email, password });
};

// Clear authentication
const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userData');
  console.log('🧹 Authentication cleared');
};

// Export functions for manual testing
window.loginTest = {
  testLogin,
  runAllTests,
  testSingleLogin,
  clearAuth,
  testCredentials
};

console.log('📝 Available commands:');
console.log('- loginTest.testSingleLogin("admin@example.com", "admin123")');
console.log('- loginTest.runAllTests()');
console.log('- loginTest.clearAuth()');
