// article-detail.js - 文章详情页面功能

// 全局变量
let allArticles = [];
let currentArticle = null;
let isDarkTheme = false;

// 分类名称映射
const categoryNameMap = {
    'cat_article_1': '技术分享',
    'cat_article_2': '生活随笔',
    'cat_article_3': '学习笔记',
    'cat_article_4': '项目展示',
    'cat_album_1': '风景摄影',
    'cat_album_2': '人像摄影',
    'cat_album_3': '美食摄影',
    'cat_album_4': '旅行记录',
    'cat_album_5': '工作日常',
};

// 获取友好的分类名称
function getFriendlyCategoryName(category) {
    if (!category) return '未分类';
    return categoryNameMap[category] || category;
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    if (localStorage.getItem('authToken')) {
        document.getElementById('admin-link').style.display = 'block';
    } else {
        document.getElementById('admin-link').style.display = 'none';
    }

    // 初始化主题
    initTheme();

    // 加载文章详情
    loadArticleDetail();

    // 隐藏页面加载动画
    setTimeout(() => {
        const pageLoading = document.getElementById('page-loading');
        if (pageLoading) {
            pageLoading.classList.add('hide');
            setTimeout(() => {
                pageLoading.style.display = 'none';
            }, 500);
        }
    }, 800);
});

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkTheme = true;
        document.body.classList.add('dark-theme');
        document.querySelector('.quick-btn i').classList.replace('fa-moon', 'fa-sun');
    }
}

// 切换主题
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme');
    
    const themeIcon = document.querySelector('.quick-btn i');
    if (isDarkTheme) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

// 返回顶部
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 加载文章详情
async function loadArticleDetail() {
    // 从URL参数获取文章ID
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    console.log('文章详情页 - URL参数ID:', id);
    
    if (!id) {
        showError('文章ID不存在');
        return;
    }

    try {
        // 使用公开API获取内容
        const response = await fetch(`${API_BASE}/api/content`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const content = await response.json();
            allArticles = content.articles || [];
            
            console.log('加载到的所有文章:', allArticles);
            console.log('查找文章ID:', id);
            
            // 查找指定文章
            currentArticle = allArticles.find(article => article.id === id);
            
            console.log('找到的文章:', currentArticle);
            
            if (currentArticle) {
                renderArticleDetail(currentArticle);
                loadRelatedArticles(currentArticle);
                updateNavigationButtons();
            } else {
                console.error('未找到文章:', id);
                showError('文章不存在或已被删除');
            }
        } else {
            console.error('API响应错误:', response.status);
            showError('加载文章失败');
        }
    } catch (error) {
        console.error('加载文章详情失败:', error);
        showError('网络错误，请检查网络连接');
    }
}

// 渲染文章详情
function renderArticleDetail(article) {
    const container = document.getElementById('article-container');
    
    // 更新页面标题
    document.title = `${article.title} - 创作空间`;
    
    container.innerHTML = `
        <div class="detail-header">
            <h1 class="detail-title">${article.title}</h1>
            <div class="detail-meta">
                <span><i class="fas fa-tag"></i> 分类: ${getFriendlyCategoryName(article.category)}</span>
                <span><i class="fas fa-calendar"></i> 发布日期: ${formatDate(article.createdAt || article.date) || '未知日期'}</span>
                <span><i class="fas fa-eye"></i> 阅读时间: ${estimateReadingTime(article.content)} 分钟</span>
            </div>
        </div>
        ${article.coverImage?.url ? `<img src="${decodeHtmlEntities(article.coverImage.url)}" alt="${article.title}" class="detail-image">` : ''}
        <div class="detail-content">${decodeContentImages(article.content)}</div>
        <div class="article-actions">
            <button class="btn btn-primary" onclick="shareArticle('${article.id}', '${article.title}')">
                <i class="fas fa-share"></i>
                分享文章
            </button>
            <button class="btn btn-secondary" onclick="goBackToArticles()">
                <i class="fas fa-arrow-left"></i>
                返回列表
            </button>
        </div>
    `;
}

// 加载相关文章
function loadRelatedArticles(currentArticle) {
    const relatedContent = document.getElementById('related-content');
    const relatedGrid = document.getElementById('related-grid');
    
    if (!relatedContent || !relatedGrid) return;
    
    // 获取同分类的文章（排除当前文章）
    const relatedArticles = allArticles
        .filter(article => 
            article.id !== currentArticle.id && 
            article.category === currentArticle.category
        )
        .slice(0, 3);
    
    if (relatedArticles.length > 0) {
        relatedGrid.innerHTML = relatedArticles.map(article => `
            <div class="related-item" onclick="viewArticleDetail('${article.id}')">
                <img src="${article.coverImage?.url ? decodeHtmlEntities(article.coverImage.url) : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg'}" 
                     alt="${article.title}" class="related-thumb">
                <div class="related-info">
                    <h4>${article.title}</h4>
                    <p>${decodeContentImages(article.content).substring(0, 80)}...</p>
                </div>
            </div>
        `).join('');
        
        relatedContent.style.display = 'block';
    } else {
        relatedContent.style.display = 'none';
    }
}

// 更新导航按钮状态
function updateNavigationButtons() {
    if (!currentArticle || !allArticles.length) return;
    
    const currentIndex = allArticles.findIndex(article => article.id === currentArticle.id);
    const prevButton = document.getElementById('prev-article');
    const nextButton = document.getElementById('next-article');
    
    if (prevButton) {
        prevButton.disabled = currentIndex <= 0;
    }
    
    if (nextButton) {
        nextButton.disabled = currentIndex >= allArticles.length - 1;
    }
}

// 文章导航
function navigateArticle(direction) {
    if (!currentArticle || !allArticles.length) return;
    
    const currentIndex = allArticles.findIndex(article => article.id === currentArticle.id);
    let newIndex;
    
    if (direction === 'prev') {
        newIndex = currentIndex - 1;
    } else {
        newIndex = currentIndex + 1;
    }
    
    if (newIndex >= 0 && newIndex < allArticles.length) {
        const newArticle = allArticles[newIndex];
        window.location.href = `article-detail.html?id=${newArticle.id}`;
    }
}

// 查看文章详情
function viewArticleDetail(id) {
    window.location.href = `article-detail.html?id=${id}`;
}

// 分享文章
function shareArticle(id, title) {
    const url = `${window.location.origin}/article-detail.html?id=${id}`;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        });
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(url).then(() => {
            showNotification('文章链接已复制到剪贴板');
        });
    }
}

// 返回文章列表
function goBackToArticles() {
    window.location.href = 'articles.html';
}

// 显示错误信息
function showError(message) {
    const container = document.getElementById('article-container');
    container.innerHTML = `
        <div class="detail-header">
            <h1 class="detail-title">加载失败</h1>
            <p>${message}</p>
            <button class="btn back-btn" onclick="goBackToArticles()">返回文章列表</button>
        </div>
    `;
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

// 工具函数
function decodeHtmlEntities(text) {
    if (!text || typeof text !== 'string') return text;
    
    let decoded = text;
    let previousDecoded = '';
    
    while (decoded !== previousDecoded) {
        previousDecoded = decoded;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = decoded;
        decoded = textarea.value;
    }
    
    return decoded;
}

function decodeContentImages(content) {
    if (!content || typeof content !== 'string') return content;
    
    // 匹配所有img标签的src属性
    return content.replace(/<img([^>]*?)src=["']([^"']*?)["']([^>]*?)>/gi, function(match, beforeSrc, src, afterSrc) {
        const decodedSrc = decodeHtmlEntities(src);
        return `<img${beforeSrc}src="${decodedSrc}"${afterSrc}>`;
    });
}

function formatDate(dateString) {
    if (!dateString) return '未知日期';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function estimateReadingTime(content) {
    if (!content) return 1;
    
    // 移除HTML标签
    const textContent = content.replace(/<[^>]*>/g, '');
    // 按中文字符计算（平均每分钟300字）
    const charCount = textContent.length;
    const minutes = Math.ceil(charCount / 300);
    
    return Math.max(1, minutes);
} 