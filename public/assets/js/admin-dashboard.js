// 管理后台仪表板
document.addEventListener('DOMContentLoaded', async function() {
    // 检查登录状态
    if (!localStorage.getItem('authToken')) {
        window.location.href = 'login.html';
        return;
    }
    
    // 设置事件监听
    setupEventListeners();
    
    // 加载统计数据
    try {
        await loadStats();
    } catch (error) {
        console.error('加载统计数据失败:', error);
        if (error.message.includes('401')) {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
            return;
        }
        showNotification('加载统计数据失败，请稍后重试', false);
    }
    
    Utils.showLoading(false);
});

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
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
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
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
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

// 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    showNotification('已退出登录');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// 返回顶部
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 切换主题
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const icon = document.querySelector('.quick-btn .fa-moon');
    if (icon) {
        icon.classList.toggle('fa-sun');
    }
} 