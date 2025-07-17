// articles.js - 文章列表页面功能

// 全局变量
let allArticles = [];
let currentView = 'grid';
let currentSort = 'date-desc';
let isDarkTheme = false;
let articlesDisplayed = 6;
const itemsPerPage = 6;

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

    // 初始化主题
    initTheme();

    // 加载文章数据
    loadArticles();

    // 设置事件监听
    setupEventListeners();

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

// 设置事件监听器
function setupEventListeners() {
    // 搜索功能
    const articlesSearch = document.getElementById('articles-search');
    if (articlesSearch) {
        articlesSearch.addEventListener('input', debounce(function() {
            const query = this.value.toLowerCase();
            searchAndRenderArticles(query);
        }, 300));
    }

    // 分类筛选
    const articlesFilter = document.getElementById('articles-filter');
    if (articlesFilter) {
        articlesFilter.addEventListener('change', function() {
            const selectedCategory = this.value;
            filterAndRenderArticles(selectedCategory);
        });
    }

    // 排序功能
    const articlesSort = document.getElementById('articles-sort');
    if (articlesSort) {
        articlesSort.addEventListener('change', function() {
            currentSort = this.value;
            renderArticles();
        });
    }

    // 视图切换
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            if (view === currentView) return;
            
            // 更新按钮状态
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 更新视图
            currentView = view;
            updateContentView();
        });
    });

    // 加载更多
    const loadMoreBtn = document.getElementById('load-more-articles');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loadMoreArticles();
        });
    }

    // 退出登录
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// 加载文章数据
async function loadArticles() {
    console.log('开始加载文章数据...');
    
    try {
        const response = await fetch(`${API_BASE}/api/content`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        console.log('API响应状态:', response.status);

        if (response.ok) {
            const content = await response.json();
            allArticles = content.articles || [];
            
            console.log('加载到的文章数据:', allArticles);
            console.log('文章数量:', allArticles.length);
            
            renderArticles();
            loadAndPopulateCategories();
        } else {
            console.error('API请求失败:', response.status, response.statusText);
            allArticles = [];
            renderArticles();
            showNotification('加载文章失败，请稍后重试', false);
        }
    } catch (error) {
        console.error('网络错误:', error);
        allArticles = [];
        renderArticles();
        showNotification('网络错误，请检查网络连接', false);
    }
}

// 加载并填充分类数据
async function loadAndPopulateCategories() {
    try {
        const articleCategories = [...new Set(allArticles.map(article => article.category).filter(Boolean))];
        
        const articlesFilter = document.getElementById('articles-filter');
        if (articlesFilter) {
            articlesFilter.innerHTML = '<option value="">所有分类</option>';
            articleCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                articlesFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载分类数据失败:', error);
    }
}

// 渲染文章列表
function renderArticles() {
    const container = document.getElementById('articles-container');
    if (!container) return;
    
    const searchQuery = document.getElementById('articles-search').value.toLowerCase();
    const filterCategory = document.getElementById('articles-filter').value;
    
    if (searchQuery) {
        searchAndRenderArticles(searchQuery);
        return;
    }
    
    if (filterCategory) {
        filterAndRenderArticles(filterCategory);
        return;
    }
    
    container.innerHTML = '';
    
    let articles = sortData(allArticles, currentSort);
    const displayCount = articlesDisplayed || itemsPerPage;
    const articlesToShow = articles.slice(0, displayCount);
    
    if (articlesToShow.length > 0) {
        articlesToShow.forEach((article, index) => {
            const articleElement = createArticleCard(article, index);
            container.appendChild(articleElement);
        });
    } else {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>暂无文章</h3>
            <p>还没有发布任何文章</p>
        </div>`;
    }
    
    // 更新加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-articles');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = displayCount < articles.length ? 'block' : 'none';
    }
}

// 搜索文章并渲染
function searchAndRenderArticles(query) {
    const container = document.getElementById('articles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredArticles = allArticles.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query) ||
        (article.category && article.category.toLowerCase().includes(query))
    );
    
    // 排序
    filteredArticles = sortData(filteredArticles, currentSort);
    
    if (filteredArticles.length > 0) {
        filteredArticles.forEach((article, index) => {
            const articleElement = createArticleCard(article, index);
            container.appendChild(articleElement);
        });
    } else {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>未找到相关文章</h3>
            <p>没有找到包含"${query}"的文章</p>
        </div>`;
    }
    
    // 搜索时隐藏加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-articles');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
    }
}

// 筛选并渲染文章
function filterAndRenderArticles(category) {
    const container = document.getElementById('articles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredArticles = allArticles;
    
    if (category) {
        filteredArticles = allArticles.filter(article => 
            article.category === category
        );
    }
    
    // 排序
    filteredArticles = sortData(filteredArticles, currentSort);
    
    if (filteredArticles.length > 0) {
        filteredArticles.forEach((article, index) => {
            const articleElement = createArticleCard(article, index);
            container.appendChild(articleElement);
        });
    } else {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>未找到相关文章</h3>
            <p>${category ? `没有找到分类为"${category}"的文章` : '没有找到相关文章'}</p>
        </div>`;
    }
    
    // 筛选时隐藏加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-articles');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
    }
}

// 创建文章卡片
function createArticleCard(article, index) {
    const articleElement = document.createElement('div');
    articleElement.className = 'card';
    articleElement.style.animationDelay = `${index * 0.1}s`;
    
    const imageUrl = article.coverImage?.url ? decodeHtmlEntities(article.coverImage.url) : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
    
    articleElement.innerHTML = `
        <img src="${imageUrl}" alt="${article.title}" class="card-img" loading="lazy">
        <div class="card-body">
            <h3 class="card-title">${article.title}</h3>
            <p class="card-text">${decodeContentImages(article.content).substring(0, 150)}...</p>
            <div class="card-meta">
                <span class="card-date">
                    <i class="fas fa-calendar"></i>
                    ${formatDate(article.date || article.createdAt)}
                </span>
                <span class="card-category">
                    <i class="fas fa-tag"></i>
                    ${article.category || '未分类'}
                </span>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary" onclick="viewArticleDetail('${article.id}'); event.stopPropagation();">
                    <i class="fas fa-eye"></i>
                    阅读全文
                </button>
                <button class="btn btn-secondary" onclick="shareArticle('${article.id}', '${article.title}'); event.stopPropagation();">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
    `;
    
    // 添加点击事件，使整个卡片可点击
    articleElement.addEventListener('click', function(e) {
        console.log('文章卡片被点击:', article.title, article.id);
        console.log('点击的目标:', e.target);
        console.log('是否点击了按钮区域:', e.target.closest('.card-actions'));
        
        // 如果点击的是按钮，不进行页面跳转
        if (!e.target.closest('.card-actions')) {
            console.log('执行页面跳转...');
            viewArticleDetail(article.id);
        } else {
            console.log('点击了按钮，不跳转页面');
        }
    });
    
    // 添加鼠标悬停效果
    articleElement.style.cursor = 'pointer';
    
    return articleElement;
}

// 更新内容视图
function updateContentView() {
    const container = document.getElementById('articles-container');
    if (container) {
        // 移除所有视图类
        container.classList.remove('view-grid', 'view-list');
        // 添加当前视图类
        container.classList.add(`view-${currentView}`);
    }
}

// 加载更多文章
function loadMoreArticles() {
    articlesDisplayed += itemsPerPage;
    renderArticles();
}

// 查看文章详情
function viewArticleDetail(id) {
    console.log('点击文章详情，ID:', id);
    console.log('当前文章列表:', allArticles);
    
    // 检查文章是否存在
    const article = allArticles.find(a => a.id === id);
    if (!article) {
        console.error('未找到文章:', id);
        showNotification('文章不存在', false);
        return;
    }
    
    console.log('找到文章:', article);
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

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    showNotification('已退出登录');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
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
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function sortData(data, sortType) {
    return [...data].sort((a, b) => {
        switch(sortType) {
            case 'date-desc':
                return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
            case 'date-asc':
                return new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt);
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            default:
                return 0;
        }
    });
}

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
    if (!content) return '';
    
    let decoded = decodeHtmlEntities(content);
    decoded = decoded.replace(/<img[^>]*>/g, '[图片]');
    decoded = decoded.replace(/<[^>]*>/g, '');
    
    return decoded;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
} 