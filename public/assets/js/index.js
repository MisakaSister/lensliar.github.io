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
let articlesDisplayed = 0;
let imagesDisplayed = 0;
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

// 检查目标区域
function checkTargetSection() {
    const targetSection = localStorage.getItem('targetSection');
    if (targetSection) {
        setTimeout(() => {
            switchSection(targetSection);
            localStorage.removeItem('targetSection');
        }, 100);
    }
}

// 设置导航功能
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
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
    const containers = document.querySelectorAll('.content-grid');
    containers.forEach(container => {
        container.className = `content-grid view-${currentView}`;
    });
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

// 设置分页功能
function setupPagination() {
    document.getElementById('load-more-articles').addEventListener('click', loadMoreArticles);
    document.getElementById('load-more-images').addEventListener('click', loadMoreImages);
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
                    ${article.category || '未分类'}
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
    albumElement.className = 'card';
    albumElement.style.animationDelay = `${index * 0.1}s`;
    
    const imageUrl = album.coverImage?.url || album.url || 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
    
    albumElement.innerHTML = `
        <img src="${decodeHtmlEntities(imageUrl)}" alt="${album.title}" class="card-img" onclick="viewDetail('album', '${album.id}')" loading="lazy">
        <div class="card-body">
            <h3 class="card-title">${album.title}</h3>
            <p class="card-text">${album.description ? album.description.substring(0, 100) + '...' : '这是一个精美的相册'}</p>
            <div class="card-meta">
                <span class="card-date">
                    <i class="fas fa-calendar"></i>
                    ${formatDate(album.createdAt)}
                </span>
                <span class="card-count">
                    <i class="fas fa-images"></i>
                    ${album.imageCount || album.images?.length || 0} 张图片
                </span>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary" onclick="viewDetail('album', '${album.id}')">
                    <i class="fas fa-eye"></i>
                    查看相册
                </button>
                <button class="btn btn-secondary" onclick="shareContent('album', '${album.id}', '${album.title}')">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
    `;
    
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
    } else {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">📸</div>
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
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// 查看详情
function viewDetail(type, id) {
    localStorage.setItem('targetSection', type === 'article' ? 'articles' : 'albums');
    window.location.href = `detail.html?type=${type}&id=${id}`;
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
        shareContent('album', image.id, image.title);
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
