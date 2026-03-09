// 测试网站基本功能
const http = require('http');

const testUrls = [
  { url: 'http://localhost:3000', name: '首页' },
  { url: 'http://localhost:3000/products/list', name: '产品列表' },
  { url: 'http://localhost:3000/auth/login', name: '登录页面' },
  { url: 'http://localhost:3000/auth/register', name: '注册页面' },
  { url: 'http://localhost:3000/admin/login', name: '后台登录' }
];

async function testUrl(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${name} (${url}): HTTP ${res.statusCode}`);
      resolve({ success: true, status: res.statusCode });
    });

    req.on('error', (err) => {
      console.log(`❌ ${name} (${url}): ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`⏰ ${name} (${url}): 请求超时`);
      resolve({ success: false, error: 'timeout' });
    });
  });
}

async function runTests() {
  console.log('🚀 开始测试网站功能...\n');

  let passed = 0;
  let failed = 0;

  for (const test of testUrls) {
    const result = await testUrl(test.url, test.name);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // 避免请求过快
  }

  console.log('\n📊 测试结果:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${Math.round((passed / testUrls.length) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！网站运行正常。');
    console.log('\n🔗 重要链接:');
    console.log('前台首页: http://localhost:3000');
    console.log('后台管理: http://localhost:3000/admin/login');
    console.log('\n🔑 默认账号:');
    console.log('管理员: admin@jingtian.com / admin123');
    console.log('测试用户: test@example.com / test123');
  } else {
    console.log('\n⚠️  部分测试失败，请检查应用是否正常运行。');
  }
}

// 等待应用启动
setTimeout(() => {
  runTests();
}, 3000);

console.log('⏳ 等待应用启动...（3秒后开始测试）');