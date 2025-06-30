// 本地开发时使用
const API_BASE = "http://localhost:8787";

// 部署时使用
// const API_BASE = "https://worker.wengguodong.com";

// 登录函数
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include' // 必须添加
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
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showNotification(data.error || '用户名或密码错误', false);
        }
    } catch (error) {
        showNotification('网络错误，请重试: ' + error.message, false);
    }
}

// 获取内容数据 - 关键修改：添加 credentials: 'include'
async function getContentData() {
    const token = localStorage.getItem('authToken');

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}/content`, {
            headers,
            credentials: 'include' // 必须添加
        });

        if (response.ok) {
            return await response.json();
        } else {
            const errorData = await response.json();
            console.error('获取内容失败:', errorData.error);
            return { articles: [], images: [] };
        }
    } catch (error) {
        console.error('网络错误:', error);
        return { articles: [], images: [] };
    }
}

// 保存内容数据 - 关键修改：添加 credentials: 'include'
async function saveContentData(content) {
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`${API_BASE}/content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify(content),
            credentials: 'include' // 必须添加
        });

        const data = await response.json();

        if (response.ok) {
            return true;
        } else {
            console.error('保存失败:', data.error);
            return false;
        }
    } catch (error) {
        console.error('网络错误:', error);
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
