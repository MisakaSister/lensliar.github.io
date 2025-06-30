// 本地开发时使用
// const API_BASE = "http://localhost:8787";

// 部署时使用
const API_BASE = "https://worker.wengguodong.com";

// 初始化函数
function initApp() {
    // 登录表单提交处理
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }

    // 退出按钮处理
    const logoutBtn = document.getElementById('logout-link');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // 管理页面初始化
    const contentForm = document.getElementById('content-form');
    if (contentForm) {
        contentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveContent();
        });

        // 加载现有内容
        loadContent();
    }

    // 检查登录状态并更新UI
    updateAuthUI();
}

// 更新认证状态UI
function updateAuthUI() {
    const adminLink = document.getElementById('admin-link');
    const logoutLink = document.getElementById('logout-link');
    const loginLink = document.getElementById('login-link');

    if (isLoggedIn()) {
        if (adminLink) adminLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'block';
        if (loginLink) loginLink.style.display = 'none';
    } else {
        if (adminLink) adminLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
        if (loginLink) loginLink.style.display = 'block';
    }
}

// 检查是否已登录
function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}

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
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            // 从响应中获取 token
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
        showNotification('登录错误： ' + error.message, false);
    }
}

// 退出函数
function logout() {
    localStorage.removeItem('authToken');
    showNotification('您已成功退出', true);
    updateAuthUI();
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// 加载内容到表单
async function loadContent() {
    try {
        const content = await getContentData();

        // 填充表单字段
        document.getElementById('articles').value = content.articles.join('\n');
        document.getElementById('images').value = content.images.join('\n');
    } catch (error) {
        console.error('加载内容失败:', error);
        showNotification('加载内容失败，请重试', false);
    }
}

// 保存内容
async function saveContent() {
    // 验证登录状态
    if (!isLoggedIn()) {
        showNotification('请先登录再进行此操作', false);
        return;
    }

    // 获取表单数据
    const articles = document.getElementById('articles').value
        .split('\n')
        .filter(line => line.trim() !== '');

    const images = document.getElementById('images').value
        .split('\n')
        .filter(line => line.trim() !== '');

    const content = { articles, images };

    try {
        const success = await saveContentData(content);
        if (success) {
            showNotification('内容保存成功！', true);
        } else {
            showNotification('内容保存失败', false);
        }
    } catch (error) {
        console.error('保存错误:', error);
        showNotification('保存过程中发生错误', false);
    }
}

// 获取内容数据
async function getContentData() {
    const token = localStorage.getItem('authToken');

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}/content`, {
            headers,
            credentials: 'include'
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

// 保存内容数据
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
            credentials: 'include'
        });

        if (response.ok) {
            return true;
        } else {
            const errorData = await response.json();
            console.error('保存失败:', errorData.error);
            return false;
        }
    } catch (error) {
        console.error('网络错误:', error);
        return false;
    }
}

// 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
