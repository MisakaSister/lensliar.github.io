const API_BASE = 'https://your-worker-url.dev';

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
            window.location.href = 'home.html';
        } else {
            showNotification('用户名或密码错误', false);
        }
    } catch (error) {
        showNotification('网络错误，请重试', false);
    }
}

// 验证令牌
async function verifyToken() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        return response.ok;
    } catch (error) {
        return false;
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

// 路由保护
async function protectRoutes() {
    const protectedPages = ['admin.html', 'detail.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (protectedPages.includes(currentPage)) {
        const isAuthenticated = await verifyToken();
        if (!isAuthenticated) {
            showNotification('请先登录', false);
            setTimeout(() => window.location.href = 'index.html', 1500);
            return false;
        }
    }
    return true;
}

// 初始化页面
async function initPage() {
    if (!await protectRoutes()) return;

    const isAuthenticated = await verifyToken();
    if (isAuthenticated) {
        document.getElementById('admin-link')?.style.display = 'block';
        document.getElementById('logout-link')?.style.display = 'block';
    }

    // 页面特定初始化
    if (document.getElementById('home-page')) {
        const contentData = await getContentData();
        renderArticles(contentData.articles);
        renderGallery(contentData.images);
    }

    if (document.getElementById('admin-page')) {
        const contentData = await getContentData();
        renderArticlesList(contentData.articles);
        renderImagesList(contentData.images);
        setupFormEvents();
    }

    if (document.getElementById('detail-page')) {
        loadDetailContent();
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    showNotification('您已成功退出', true);
    window.location.href = 'index.html';
}

// 其他函数保持不变...
