// 本地开发时使用
// const API_BASE = "http://localhost:8787";

// 部署时使用
const API_BASE = "https://worker.wengguodong.com";

// 登录函数
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const { token } = await response.json();
            localStorage.setItem('authToken', token);
            showNotification('登录成功！', true);
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);
        } else {
            showNotification('用户名或密码错误', false);
        }
    } catch (error) {
        showNotification('网络错误，请重试', false);
    }
}

// 获取内容数据
async function getContentData() {
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`${API_BASE}/content`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            return await response.json();
        }
        return { articles: [], images: [] };
    } catch (error) {
        return { articles: [], images: [] };
    }
}

// 保存内容数据
async function saveContentData(content) {
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`${API_BASE}/content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(content)
        });

        return response.ok;
    } catch (error) {
        return false;
    }
}

// 通用函数
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 初始化公共功能
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    if (localStorage.getItem('authToken')) {
        const adminLink = document.getElementById('admin-link');
        const logoutLink = document.getElementById('logout-link');

        if (adminLink) adminLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'block';
    }

    // 绑定退出按钮
    const logoutBtn = document.getElementById('logout-link');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('authToken');
            showNotification('您已成功退出', true);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }
});
