// 本地开发时使用
// const API_BASE = "http://localhost:8787";

// 部署时使用
const API_BASE = "https://worker.wengguodong.com";

// 通用工具函数库

// 🌟 获取公开内容数据（无需认证）
async function getContentData() {
    try {
        const response = await fetch(`${API_BASE}/public/content`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        } else {
            console.error('获取内容失败:', response.status);
            return { articles: [], images: [] };
        }
    } catch (error) {
        console.error('网络错误:', error);
        return { articles: [], images: [] };
    }
}

// 🔒 获取管理员内容数据（需要认证）
async function getAdminContentData() {
    const token = localStorage.getItem('authToken');

    if (!token) {
        console.error('No auth token found');
        // 重定向到登录页面
        if (window.location.pathname.includes('admin.html')) {
            showNotification('请先登录', false);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }
        return { articles: [], images: [] };
    }

    try {
        const response = await fetch(`${API_BASE}/content`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        } else {
            const errorData = await response.json();
            console.error('获取管理员内容失败:', response.status, errorData.error);
            
            // 如果是401错误，说明token无效，清除并重定向到登录页面
            if (response.status === 401) {
                console.log('🔍 401错误 - 清除无效token并重定向到登录页面');
                localStorage.removeItem('authToken');
                showNotification('登录已过期，请重新登录', false);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                showNotification(`获取内容失败: ${errorData.error}`, false);
            }
            
            return { articles: [], images: [] };
        }
    } catch (error) {
        console.error('网络错误:', error);
        showNotification('网络错误，请重试', false);
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

// 全局工具函数 - 供所有页面使用
