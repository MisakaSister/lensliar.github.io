// articles.js - 文章列表页面功能

// 全局变量
let allArticles = [];
let currentView = 'grid';
let currentSort = 'date-desc';
let isDarkTheme = false;
let articlesDisplayed = 6;
const itemsPerPage = 6;
let feedbackSystem;
let loadingManager;

// 初始化系统
function initializeSystems() {
    if (typeof FeedbackSystem !== 'undefined') {
        feedbackSystem = new FeedbackSystem();
    }
    if (typeof LoadingManager !== 'undefined') {
        loadingManager = new LoadingManager();
    }
}

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
    // 初始化系统
    initializeSystems();
    
    // 检查是否已登录并验证token有效性
    checkAuthStatus();

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

// 检查认证状态
async function checkAuthStatus() {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        document.getElementById('admin-link').style.display = 'none';
        document.getElementById('logout-link').style.display = 'none';
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
            document.getElementById('admin-link').style.display = 'block';
            document.getElementById('logout-link').style.display = 'block';
        } else {
            // token无效，清除并隐藏管理按钮
            sessionStorage.removeItem('authToken');
            document.getElementById('admin-link').style.display = 'none';
            document.getElementById('logout-link').style.display = 'none';
        }
    } catch (error) {
        console.error('验证token失败:', error);
        // 网络错误时也隐藏管理按钮
        document.getElementById('admin-link').style.display = 'none';
        document.getElementById('logout-link').style.display = 'none';
    }
}

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
    
    // 显示加载状态
    if (loadingManager) {
        loadingManager.showLoading('正在加载文章...');
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        const response = await fetch(`${API_BASE}/api/content`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('API响应状态:', response.status);

        if (response.ok) {
            const content = await response.json();
            allArticles = content.articles || [];
            
            console.log('加载到的文章数据:', allArticles);
            console.log('文章数量:', allArticles.length);
            
            // 隐藏加载状态
            if (loadingManager) {
                loadingManager.hideLoading();
            }
            
            renderArticles();
            loadAndPopulateCategories();
            
            // 显示成功通知
            if (feedbackSystem && allArticles.length > 0) {
                feedbackSystem.showNotification({
                    type: 'success',
                    title: '加载完成',
                    message: `成功加载 ${allArticles.length} 篇文章`,
                    duration: 2000
                });
            }
        } else {
            console.error('API请求失败:', response.status, response.statusText);
            allArticles = [];
            
            // 隐藏加载状态
            if (loadingManager) {
                loadingManager.hideLoading();
            }
            
            renderArticles();
            
            // 显示错误通知
            if (feedbackSystem) {
                feedbackSystem.showNotification({
                    type: 'error',
                    title: '加载失败',
                    message: '加载文章失败，请稍后重试',
                    duration: 5000,
                    actions: [{
                        text: '重试',
                        action: () => loadArticles()
                    }]
                });
            } else {
                showNotification('加载文章失败，请稍后重试', false);
            }
        }
    } catch (error) {
        console.error('网络错误:', error);
        allArticles = [];
        
        // 隐藏加载状态
        if (loadingManager) {
            loadingManager.hideLoading();
        }
        
        renderArticles();
        
        let errorMessage = '网络错误，请检查网络连接';
        if (error.name === 'AbortError') {
            errorMessage = '请求超时，请检查网络连接';
        }
        
        // 显示错误通知
        if (feedbackSystem) {
            feedbackSystem.showNotification({
                type: 'error',
                title: '网络错误',
                message: errorMessage,
                duration: 5000,
                actions: [{
                    text: '重试',
                    action: () => loadArticles()
                }]
            });
        } else {
            showNotification(errorMessage, false);
        }
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
                option.textContent = getFriendlyCategoryName(category);
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
    articleElement.className = 'grid--cell';
    articleElement.style.animationDelay = `${index * 0.1}s`;
    
    const imageUrl = article.coverImage?.url ? decodeHtmlEntities(article.coverImage.url) : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
    
    // 获取文章摘要
    const contentText = decodeContentImages(article.content).replace(/<[^>]*>/g, '').trim();
    const excerpt = contentText.length > 120 ? contentText.substring(0, 120) + '...' : contentText;
    
    // 创建标签列表
    const tags = [];
    if (article.category) {
        tags.push(`<li><a href="#" class="tag">${getFriendlyCategoryName(article.category)}</a></li>`);
    }
    tags.push(`<li><a href="#" class="tag">${formatDate(article.date || article.createdAt)}</a></li>`);
    
    articleElement.innerHTML = `
        <article class="grid--item">
            <div class="preview--container">
                <a href="#" class="preview-image--container" onclick="viewArticleDetail('${article.id}'); return false;">
                    <div class="preview-image" style="background-image: url('${imageUrl}')"></div>
                </a>
                <div class="meta--container">
                    <a href="#" class="issue">文章</a>
                    <a href="#" class="page">${getFriendlyCategoryName(article.category)}</a>
                </div>
                
                <div class="hover--options">
                    <a href="#" class="series button" onclick="viewArticleDetail('${article.id}'); return false;" title="阅读全文">
                        <i class="fas fa-eye"></i>
                    </a>
                    
                    <a href="#" class="latest button" onclick="shareArticle('${article.id}', '${article.title}'); return false;" title="分享文章">
                        <i class="fas fa-share"></i>
                    </a>
                    
                    <a href="#" class="follow button" onclick="viewArticleDetail('${article.id}'); return false;" title="查看文章">
                        <i class="fas fa-newspaper"></i>
                    </a>
                </div>
            </div>
            
            <div class="content--container">
                <div class="title--container">
                    <a class="title--text" href="#" onclick="viewArticleDetail('${article.id}'); return false;">${article.title}</a>
                </div>
                
                <div class="article-excerpt">${excerpt}</div>
                
                <div class="tags--overflow-container">
                    <ul class="tags--container">
                        ${tags.join('')}
                    </ul>
                </div>
            </div>
        </article>
    `;
    
    return articleElement;
}

// 更新内容视图
function updateContentView() {
    // 文章页面使用固定网格布局，不需要视图切换
    return;
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
async function shareArticle(id, title) {
    const url = `${window.location.origin}/article-detail.html?id=${id}`;
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: title,
                url: url
            });
            
            if (feedbackSystem) {
                feedbackSystem.showNotification({
                    type: 'success',
                    title: '分享成功',
                    message: '文章已成功分享',
                    duration: 2000
                });
            }
        } else {
            // 复制到剪贴板
            await navigator.clipboard.writeText(url);
            
            if (feedbackSystem) {
                feedbackSystem.showNotification({
                    type: 'success',
                    title: '链接已复制',
                    message: '文章链接已复制到剪贴板',
                    duration: 3000
                });
            } else {
                showNotification('文章链接已复制到剪贴板');
            }
        }
    } catch (error) {
        console.error('分享失败:', error);
        
        if (feedbackSystem) {
            feedbackSystem.showNotification({
                type: 'error',
                title: '分享失败',
                message: '无法分享文章，请稍后重试',
                duration: 3000
            });
        }
    }
}

// 退出登录
function logout() {
    if (feedbackSystem) {
        feedbackSystem.showConfirmDialog({
            title: '确认退出',
            message: '确定要退出登录吗？',
            confirmText: '退出',
            cancelText: '取消',
            onConfirm: () => {
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('userInfo');
                
                feedbackSystem.showNotification({
                    type: 'success',
                    title: '已退出登录',
                    message: '正在刷新页面...',
                    duration: 2000
                });
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        });
    } else {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userInfo');
        showNotification('已退出登录');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

// showNotification函数已在app.js中定义

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
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('formatDate: 日期格式化错误:', error, '原始值:', dateString);
        return '未知日期';
    }
} 