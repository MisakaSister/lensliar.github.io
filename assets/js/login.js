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
        // 添加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 添加智能指纹头部
                ...getFingerprintHeaders()
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        // 检查响应状态
        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = '登录失败';
            
            switch (response.status) {
                case 400:
                    errorMessage = '请求参数错误';
                    break;
                case 401:
                    errorMessage = errorData.error || '用户名或密码错误';
                    break;
                case 403:
                    errorMessage = '访问被拒绝，请检查域名配置';
                    break;
                case 429:
                    errorMessage = '请求过于频繁，请稍后再试';
                    break;
                case 500:
                    errorMessage = '服务器内部错误，请联系管理员';
                    break;
                default:
                    errorMessage = `登录失败 (${response.status}): ${errorData.error || '未知错误'}`;
            }
            
            showLoading(false);
            showNotification(errorMessage, false);
            return;
        }

        const data = await response.json();

        // 从响应中获取 token 或 session cookie
        const { token } = data;
        if (token) {
            sessionStorage.setItem('authToken', token);
        }
        showLoading(false);
        showNotification('登录成功！', true);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('登录错误详情:', error);
        showLoading(false);
        
        let errorMessage = '登录失败';
        
        if (error.name === 'AbortError') {
            errorMessage = '登录超时，请检查网络连接';
        } else if (error.name === 'TypeError') {
            if (error.message.includes('fetch')) {
                errorMessage = `网络连接失败，请检查API地址: ${API_BASE}`;
            } else {
                errorMessage = '网络异常，请重试';
            }
        } else if (error.message.includes('CORS')) {
            errorMessage = '跨域请求被阻止，请检查域名配置';
        } else {
            errorMessage = `登录错误: ${error.message}`;
        }
        
        showNotification(errorMessage, false);
    }
}

// 获取指纹头部信息
function getFingerprintHeaders() {
    // 使用基础指纹信息
    return {
        'X-Screen-Info': `${screen.width}x${screen.height}:${screen.colorDepth}:${window.devicePixelRatio}`,
        'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Language': navigator.language
    };
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
        }, 5000); // 延长显示时间以便查看详细错误
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
    if (sessionStorage.getItem('authToken')) {
        showNotification('您已经登录，正在跳转...', true);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
    
    // 添加环境信息到控制台
    
    
    
}); 
