// articles.js - 文章列表页面功能

// 全局变量
let allArticles = [];
let currentView = 'grid';
let currentSort = 'date-desc';
let articlesDisplayed = CONFIG.ITEMS_PER_PAGE;

// 文章管理器
class ArticleManager {
    constructor() {
        this.init();
    }
    
    async init() {
        this.setupAuth();
        this.setupEventListeners();
        await this.loadArticles();
        this.hideLoadingAnimation();
    }
    
    setupAuth() {
        const isLoggedIn = !!localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
        document.getElementById('admin-link').style.display = isLoggedIn ? 'block' : 'none';
        document.getElementById('logout-link').style.display = isLoggedIn ? 'block' : 'none';
    }
    
    setupEventListeners() {
        // 搜索功能
        const articlesSearch = document.getElementById('articles-search');
        if (articlesSearch) {
            articlesSearch.addEventListener('input', Utils.debounce((e) => {
                this.searchAndRenderArticles(e.target.value.toLowerCase());
            }));
        }

        // 分类筛选
        const articlesFilter = document.getElementById('articles-filter');
        if (articlesFilter) {
            articlesFilter.addEventListener('change', (e) => {
                this.filterAndRenderArticles(e.target.value);
            });
        }

        // 排序功能
        const articlesSort = document.getElementById('articles-sort');
        if (articlesSort) {
            articlesSort.addEventListener('change', (e) => {
                currentSort = e.target.value;
                this.renderArticles();
            });
        }

        // 视图切换
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.view-btn').dataset.view;
                if (view === currentView) return;
                
                viewBtns.forEach(b => b.classList.remove('active'));
                e.target.closest('.view-btn').classList.add('active');
                
                currentView = view;
                this.updateContentView();
            });
        });

        // 加载更多
        const loadMoreBtn = document.getElementById('load-more-articles');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadMoreArticles();
            });
        }

        // 退出登录
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }
    
    async loadArticles() {
        try {
            const content = await api.get('/api/content');
            allArticles = content.articles || [];
            
            this.renderArticles();
            this.loadAndPopulateCategories();
            
            // 预加载图片
            this.preloadImages();
            
        } catch (error) {
            console.error('加载文章失败:', error);
            allArticles = [];
            this.renderArticles();
            notificationManager.error('加载文章失败，请稍后重试');
        }
    }
    
    async loadAndPopulateCategories() {
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
    
    renderArticles() {
        const container = document.getElementById('articles-container');
        if (!container) return;
        
        const searchQuery = document.getElementById('articles-search')?.value.toLowerCase() || '';
        const filterCategory = document.getElementById('articles-filter')?.value || '';
        
        if (searchQuery) {
            this.searchAndRenderArticles(searchQuery);
            return;
        }
        
        if (filterCategory) {
            this.filterAndRenderArticles(filterCategory);
            return;
        }
        
        container.innerHTML = '';
        
        let articles = Utils.sortData(allArticles, currentSort);
        const articlesToShow = articles.slice(0, articlesDisplayed);
        
        if (articlesToShow.length > 0) {
            articlesToShow.forEach((article, index) => {
                const articleElement = this.createArticleCard(article, index);
                container.appendChild(articleElement);
            });
        } else {
            container.innerHTML = this.createEmptyState('暂无文章', '还没有发布任何文章', '📝');
        }
        
        this.updateLoadMoreButton(articles.length);
    }
    
    searchAndRenderArticles(query) {
        const container = document.getElementById('articles-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        let filteredArticles = allArticles.filter(article => 
            article.title.toLowerCase().includes(query) ||
            article.content.toLowerCase().includes(query) ||
            (article.category && article.category.toLowerCase().includes(query))
        );
        
        filteredArticles = Utils.sortData(filteredArticles, currentSort);
        
        if (filteredArticles.length > 0) {
            filteredArticles.forEach((article, index) => {
                const articleElement = this.createArticleCard(article, index);
                container.appendChild(articleElement);
            });
        } else {
            container.innerHTML = this.createEmptyState('未找到相关文章', `没有找到包含"${query}"的文章`, '🔍');
        }
        
        this.updateLoadMoreButton(0); // 搜索时隐藏加载更多按钮
    }
    
    filterAndRenderArticles(category) {
        const container = document.getElementById('articles-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        let filteredArticles = category ? 
            allArticles.filter(article => article.category === category) : 
            allArticles;
        
        filteredArticles = Utils.sortData(filteredArticles, currentSort);
        
        if (filteredArticles.length > 0) {
            filteredArticles.forEach((article, index) => {
                const articleElement = this.createArticleCard(article, index);
                container.appendChild(articleElement);
            });
        } else {
            container.innerHTML = this.createEmptyState(
                '未找到相关文章', 
                category ? `没有找到分类为"${category}"的文章` : '没有找到相关文章',
                '🔍'
            );
        }
        
        this.updateLoadMoreButton(0); // 筛选时隐藏加载更多按钮
    }
    
    createArticleCard(article, index) {
        const articleElement = document.createElement('div');
        articleElement.className = 'card';
        articleElement.style.animationDelay = `${index * 0.1}s`;
        
        const imageUrl = article.coverImage?.url ? 
            Utils.decodeHtmlEntities(article.coverImage.url) : 
            'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
        
        articleElement.innerHTML = `
            <img src="${imageUrl}" alt="${article.title}" class="card-img" loading="lazy">
            <div class="card-body">
                <h3 class="card-title">${article.title}</h3>
                <p class="card-text">${Utils.decodeContentImages(article.content).substring(0, 150)}...</p>
                <div class="card-meta">
                    <span class="card-date">
                        <i class="fas fa-calendar"></i>
                        ${Utils.formatDate(article.date || article.createdAt)}
                    </span>
                    <span class="card-category">
                        <i class="fas fa-tag"></i>
                        ${article.category || '未分类'}
                    </span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="articleManager.viewArticleDetail('${article.id}'); event.stopPropagation();">
                        <i class="fas fa-eye"></i>
                        阅读全文
                    </button>
                    <button class="btn btn-secondary" onclick="articleManager.shareArticle('${article.id}', '${article.title}'); event.stopPropagation();">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
        `;
        
        // 添加点击事件，使整个卡片可点击
        articleElement.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) {
                this.viewArticleDetail(article.id);
            }
        });
        
        articleElement.style.cursor = 'pointer';
        
        return articleElement;
    }
    
    createEmptyState(title, message, icon) {
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon}</div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }
    
    updateContentView() {
        const container = document.getElementById('articles-container');
        if (container) {
            container.classList.remove('view-grid', 'view-list');
            container.classList.add(`view-${currentView}`);
        }
    }
    
    loadMoreArticles() {
        articlesDisplayed += CONFIG.ITEMS_PER_PAGE;
        this.renderArticles();
    }
    
    updateLoadMoreButton(totalCount) {
        const loadMoreBtn = document.getElementById('load-more-articles');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = articlesDisplayed < totalCount ? 'block' : 'none';
        }
    }
    
    viewArticleDetail(id) {
        const article = allArticles.find(a => a.id === id);
        if (!article) {
            notificationManager.error('文章不存在');
            return;
        }
        
        window.location.href = `article-detail.html?id=${id}`;
    }
    
    async shareArticle(id, title) {
        const url = `${window.location.origin}/article-detail.html?id=${id}`;
        await Utils.shareContent(title, url);
    }
    
    logout() {
        localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_INFO_KEY);
        notificationManager.success('已退出登录');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    hideLoadingAnimation() {
        setTimeout(() => {
            const pageLoading = document.getElementById('page-loading');
            if (pageLoading) {
                pageLoading.classList.add('hide');
                setTimeout(() => {
                    pageLoading.style.display = 'none';
                }, 500);
            }
        }, 800);
    }
    
    preloadImages() {
        // 预加载第一页的图片
        const firstPageArticles = allArticles.slice(0, CONFIG.ITEMS_PER_PAGE);
        firstPageArticles.forEach(article => {
            if (article.coverImage?.url) {
                PerformanceUtils.preloadImage(Utils.decodeHtmlEntities(article.coverImage.url))
                    .catch(() => {}); // 忽略预加载错误
            }
        });
    }
}

// 初始化文章管理器
let articleManager;

document.addEventListener('DOMContentLoaded', function() {
    articleManager = new ArticleManager();
});

// 全局函数（向后兼容）
window.viewArticleDetail = (id) => articleManager?.viewArticleDetail(id);
window.shareArticle = (id, title) => articleManager?.shareArticle(id, title);
window.loadMoreArticles = () => articleManager?.loadMoreArticles();
window.scrollToTop = () => Utils.scrollToTop(); 