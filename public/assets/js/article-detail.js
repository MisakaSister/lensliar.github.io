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
};

// 获取友好的分类名称
function getFriendlyCategoryName(category) {
    if (!category) return '未分类';
    return categoryNameMap[category] || category;
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录并验证token有效性
    checkAuthStatus();

    // 初始化主题
    initTheme();

    // 加载文章详情
    loadArticleDetail();

    // 绑定退出登录
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

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

// 检查认证状态
async function checkAuthStatus() {
    const token = sessionStorage.getItem('authToken');
    const adminLink = document.getElementById('admin-link');
    const logoutLink = document.getElementById('logout-link');

    if (!token) {
        if (adminLink) adminLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
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

        if (response.ok) {
            if (adminLink) adminLink.style.display = 'block';
            if (logoutLink) logoutLink.style.display = 'block';
        } else {
            // token无效，清除并隐藏管理按钮
            sessionStorage.removeItem('authToken');
            if (adminLink) adminLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'none';
        }
    } catch (error) {
        console.error('验证token失败:', error);
        // 网络错误时也隐藏管理按钮
        if (adminLink) adminLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
    }
}

// 初始化主题
function initTheme() { try { window.AppTheme.init(); } catch(_){} }

// 切换主题
function toggleTheme() { try { window.AppTheme.toggle(); } catch(_){} }

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

// 退出登录
function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
    showNotification('已退出登录');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
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

// showNotification函数已在app.js中定义

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
    if (!dateString) {
        console.warn('formatDate: 日期字符串为空');
        return '未知日期';
    }
    
    try {
        const date = new Date(dateString);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            console.warn('formatDate: 无效的日期字符串:', dateString);
            return '未知日期';
        }
        
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('formatDate: 日期格式化错误:', error, '原始值:', dateString);
        return '未知日期';
    }
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