// login.js - 登录页面功能

// 登录函数
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showNotification('请输入用户名和密码', false);
        return;
    }

    try {
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
            showNotification('登录成功！', true);
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            console.log('登录失败详情:', {
                status: response.status,
                statusText: response.statusText,
                error: data.error,
                headers: Object.fromEntries(response.headers.entries())
            });
            showNotification(data.error || '用户名或密码错误', false);
        }
    } catch (error) {
        console.error('登录错误:', error);
        showNotification('登录错误：网络异常，请重试', false);
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