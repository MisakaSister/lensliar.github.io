// 管理后台仪表板
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化统一导航栏
    Utils.initNavigation('admin');
    
    // 检查登录状态并验证token有效性
    await checkAuthStatus();
    
    // 设置事件监听
    setupEventListeners();
    
    // 初始化主题（统一使用 localStorage）
    initTheme();
    
    // 加载统计数据
    try {
        await loadStats();
    } catch (error) {
        console.error('加载统计数据失败:', error);
        if (error.message.includes('401')) {
            sessionStorage.removeItem('authToken');
            window.location.href = 'login.html';
            return;
        }
        showNotification('加载统计数据失败，请稍后重试', false);
    }
    
    Utils.showLoading(false);
});

// 检查认证状态
async function checkAuthStatus() {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // 验证token有效性
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            // token无效，清除并跳转到登录页
            sessionStorage.removeItem('authToken');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('验证token失败:', error);
        // 网络错误时也跳转到登录页
        sessionStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}

// 设置事件监听
function setupEventListeners() {
    // 退出登录
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
}

// 加载统计数据
async function loadStats() {
    try {
        // 加载文章统计
        const articlesResponse = await fetch(`${API_BASE}/content`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
        });
        
        if (articlesResponse.ok) {
            const articlesData = await articlesResponse.json();
            const totalArticles = articlesData.articles?.length || 0;
            const publishedArticles = articlesData.articles?.filter(article => article.status === 'published').length || 0;
            
            document.getElementById('articles-stats').innerHTML = `
                <span class="stats-number">${totalArticles}</span> 篇文章
                <br><small>${publishedArticles} 篇已发布</small>
            `;
        }
        
        // 加载相册统计
        const albumsResponse = await fetch(`${API_BASE}/images`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
        });
        
        if (albumsResponse.ok) {
            const albumsData = await albumsResponse.json();
            const totalAlbums = albumsData.images?.length || 0; // 后端返回的是 images 字段
            const totalImages = albumsData.images?.reduce((sum, album) => sum + (album.images?.length || 0), 0) || 0;
            
            document.getElementById('albums-stats').innerHTML = `
                <span class="stats-number">${totalAlbums}</span> 个相册
                <br><small>${totalImages} 张图片</small>
            `;
        }
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
        throw error;
    }
}

// showNotification函数已在app.js中定义

// 退出登录
function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
    showNotification('已退出登录');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// 返回顶部
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 初始化主题
function initTheme() { try { window.AppTheme.init(); } catch(_){} }

// 切换主题
function toggleTheme() { try { window.AppTheme.toggle(); } catch(_){} }