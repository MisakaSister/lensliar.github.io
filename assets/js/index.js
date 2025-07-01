// index.js - 首页功能

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    if (localStorage.getItem('authToken')) {
        document.getElementById('admin-link').style.display = 'block';
        document.getElementById('logout-link').style.display = 'block';
    } else {
        document.getElementById('admin-link').style.display = 'none';
        document.getElementById('logout-link').style.display = 'none';
    }

    // 加载内容
    loadContent();

    // 绑定退出按钮
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
});

// 加载内容
async function loadContent() {
    try {
        // 🌟 使用公开API，无需认证
        const response = await fetch(`${API_BASE}/public/content`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const content = await response.json();
            renderContent(content);
        } else {
            console.error('加载内容失败:', response.status);
            showNotification('加载内容失败', false);
        }
    } catch (error) {
        console.error('加载内容异常:', error);
        showNotification('网络错误，请重试', false);
    }
}

// 渲染内容
function renderContent(content) {
    const articlesContainer = document.getElementById('articles-container');
    const galleryContainer = document.getElementById('gallery-container');

    // 清空容器
    articlesContainer.innerHTML = '';
    galleryContainer.innerHTML = '';

    // 渲染文章
    content.articles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'card';
        
        // 🔍 调试：检查图片URL
        console.log(`文章 "${article.title}" 图片URL:`, article.image);
        
        const imageUrl = article.image || 'https://via.placeholder.com/600x400';
        articleElement.innerHTML = `
                <img src="${imageUrl}" alt="${article.title}" class="card-img" onerror="console.error('图片加载失败:', '${imageUrl}'); this.src='https://via.placeholder.com/600x400';">
                <div class="card-body">
                    <h3 class="card-title">${article.title}</h3>
                    <p class="card-text">${article.content.substring(0, 100)}...</p>
                    <button class="btn" onclick="viewDetail('article', ${article.id})">查看详情</button>
                </div>
            `;
        articlesContainer.appendChild(articleElement);
    });

    // 渲染图片
    content.images.forEach(image => {
        const imageElement = document.createElement('div');
        imageElement.className = 'card';
        imageElement.innerHTML = `
                <img src="${image.url || 'https://via.placeholder.com/600x400'}" alt="${image.title}" class="card-img">
                <div class="card-body">
                    <h3 class="card-title">${image.title}</h3>
                    <button class="btn" onclick="viewDetail('image', ${image.id})">查看详情</button>
                </div>
            `;
        galleryContainer.appendChild(imageElement);
    });
}

// 查看详情
function viewDetail(type, id) {
    localStorage.setItem('currentDetail', JSON.stringify({ type, id }));
    window.location.href = 'detail.html';
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    showNotification('您已成功退出', true);
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
} 