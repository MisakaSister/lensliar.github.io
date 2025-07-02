// 测试认证流程的脚本
const API_BASE = "https://worker.wengguodong.com";

async function testLogin() {
    console.log("🔍 测试登录API...");
    
    // 测试用的凭据（请替换为实际凭据）
    const credentials = {
        username: "admin", // 请替换为实际用户名
        password: "your-password" // 请替换为实际密码
    };
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://wengguodong.com' // 模拟前端Origin
            },
            body: JSON.stringify(credentials)
        });
        
        console.log("登录响应状态:", response.status);
        console.log("登录响应头:", Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log("登录响应数据:", data);
        
        if (response.ok && data.token) {
            console.log("✅ 登录成功，获得token:", data.token.substring(0, 10) + "...");
            return data.token;
        } else {
            console.log("❌ 登录失败:", data.error);
            return null;
        }
    } catch (error) {
        console.error("❌ 登录请求异常:", error);
        return null;
    }
}

async function testAuthenticatedRequest(token) {
    console.log("\n🔍 测试认证请求...");
    
    try {
        const response = await fetch(`${API_BASE}/content`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Origin': 'https://wengguodong.com'
            }
        });
        
        console.log("内容请求状态:", response.status);
        console.log("内容请求响应头:", Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log("内容请求响应数据:", data);
        
        if (response.ok) {
            console.log("✅ 认证请求成功");
        } else {
            console.log("❌ 认证请求失败:", data.error);
        }
    } catch (error) {
        console.error("❌ 认证请求异常:", error);
    }
}

async function testPublicAPI() {
    console.log("\n🔍 测试公开API...");
    
    try {
        const response = await fetch(`${API_BASE}/public/content`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://wengguodong.com'
            }
        });
        
        console.log("公开API状态:", response.status);
        const data = await response.json();
        console.log("公开API响应:", data);
        
        if (response.ok) {
            console.log("✅ 公开API正常");
        } else {
            console.log("❌ 公开API异常");
        }
    } catch (error) {
        console.error("❌ 公开API请求异常:", error);
    }
}

// 运行测试
async function runTests() {
    console.log("🚀 开始认证流程测试...\n");
    
    // 测试公开API
    await testPublicAPI();
    
    // 测试登录
    const token = await testLogin();
    
    if (token) {
        // 测试认证请求
        await testAuthenticatedRequest(token);
    }
    
    console.log("\n🏁 测试完成");
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    // 需要安装 node-fetch: npm install node-fetch
    const fetch = require('node-fetch');
    runTests();
} else {
    // 在浏览器中运行
    runTests();
} 