// login.js - 登录页面功能

// 登录函数
async function login(event) {
    // 阻止表单默认提交行为
    if (event) {
        event.preventDefault();
    }
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showNotification('请输入用户名和密码', false);
        return;
    }
    
    // 显示加载动画
    showLoading(true);

    try {
        // 等待智能指纹系统初始化
        await ensureSmartFingerprintReady();
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            // 从响应中获取 token 或 session cookie
            const { token } = data;
            if (token) {
                localStorage.setItem('authToken', token);
            }
            showLoading(false);
            showNotification('登录成功！', true);
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            showLoading(false);
            showNotification(data.error || '用户名或密码错误', false);
        }
    } catch (error) {
        console.error('登录错误:', error);
        showLoading(false);
        showNotification('登录错误：网络异常，请重试', false);
    }
}

// 确保智能指纹系统准备就绪
async function ensureSmartFingerprintReady() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 最多等待5秒
        
        const checkReady = () => {
            attempts++;
            
            // 检查智能指纹系统是否已初始化
            if (window.smartFingerprintClient && window.smartFingerprintClient.initialized) {
                resolve();
                return;
            }
            
            // 超时后继续执行（降级处理）
            if (attempts >= maxAttempts) {
                console.warn('智能指纹系统初始化超时，继续登录');
                resolve();
                return;
            }
            
            // 继续等待
            setTimeout(checkReady, 100);
        };
        
        checkReady();
    });
}

// 显示/隐藏加载动画
function showLoading(show) {
    const loadingElement = document.getElementById('login-loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// 切换密码显示/隐藏
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordEye = document.getElementById('password-eye');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordEye.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        passwordEye.className = 'fas fa-eye';
    }
}

// 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// 键盘事件处理
document.addEventListener('DOMContentLoaded', function() {
    // 回车键登录
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });

    // 检查是否已经登录
    if (localStorage.getItem('authToken')) {
        showNotification('您已经登录，正在跳转...', true);
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
    }
}); 