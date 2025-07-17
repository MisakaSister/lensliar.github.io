// albums.js - 相册列表页面功能

// 全局变量
let allAlbums = [];
let currentView = 'grid';
let currentSort = 'date-desc';
let isDarkTheme = false;
let albumsDisplayed = 6;
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

    // 加载相册数据
    loadAlbums();

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
    const albumsSearch = document.getElementById('albums-search');
    if (albumsSearch) {
        albumsSearch.addEventListener('input', debounce(function() {
            const query = this.value.toLowerCase();
            searchAndRenderAlbums(query);
        }, 300));
    }

    // 分类筛选
    const albumsFilter = document.getElementById('albums-filter');
    if (albumsFilter) {
        albumsFilter.addEventListener('change', function() {
            const selectedCategory = this.value;
            filterAndRenderAlbums(selectedCategory);
        });
    }

    // 排序功能
    const albumsSort = document.getElementById('albums-sort');
    if (albumsSort) {
        albumsSort.addEventListener('change', function() {
            currentSort = this.value;
            renderAlbums();
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
    const loadMoreBtn = document.getElementById('load-more-albums');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loadMoreAlbums();
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

// 加载相册数据
async function loadAlbums() {
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
            allAlbums = content.images || [];
            renderAlbums();
            loadAndPopulateCategories();
            
            // 初始化相册交互功能
            setTimeout(() => {
                initAlbumInteractions();
            }, 100);
        } else {
            allAlbums = [];
            renderAlbums();
            showNotification('加载相册失败，请稍后重试', false);
        }
    } catch (error) {
        allAlbums = [];
        renderAlbums();
        showNotification('网络错误，请检查网络连接', false);
    }
}

// 加载并填充分类数据
async function loadAndPopulateCategories() {
    try {
        const albumCategories = [...new Set(allAlbums.map(album => album.category).filter(Boolean))];
        
        const albumsFilter = document.getElementById('albums-filter');
        if (albumsFilter) {
            albumsFilter.innerHTML = '<option value="">所有分类</option>';
            albumCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                albumsFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载分类数据失败:', error);
    }
}

// 渲染相册列表
function renderAlbums() {
    const container = document.getElementById('albums-container');
    if (!container) return;
    
    const searchQuery = document.getElementById('albums-search').value.toLowerCase();
    const filterCategory = document.getElementById('albums-filter').value;
    
    if (searchQuery) {
        searchAndRenderAlbums(searchQuery);
        return;
    }
    
    if (filterCategory) {
        filterAndRenderAlbums(filterCategory);
        return;
    }
    
    container.innerHTML = '';
    
    let albums = sortData(allAlbums, currentSort);
    const displayCount = albumsDisplayed || itemsPerPage;
    const albumsToShow = albums.slice(0, displayCount);
    
    if (albumsToShow.length > 0) {
        albumsToShow.forEach((album, index) => {
            const albumElement = createAlbumCard(album, index);
            container.appendChild(albumElement);
        });
    } else {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🖼️</div>
            <h3>暂无相册</h3>
            <p>还没有创建任何相册</p>
        </div>`;
    }
    
    // 更新加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-albums');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = displayCount < albums.length ? 'block' : 'none';
    }
}

// 搜索相册并渲染
function searchAndRenderAlbums(query) {
    const container = document.getElementById('albums-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredAlbums = allAlbums.filter(album => 
        album.title.toLowerCase().includes(query) ||
        (album.description && album.description.toLowerCase().includes(query)) ||
        (album.category && album.category.toLowerCase().includes(query))
    );
    
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
    
    // 搜索时隐藏加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-albums');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
    }
}

// 筛选并渲染相册
function filterAndRenderAlbums(category) {
    const container = document.getElementById('albums-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredAlbums = allAlbums;
    
    if (category) {
        filteredAlbums = allAlbums.filter(album => 
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
    
    // 筛选时隐藏加载更多按钮
    const loadMoreBtn = document.getElementById('load-more-albums');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
    }
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
                        <span class="album-stat-number">${album.category || '未分类'}</span>
                        <span class="album-stat-label">分类</span>
                    </div>
                </div>
                <div class="album-actions">
                    <button class="album-action-btn" onclick="viewAlbumDetail('${album.id}'); event.stopPropagation();">
                        <i class="fas fa-eye"></i>
                        查看相册
                    </button>
                    <button class="album-action-btn" onclick="shareAlbum('${album.id}', '${album.title}'); event.stopPropagation();">
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
            viewAlbumDetail(album.id);
        }
    });
    
    return albumElement;
}

// 更新内容视图
function updateContentView() {
    const container = document.getElementById('albums-container');
    if (container) {
        // 移除所有视图类
        container.classList.remove('view-grid', 'view-masonry');
        // 添加当前视图类
        container.classList.add(`view-${currentView}`);
    }
}

// 加载更多相册
function loadMoreAlbums() {
    albumsDisplayed += itemsPerPage;
    renderAlbums();
}

// 查看相册详情
function viewAlbumDetail(id) {
    window.location.href = `album-detail.html?id=${id}`;
}

// 分享相册
function shareAlbum(id, title) {
    const url = `${window.location.origin}/album-detail.html?id=${id}`;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        });
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(url).then(() => {
            showNotification('相册链接已复制到剪贴板');
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

// 相册轮播控制函数
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

// 初始化相册交互
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
} 