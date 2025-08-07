// index.js - 现代化首页功能

// 全局变量
let imagesData = [];
let allContent = { articles: [], images: [] };
let currentSection = 'home';
let currentView = 'grid';
let currentSort = 'date-desc';
let isDarkTheme = false;
let zoomLevel = 1;
let totalViews = 0;

// 分页控制
let articlesDisplayed = 6;
let imagesDisplayed = 6;
const itemsPerPage = 6;

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
    // 检查是否已登录并验证token有效性
    checkAuthStatus();

    // 初始化主题
    initTheme();

    // 加载内容
    loadContent();

    // 绑定导航切换事件
    setupNavigation();

    // 绑定搜索功能
    setupSearchFunctionality();

    // 绑定视图切换功能
    setupViewToggle();

    // 绑定排序功能
    setupSortFunctionality();

    // 绑定分类筛选功能
    setupFilterFunctionality();

    // 绑定分页功能
    setupPagination();

    // 绑定退出按钮
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });

    // 检查返回的目标区域
    checkTargetSection();
    
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

    // 初始化相册交互
    initAlbumInteractions();

    // 添加触摸支持
    addTouchSupport();
    
    // 初始化延迟加载
    lazyLoadImages();
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

// 检查目标区域
function checkTargetSection() {
    const targetSection = localStorage.getItem('targetSection');
    if (targetSection) {
        setTimeout(() => {
            switchSection(targetSection);
            localStorage.removeItem('targetSection');
        }, 100);
    } else {
        // 检查当前显示的区域，确保currentSection与实际显示的区域一致
        const welcomeSection = document.getElementById('welcome-section');
        const articlesSection = document.getElementById('articles-section');
        const albumsSection = document.getElementById('albums-section');
        
        if (articlesSection && articlesSection.style.display !== 'none') {
            currentSection = 'articles';
        } else if (albumsSection && albumsSection.style.display !== 'none') {
            currentSection = 'albums';
        } else {
            currentSection = 'home';
        }
        
        // 更新导航状态
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.section === currentSection) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// 设置导航功能
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 如果有 href 属性，允许正常跳转
            if (this.hasAttribute('href') && this.getAttribute('href') !== '#') {
                return; // 允许默认的链接跳转行为
            }
            
            e.preventDefault();
            const section = this.dataset.section;
            if (section) {
                switchSection(section);
            }
        });
    });
}

// 切换页面区域
function switchSection(section) {
    if (section === currentSection) return;
    
    // 添加淡出效果
    const currentSectionEl = document.querySelector('.welcome-section, .content-sections:not([style*="display: none"])');
    if (currentSectionEl) {
        currentSectionEl.style.opacity = '0';
        currentSectionEl.style.transform = 'translateY(20px)';
    }
    
    setTimeout(() => {
        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`[data-section="${section}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        // 隐藏所有区域
        document.getElementById('welcome-section').style.display = 'none';
        document.getElementById('articles-section').style.display = 'none';
        document.getElementById('albums-section').style.display = 'none';
        
        // 显示对应区域
        let targetEl;
        switch(section) {
            case 'home':
                targetEl = document.getElementById('welcome-section');
                targetEl.style.display = 'block';
                break;
            case 'articles':
                targetEl = document.getElementById('articles-section');
                targetEl.style.display = 'block';
                renderArticles();
                break;
            case 'albums':
                targetEl = document.getElementById('albums-section');
                targetEl.style.display = 'block';
                renderAlbums();
                break;
        }
        
        // 添加淡入效果
        if (targetEl) {
            targetEl.style.opacity = '0';
            targetEl.style.transform = 'translateY(20px)';
            setTimeout(() => {
                targetEl.style.opacity = '1';
                targetEl.style.transform = 'translateY(0)';
            }, 50);
        }
        
        currentSection = section;
    }, 300);
}

// 设置视图切换功能
function setupViewToggle() {
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
}

// 更新内容视图
function updateContentView() {
    // 只更新当前显示的内容区域
    let currentContainer;
    if (currentSection === 'articles') {
        currentContainer = document.getElementById('articles-container');
    } else if (currentSection === 'albums') {
        currentContainer = document.getElementById('images-container');
    }
    
    if (currentContainer) {
        // 移除所有视图类
        currentContainer.classList.remove('view-grid', 'view-list', 'view-masonry');
        // 添加当前视图类
        currentContainer.classList.add(`view-${currentView}`);
    }
}

// 设置排序功能
function setupSortFunctionality() {
    const sortSelects = document.querySelectorAll('.sort-select');
    sortSelects.forEach(select => {
        select.addEventListener('change', function() {
            currentSort = this.value;
            if (currentSection === 'articles') {
                renderArticles();
            } else if (currentSection === 'albums') {
                renderAlbums();
            }
        });
    });
}

// 设置分类筛选功能
function setupFilterFunctionality() {
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            const selectedCategory = this.value;
            if (currentSection === 'articles') {
                filterAndRenderArticles(selectedCategory);
            } else if (currentSection === 'albums') {
                filterAndRenderAlbums(selectedCategory);
            }
        });
    });
}

// 筛选并渲染文章
function filterAndRenderArticles(category) {
    const container = document.getElementById('articles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredArticles = allContent.articles || [];
    
    if (category) {
        filteredArticles = filteredArticles.filter(article => 
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
}

// 筛选并渲染相册
function filterAndRenderAlbums(category) {
    const container = document.getElementById('images-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredAlbums = allContent.images || [];
    
    if (category) {
        filteredAlbums = filteredAlbums.filter(album => 
            album.category === category
        );
    }
    
    // 排序
    filteredAlbums = sortData(filteredAlbums, currentSort);
    
    if (filteredAlbums.length > 0) {
        filteredAlbums.forEach((album, index) => {
            const albumElement = createAlbumCard(album, index);
            container.appendChild(albumElement);
        });
    } else {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>未找到相关相册</h3>
            <p>${category ? `没有找到分类为"${category}"的相册` : '没有找到相关相册'}</p>
        </div>`;
    }
}

// 设置分页功能
function setupPagination() {
    const loadMoreArticlesBtn = document.getElementById('load-more-articles');
    const loadMoreImagesBtn = document.getElementById('load-more-images');
    
    if (loadMoreArticlesBtn) {
        loadMoreArticlesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loadMoreArticles();
        });
    }
    
    if (loadMoreImagesBtn) {
        loadMoreImagesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loadMoreImages();
        });
    }
}

// 加载更多文章
function loadMoreArticles() {
    articlesDisplayed += itemsPerPage;
    renderArticles();
}

// 加载更多图片
function loadMoreImages() {
    imagesDisplayed += itemsPerPage;
    renderAlbums();
}

// 设置搜索功能
function setupSearchFunctionality() {
    const articlesSearch = document.getElementById('articles-search');
    const imagesSearch = document.getElementById('images-search');
    
    if (articlesSearch) {
        articlesSearch.addEventListener('input', debounce(function() {
            const query = this.value.toLowerCase();
            searchAndRenderArticles(query);
        }, 300));
    }
    
    if (imagesSearch) {
        imagesSearch.addEventListener('input', debounce(function() {
            const query = this.value.toLowerCase();
            searchAndRenderAlbums(query);
        }, 300));
    }
}

// 防抖函数
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

// 排序数据
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

// 搜索文章并渲染
function searchAndRenderArticles(query) {
    const container = document.getElementById('articles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredArticles = allContent.articles || [];
    
    if (query) {
        filteredArticles = filteredArticles.filter(article => 
            article.title.toLowerCase().includes(query) ||
            article.content.toLowerCase().includes(query) ||
            (article.category && article.category.toLowerCase().includes(query))
        );
        
        // 搜索时隐藏加载更多按钮
        document.getElementById('load-more-articles').style.display = 'none';
    } else {
        document.getElementById('load-more-articles').style.display = 'block';
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
            <p>没有找到包含"${query}"的文章</p>
        </div>`;
    }
}

// 搜索相册并渲染
function searchAndRenderAlbums(query) {
    const container = document.getElementById('images-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredAlbums = allContent.images || [];
    
    if (query) {
        filteredAlbums = filteredAlbums.filter(album => 
            album.title.toLowerCase().includes(query) ||
            (album.description && album.description.toLowerCase().includes(query)) ||
            (album.category && album.category.toLowerCase().includes(query))
        );
        
        // 搜索时隐藏加载更多按钮
        document.getElementById('load-more-images').style.display = 'none';
    } else {
        document.getElementById('load-more-images').style.display = 'block';
    }
    
    // 排序
    filteredAlbums = sortData(filteredAlbums, currentSort);
    
    if (filteredAlbums.length > 0) {
        filteredAlbums.forEach((album, index) => {
            const albumElement = createAlbumCard(album, index);
            container.appendChild(albumElement);
        });
    } else {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>未找到相关相册</h3>
            <p>没有找到包含"${query}"的相册</p>
        </div>`;
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
                    ${getFriendlyCategoryName(article.category)}
                </span>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary" onclick="viewDetail('article', '${article.id}')">
                    <i class="fas fa-eye"></i>
                    阅读全文
                </button>
                <button class="btn btn-secondary" onclick="shareContent('article', '${article.id}', '${article.title}')">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
    `;
    
    return articleElement;
}

// 创建相册卡片
function createAlbumCard(album, index) {
    const albumElement = document.createElement('div');
    albumElement.className = 'card album-card';
    albumElement.style.animationDelay = `${index * 0.1}s`;
    
    const imageUrl = album.coverImage?.url || album.url || 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
    
    // 获取相册图片列表
    const images = album.images || [];
    const imageCount = album.imageCount || images.length || 0;
    
    // 创建图片轮播
    const carouselImages = images.slice(0, 5).map(img => 
        `<img src="${decodeHtmlEntities(img.url)}" alt="${img.title || album.title}" class="carousel-image" loading="lazy">`
    ).join('');
    
    const carouselIndicators = images.slice(0, 5).map((_, i) => 
        `<span class="carousel-indicator ${i === 0 ? 'active' : ''}" onclick="changeCarouselImage(this, ${i}, event)"></span>`
    ).join('');
    
    // 创建预览图片网格
    const previewImages = images.slice(0, 4).map(img => 
        `<div class="album-preview-item">
            <img src="${decodeHtmlEntities(img.url)}" alt="${img.title || album.title}" loading="lazy">
        </div>`
    ).join('');
    
    albumElement.innerHTML = `
        <div class="album-card-inner">
            <!-- 正面 -->
            <div class="album-card-front">
                <div class="card-image-carousel">
                    <div class="carousel-images" data-current="0">
                        ${carouselImages.length > 0 ? carouselImages : `<img src="${decodeHtmlEntities(imageUrl)}" alt="${album.title}" class="carousel-image" loading="lazy">`}
                    </div>
                    ${images.length > 1 ? `
                        <button class="carousel-nav prev" onclick="changeCarouselImage(this, -1, event)">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="carousel-nav next" onclick="changeCarouselImage(this, 1, event)">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <div class="carousel-indicators">
                            ${carouselIndicators}
                        </div>
                    ` : ''}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${album.title}</h3>
                    <p class="card-text">${album.description ? album.description.substring(0, 80) + '...' : '这是一个精美的相册'}</p>
                    <div class="card-meta">
                        <span class="card-date">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(album.createdAt)}
                        </span>
                        <span class="card-count">
                            <i class="fas fa-images"></i>
                            ${imageCount} 张图片
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- 背面 -->
            <div class="album-card-back">
                <div class="album-preview-grid">
                    ${previewImages}
                </div>
                <div class="album-stats">
                    <div class="album-stat">
                        <span class="album-stat-number">${imageCount}</span>
                        <span class="album-stat-label">图片</span>
                    </div>
                    <div class="album-stat">
                        <span class="album-stat-number">${getFriendlyCategoryName(album.category)}</span>
                        <span class="album-stat-label">分类</span>
                    </div>
                </div>
                <div class="album-actions">
                    <button class="album-action-btn" onclick="viewDetail('album', '${album.id}'); event.stopPropagation();">
                        <i class="fas fa-eye"></i>
                        查看相册
                    </button>
                    <button class="album-action-btn" onclick="shareContent('album', '${album.id}', '${album.title}'); event.stopPropagation();">
                        <i class="fas fa-share"></i>
                        分享
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 添加点击效果和导航
    albumElement.addEventListener('click', function(e) {
        // 如果点击的是导航按钮或指示器，不进行页面跳转
        if (!e.target.closest('.carousel-nav') && 
            !e.target.closest('.carousel-indicator') && 
            !e.target.closest('.album-action-btn')) {
            
            this.classList.add('clicked');
            setTimeout(() => this.classList.remove('clicked'), 300);
            
            // 跳转到相册详情页面
            viewDetail('album', album.id);
        }
    });
    
    return albumElement;
}

// 分享内容
function shareContent(type, id, title) {
    const url = `${window.location.origin}/detail.html?type=${type}&id=${id}`;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        });
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(url).then(() => {
            showNotification('链接已复制到剪贴板');
        });
    }
}

// 加载内容
async function loadContent() {
    try {
        const response = await fetch(`${API_BASE}/api/content`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const content = await response.json();
            allContent = content;
            renderContent(content);
            updateStats(content);
            updateNavigationBadges(content);
            
            // 加载并填充分类数据
            await loadAndPopulateCategories();
        } else {
            allContent = { articles: [], images: [] };
            renderContent(allContent);
            updateStats(allContent);
            updateNavigationBadges(allContent);
            showNotification('加载内容失败，请稍后重试', false);
        }
    } catch (error) {
        allContent = { articles: [], images: [] };
        renderContent(allContent);
        updateStats(allContent);
        updateNavigationBadges(allContent);
        showNotification('网络错误，请检查网络连接', false);
    }
}

// 加载并填充分类数据
async function loadAndPopulateCategories() {
    try {
        // 从内容中提取分类
        const articleCategories = [...new Set(allContent.articles?.map(article => article.category).filter(Boolean) || [])];
        const albumCategories = [...new Set(allContent.images?.map(album => album.category).filter(Boolean) || [])];
        
        // 填充文章分类下拉框
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
        
        // 填充相册分类下拉框
        const imagesFilter = document.getElementById('images-filter');
        if (imagesFilter) {
            imagesFilter.innerHTML = '<option value="">所有分类</option>';
            albumCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = getFriendlyCategoryName(category);
                imagesFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载分类数据失败:', error);
    }
}

// 更新导航徽章
function updateNavigationBadges(content) {
    const articlesBadge = document.getElementById('articles-badge');
    const albumsBadge = document.getElementById('albums-badge');
    
    if (articlesBadge) {
        articlesBadge.textContent = content.articles?.length || 0;
    }
    if (albumsBadge) {
        albumsBadge.textContent = content.images?.length || 0;
    }
}

// 解码HTML实体
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

// 解码内容图片
function decodeContentImages(content) {
    if (!content) return '';
    
    let decoded = decodeHtmlEntities(content);
    decoded = decoded.replace(/<img[^>]*>/g, '[图片]');
    decoded = decoded.replace(/<[^>]*>/g, '');
    
    return decoded;
}

// 渲染内容
function renderContent(content) {
    imagesData = content.images?.slice(0, 3) || [];
    totalViews = (content.articles?.length || 0) * 150 + (content.images?.length || 0) * 80;
    
    // 立即渲染文章和相册，确保在切换区域时数据已经准备好
    renderArticles();
    renderAlbums();
}

// 更新统计信息
function updateStats(content) {
    const articlesCount = document.getElementById('articles-count');
    const albumsCount = document.getElementById('albums-count');
    const viewsCount = document.getElementById('views-count');
    
    if (articlesCount) {
        animateCounter(articlesCount, content.articles?.length || 0);
    }
    if (albumsCount) {
        animateCounter(albumsCount, content.images?.length || 0);
    }
    if (viewsCount) {
        animateCounter(viewsCount, totalViews);
    }
}

// 数字动画
function animateCounter(element, targetValue) {
    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// 渲染文章
function renderArticles() {
    const container = document.getElementById('articles-container');
    if (!container) return;
    
    const searchQuery = document.getElementById('articles-search').value.toLowerCase();
    if (searchQuery) {
        searchAndRenderArticles(searchQuery);
        return;
    }
    
    container.innerHTML = '';
    
    let articles = sortData(allContent.articles || [], currentSort);
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

// 渲染相册
function renderAlbums() {
    const container = document.getElementById('images-container');
    if (!container) return;
    
    const searchQuery = document.getElementById('images-search').value.toLowerCase();
    if (searchQuery) {
        searchAndRenderAlbums(searchQuery);
        return;
    }
    
    container.innerHTML = '';
    
    let albums = sortData(allContent.images || [], currentSort);
    const displayCount = imagesDisplayed || itemsPerPage;
    const albumsToShow = albums.slice(0, displayCount);
    
    if (albumsToShow.length > 0) {
        albumsToShow.forEach((album, index) => {
            const albumElement = createAlbumCard(album, index);
            container.appendChild(albumElement);
        });
        
        // 初始化相册交互功能
        setTimeout(() => {
            initAlbumInteractions();
        }, 100);
    } else {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🖼️</div>
            <h3>暂无相册</h3>
            <p>还没有创建任何相册</p>
        </div>`;
    }
    
    // 更新加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-images');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = displayCount < albums.length ? 'block' : 'none';
    }
}

// 格式化日期
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

// 查看详情
function viewDetail(type, id) {
    if (type === 'article') {
        window.location.href = `article-detail.html?id=${id}`;
    } else if (type === 'album') {
        window.location.href = `album-detail.html?id=${id}`;
    }
}

// 图片查看器功能
let currentImageIndex = 0;
let currentImages = [];

function openImageViewer(imageId) {
    const viewer = document.getElementById('image-viewer');
    const image = imagesData.find(img => img.id === imageId);
    
    if (image) {
        currentImages = imagesData;
        currentImageIndex = currentImages.findIndex(img => img.id === imageId);
        updateViewerImage();
        viewer.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeImageViewer() {
    const viewer = document.getElementById('image-viewer');
    viewer.classList.remove('active');
    document.body.style.overflow = 'auto';
    resetZoom();
}

function showPrevImage() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateViewerImage();
    }
}

function showNextImage() {
    if (currentImageIndex < currentImages.length - 1) {
        currentImageIndex++;
        updateViewerImage();
    }
}

function updateViewerImage() {
    const image = currentImages[currentImageIndex];
    if (!image) return;
    
    document.getElementById('viewer-title').textContent = image.title;
    document.getElementById('viewer-image').src = decodeHtmlEntities(image.url);
    document.getElementById('viewer-date').textContent = formatDate(image.createdAt);
    document.getElementById('image-counter').textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
    
    // 更新导航按钮状态
    document.querySelector('.prev-btn').style.opacity = currentImageIndex === 0 ? '0.5' : '1';
    document.querySelector('.next-btn').style.opacity = currentImageIndex === currentImages.length - 1 ? '0.5' : '1';
    
    resetZoom();
}

// 缩放功能
function zoomIn() {
    zoomLevel = Math.min(zoomLevel * 1.2, 3);
    applyZoom();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel / 1.2, 0.5);
    applyZoom();
}

function resetZoom() {
    zoomLevel = 1;
    applyZoom();
}

function applyZoom() {
    const image = document.getElementById('viewer-image');
    image.style.transform = `scale(${zoomLevel})`;
    image.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
}

// 全屏功能
function toggleFullscreen() {
    const viewer = document.getElementById('image-viewer');
    if (!document.fullscreenElement) {
        viewer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// 下载图片
function downloadImage() {
    const image = document.getElementById('viewer-image');
    const link = document.createElement('a');
    link.href = image.src;
    link.download = `image_${Date.now()}.jpg`;
    link.click();
}

// 分享图片
function shareImage() {
    const image = currentImages[currentImageIndex];
    if (image) {
        // 如果图片属于相册，分享相册
        if (image.albumId) {
            shareContent('album', image.albumId, image.title || '相册图片');
        } else {
            // 否则分享图片URL
            const imageUrl = image.url || document.getElementById('viewer-image').src;
            if (navigator.share) {
                navigator.share({
                    title: image.title || '图片分享',
                    url: imageUrl
                });
            } else {
                // 复制到剪贴板
                navigator.clipboard.writeText(imageUrl).then(() => {
                    showNotification('图片链接已复制到剪贴板');
                });
            }
        }
    } else {
        showNotification('无法分享图片', false);
    }
}

// 退出登录
function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
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

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    if (document.getElementById('image-viewer').classList.contains('active')) {
        switch(e.key) {
            case 'Escape':
                closeImageViewer();
                break;
            case 'ArrowLeft':
                showPrevImage();
                break;
            case 'ArrowRight':
                showNextImage();
                break;
            case '+':
            case '=':
                zoomIn();
                break;
            case '-':
                zoomOut();
                break;
            case '0':
                resetZoom();
                break;
        }
    }
});

// 全局点击事件
document.addEventListener('click', function(e) {
    if (e.target.id === 'image-viewer') {
        closeImageViewer();
    }
});

// 滚动事件
let ticking = false;
window.addEventListener('scroll', function() {
    if (!ticking) {
        requestAnimationFrame(function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const quickActions = document.querySelector('.quick-actions');
            
            if (scrollTop > 200) {
                quickActions.style.opacity = '1';
            } else {
                quickActions.style.opacity = '0.7';
            }
            
            ticking = false;
        });
        ticking = true;
    }
});

// 图片轮播控制函数
function changeCarouselImage(element, direction, event) {
    const card = element.closest('.album-card');
    const carousel = card.querySelector('.carousel-images');
    const indicators = card.querySelectorAll('.carousel-indicator');
    const images = carousel.querySelectorAll('.carousel-image');
    
    if (images.length <= 1) return;
    
    let currentIndex = parseInt(carousel.dataset.current) || 0;
    
    if (typeof direction === 'number' && direction >= 0) {
        // 直接设置索引
        currentIndex = direction;
    } else {
        // 前进或后退
        currentIndex += direction;
        if (currentIndex < 0) currentIndex = images.length - 1;
        if (currentIndex >= images.length) currentIndex = 0;
    }
    
    carousel.dataset.current = currentIndex;
    carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    // 更新指示器
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentIndex);
    });
    
    // 阻止事件冒泡
    if (event) {
        event.stopPropagation();
    }
}

// 自动轮播
function startAutoCarousel() {
    const albumCards = document.querySelectorAll('.album-card');
    
    albumCards.forEach(card => {
        const carousel = card.querySelector('.carousel-images');
        const images = carousel?.querySelectorAll('.carousel-image');
        
        if (images && images.length > 1) {
            setInterval(() => {
                if (!card.matches(':hover')) {
                    const nextBtn = card.querySelector('.carousel-nav.next');
                    if (nextBtn) {
                        changeCarouselImage(nextBtn, 1, null);
                    }
                }
            }, 4000);
        }
    });
}

// 初始化相册卡片交互
function initAlbumInteractions() {
    // 启动自动轮播
    setTimeout(startAutoCarousel, 1000);
    
    // 键盘导航
    document.addEventListener('keydown', function(e) {
        const focusedCard = document.querySelector('.album-card:hover');
        if (focusedCard) {
            const carousel = focusedCard.querySelector('.carousel-images');
            const images = carousel?.querySelectorAll('.carousel-image');
            
            if (images && images.length > 1) {
                if (e.key === 'ArrowLeft') {
                    const prevBtn = focusedCard.querySelector('.carousel-nav.prev');
                    if (prevBtn) changeCarouselImage(prevBtn, -1, null);
                } else if (e.key === 'ArrowRight') {
                    const nextBtn = focusedCard.querySelector('.carousel-nav.next');
                    if (nextBtn) changeCarouselImage(nextBtn, 1, null);
                }
            }
        }
    });
}

// 触摸支持
function addTouchSupport() {
    document.addEventListener('touchstart', function(e) {
        const card = e.target.closest('.album-card');
        if (card) {
            const carousel = card.querySelector('.carousel-images');
            if (carousel) {
                const startX = e.touches[0].clientX;
                card.dataset.startX = startX;
                card.dataset.startTime = Date.now();
            }
        }
    });
    
    document.addEventListener('touchend', function(e) {
        const card = e.target.closest('.album-card');
        if (card && card.dataset.startX) {
            const endX = e.changedTouches[0].clientX;
            const startX = parseFloat(card.dataset.startX);
            const timeDiff = Date.now() - parseInt(card.dataset.startTime);
            const distance = Math.abs(endX - startX);
            
            // 滑动检测
            if (distance > 50 && timeDiff < 500) {
                const carousel = card.querySelector('.carousel-images');
                const images = carousel?.querySelectorAll('.carousel-image');
                
                if (images && images.length > 1) {
                    if (endX > startX) {
                        // 向右滑动 - 上一张
                        const prevBtn = card.querySelector('.carousel-nav.prev');
                        if (prevBtn) changeCarouselImage(prevBtn, -1, null);
                    } else {
                        // 向左滑动 - 下一张
                        const nextBtn = card.querySelector('.carousel-nav.next');
                        if (nextBtn) changeCarouselImage(nextBtn, 1, null);
                    }
                }
            }
            
            // 清除数据
            delete card.dataset.startX;
            delete card.dataset.startTime;
        }
    });
}

// 延迟加载图片
function lazyLoadImages() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    });
    
    document.querySelectorAll('[data-src]').forEach(img => {
        observer.observe(img);
    });
}
