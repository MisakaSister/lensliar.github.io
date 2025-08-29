// albums.js - 相册列表页面功能

// 全局变量
let allAlbums = [];
let currentView = 'grid';
let currentSort = 'date-desc';
let isDarkTheme = false;
let albumsDisplayed = 6;
const itemsPerPage = 6;

// 分类名称映射
const categoryNameMap = {
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

// 动态更新SEO信息
function updateSEOInfo(filter = '', search = '') {
    let title = '相册集锦 - 创作空间';
    let description = '浏览创作空间精美相册，记录美好瞬间，分享视觉盛宴，感受艺术魅力，激发创作灵感。';
    
    if (filter && filter !== '') {
        const categoryName = getFriendlyCategoryName(filter);
        title = `${categoryName}相册 - 创作空间`;
        description = `浏览创作空间${categoryName}分类的精美相册，记录美好瞬间，分享视觉盛宴。`;
    }
    
    if (search && search.trim() !== '') {
        title = `"${search}"搜索结果 - 创作空间`;
        description = `在创作空间中搜索"${search}"的结果，发现精美相册，感受视觉艺术魅力。`;
    }
    
    // 更新页面标题
    document.title = title;
    
    // 更新meta描述
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.setAttribute('content', description);
    }
    
    // 更新Open Graph标签
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDescription) ogDescription.setAttribute('content', description);
    
    // 更新Twitter Card标签
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);
    if (twitterDescription) twitterDescription.setAttribute('content', description);
    
    // 更新canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        let url = 'https://wengguodong.com/albums.html';
        if (filter || search) {
            const params = new URLSearchParams();
            if (filter) params.append('filter', filter);
            if (search) params.append('search', search);
            url += '?' + params.toString();
        }
        canonical.setAttribute('href', url);
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录并验证token有效性
    checkAuthStatus();

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
    
    // 检查URL参数并更新SEO
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    const search = urlParams.get('search');
    if (filter || search) {
        updateSEOInfo(filter, search);
    }
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

// 初始化/切换主题统一由 AppTheme 管理
function initTheme() { try { window.AppTheme.init(); } catch(_){} }
function toggleTheme() { try { window.AppTheme.toggle(); } catch(_){} }

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
                option.textContent = getFriendlyCategoryName(category);
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
    albumElement.className = 'grid--cell';
    albumElement.style.animationDelay = `${index * 0.1}s`;
    
    const imageUrl = album.coverImage?.url || (album.images && album.images.length > 0 ? album.images[0].url : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg');
    
    // 获取相册图片列表
    const images = album.images || [];
    const imageCount = album.imageCount || images.length || 0;
    
    // 创建标签列表
    const tags = [];
    if (album.category) {
        tags.push(`<li><a href="#" class="tag">${getFriendlyCategoryName(album.category)}</a></li>`);
    }
    if (imageCount > 0) {
        tags.push(`<li><a href="#" class="tag">${imageCount} 张图片</a></li>`);
    }
    tags.push(`<li><a href="#" class="tag">${formatDate(album.createdAt)}</a></li>`);
    
    // 添加省略号标签
    if (tags.length > 3) {
        tags.push(`<li><a href="#" class="tag ellipsis"><i class="far fa-ellipsis-h"></i></a></li>`);
    }
    
    albumElement.innerHTML = `
        <article class="grid--item">
            <div class="preview--container">
                <a href="#" class="preview-image--container" onclick="viewAlbumDetail('${album.id}'); return false;">
                    <div class="preview-image" style="background-image: url('${decodeHtmlEntities(imageUrl)}')"></div>
                </a>
                <div class="meta--container">
                    <a href="#" class="issue">相册</a>
                    <a href="#" class="page">${imageCount} 张</a>
                </div>
                
                <div class="hover--options">
                    <a href="#" class="series button" onclick="viewAlbumDetail('${album.id}'); return false;" title="查看相册">
                        <i class="far fa-image"></i>
                    </a>
                    
                    <a href="#" class="latest button" onclick="shareAlbum('${album.id}', '${album.title}'); return false;" title="分享相册">
                        <i class="fas fa-share"></i>
                    </a>
                    
                    <a href="#" class="follow button" onclick="viewAlbumDetail('${album.id}'); return false;" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </a>
                </div>
            </div>
            
            <div class="content--container">
                <div class="title--container">
                    <a class="title--text" href="#" onclick="viewAlbumDetail('${album.id}'); return false;">${album.title}</a>
                </div>
                
                <div class="tags--overflow-container">
                    <ul class="tags--container">
                        ${tags.join('')}
                    </ul>
                </div>
            </div>
        </article>
    `;
    
    return albumElement;
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
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
    showNotification('已退出登录');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
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
            case 'count-desc':
                const aCount = a.imageCount || (a.images ? a.images.length : 0);
                const bCount = b.imageCount || (b.images ? b.images.length : 0);
                return bCount - aCount;
            case 'count-asc':
                const aCountAsc = a.imageCount || (a.images ? a.images.length : 0);
                const bCountAsc = b.imageCount || (b.images ? b.images.length : 0);
                return aCountAsc - bCountAsc;
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