// 测试 fetch 功能
console.log('================================');
console.log('  Fetch Functionality Test');
console.log('================================\n');

// 1. 检查 Node.js 版本
console.log('1. Node.js Version:');
console.log('   ' + process.version);
const [major] = process.version.slice(1).split('.');
if (parseInt(major) < 18) {
  console.log('   [ERROR] Node.js version must be >= 18.0.0');
  console.log('   Please upgrade: https://nodejs.org/\n');
  process.exit(1);
} else {
  console.log('   [OK] Version is compatible\n');
}

// 2. 检查 fetch 是否可用
console.log('2. Fetch API:');
if (typeof fetch === 'undefined') {
  console.log('   [ERROR] fetch is not available');
  console.log('   This should not happen in Node.js 18+\n');
  process.exit(1);
} else {
  console.log('   [OK] fetch is available\n');
}

// 3. 测试基本的 fetch
console.log('3. Testing basic fetch...');
async function testBasicFetch() {
  try {
    const response = await fetch('https://www.google.com');
    console.log('   [OK] Basic fetch works');
    console.log('   Status: ' + response.status + '\n');
  } catch (error) {
    console.log('   [ERROR] Basic fetch failed');
    console.log('   Error: ' + error.message);
    console.log('   Code: ' + (error.code || 'N/A') + '\n');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   Possible causes:');
      console.log('   - Network is down');
      console.log('   - Firewall blocking connection');
      console.log('   - Proxy required\n');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('   Possible causes:');
      console.log('   - DNS resolution failed');
      console.log('   - No internet connection');
      console.log('   - Incorrect proxy settings\n');
    } else if (error.message.includes('certificate')) {
      console.log('   Possible causes:');
      console.log('   - SSL certificate issue');
      console.log('   - Corporate proxy with SSL inspection\n');
    }
    return false;
  }
  return true;
}

// 4. 测试 Google OAuth API
console.log('4. Testing Google OAuth API...');
async function testOAuthAPI() {
  try {
    // 只测试连接，不发送实际请求
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=test'
    });
    console.log('   [OK] Can reach OAuth API');
    console.log('   Status: ' + response.status + '\n');
  } catch (error) {
    console.log('   [ERROR] Cannot reach OAuth API');
    console.log('   Error: ' + error.message + '\n');
    return false;
  }
  return true;
}

// 5. 测试 Antigravity API
console.log('5. Testing Antigravity API...');
async function testAntigravityAPI() {
  try {
    const response = await fetch('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test'
      },
      body: JSON.stringify({})
    });
    console.log('   [OK] Can reach Antigravity API');
    console.log('   Status: ' + response.status + '\n');
  } catch (error) {
    console.log('   [ERROR] Cannot reach Antigravity API');
    console.log('   Error: ' + error.message + '\n');
    return false;
  }
  return true;
}

// 运行所有测试
async function runAllTests() {
  const result1 = await testBasicFetch();
  if (!result1) {
    console.log('================================');
    console.log('  Basic network test FAILED');
    console.log('  Please check your internet connection');
    console.log('================================\n');
    return;
  }

  const result2 = await testOAuthAPI();
  const result3 = await testAntigravityAPI();

  console.log('================================');
  console.log('  Test Summary');
  console.log('================================');
  console.log('Basic Fetch:      ' + (result1 ? '✓ PASS' : '✗ FAIL'));
  console.log('OAuth API:        ' + (result2 ? '✓ PASS' : '✗ FAIL'));
  console.log('Antigravity API:  ' + (result3 ? '✓ PASS' : '✗ FAIL'));
  console.log('================================\n');

  if (result1 && result2 && result3) {
    console.log('[SUCCESS] All tests passed!');
    console.log('Your environment is ready to use the quota checker.\n');
  } else {
    console.log('[WARNING] Some tests failed.');
    console.log('Please check the errors above and:');
    console.log('1. Verify internet connection');
    console.log('2. Check firewall settings');
    console.log('3. Configure proxy if needed');
    console.log('4. See fetch错误排查.md for more help\n');
  }
}

runAllTests().catch(error => {
  console.error('\n[FATAL ERROR]', error);
  process.exit(1);
});
