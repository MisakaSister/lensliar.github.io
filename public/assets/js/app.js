// 本地开发时使用
// const API_BASE = "http://localhost:8787";

// 部署时使用
const API_BASE = "https://worker.wengguodong.com";

// 通用工具函数库

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

// 全局工具函数 - 供所有页面使用
