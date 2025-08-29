// API配置 - 部署时使用
const API_BASE = "https://worker.wengguodong.com";

// 全局应用配置
const APP_CONFIG = {
    UPLOAD_MAX_SIZE: 5 * 1024 * 1024, // 5MB
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
    SUPPORTED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a']
};

// 抑制DOMNodeInserted废弃警告
(function() {
    const originalWarn = console.warn;
    console.warn = function(...args) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('DOMNodeInserted')) {
            return; // 忽略DOMNodeInserted警告
        }
        originalWarn.apply(console, args);
    };
})();

// 通用工具函数库

// 🌟 获取公开内容数据（无需认证）
async function getContentData() {
    try {
        const response = await fetch(`${API_BASE}/api/content`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        } else {

            return { articles: [], images: [] };
        }
    } catch (error) {
        return { articles: [], images: [] };
    }
}

// 🔒 获取管理员内容数据（需要认证）
async function getAdminContentData() {
    const token = sessionStorage.getItem('authToken');

    if (!token) {

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

            
            // 如果是401错误，说明token无效，清除并重定向到登录页面
            if (response.status === 401) {

                sessionStorage.removeItem('authToken');
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
        showNotification('网络错误，请重试', false);
        return { articles: [], images: [] };
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

// 统一深色主题管理（全站）
window.AppTheme = (function() {
    const STORAGE_KEY = 'theme';
    const DARK = 'dark';

    function setIcon(isDark) {
        try {
            const btn = document.querySelector('button.quick-btn[title="切换主题"] i');
            if (!btn) return;
            // 兼容 FontAwesome 月亮/太阳
            if (btn.classList.contains('fa-moon') || btn.classList.contains('fa-sun')) {
                btn.classList.remove('fa-moon', 'fa-sun');
                btn.classList.add(isDark ? 'fa-sun' : 'fa-moon');
            } else {
                // 其他情况不强制切换，避免覆盖自定义图标
            }
        } catch (_) { /* noop */ }
    }

    function applyTheme(isDark) {
        document.body.classList.toggle('dark-theme', isDark);
        setIcon(isDark);
    }

    function init() {
        const saved = localStorage.getItem(STORAGE_KEY);
        const isDark = saved === DARK;
        applyTheme(isDark);
    }

    function toggle() {
        const isDark = !document.body.classList.contains('dark-theme');
        applyTheme(isDark);
        localStorage.setItem(STORAGE_KEY, isDark ? DARK : 'light');
    }

    // DOM 就绪后自动初始化（幂等）
    document.addEventListener('DOMContentLoaded', () => {
        try { init(); } catch (_) { /* noop */ }
        // 统一隐藏页面级加载蒙层（若存在）
        try {
            const pageLoading = document.getElementById('page-loading');
            if (pageLoading) {
                pageLoading.classList.add('hide');
                setTimeout(() => { pageLoading.style.display = 'none'; }, 500);
            }
        } catch (_) { /* noop */ }
    });

    return { init, toggle };
})();

// 兼容页面内已有 onclick="toggleTheme()" 调用
if (!window.toggleTheme) {
    window.toggleTheme = function() { window.AppTheme.toggle(); };
}