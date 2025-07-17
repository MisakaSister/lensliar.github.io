// albums.js - 相册列表页面功能

// 全局变量
let allAlbums = [];
let currentView = 'grid';
let currentSort = 'date-desc';
let albumsDisplayed = CONFIG.ITEMS_PER_PAGE;

// 相册管理器
class AlbumManager {
    constructor() {
        this.init();
    }
    
    async init() {
        this.setupAuth();
        this.setupEventListeners();
        await this.loadAlbums();
        this.hideLoadingAnimation();
    }
    
    setupAuth() {
        const isLoggedIn = !!localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
        document.getElementById('admin-link').style.display = isLoggedIn ? 'block' : 'none';
        document.getElementById('logout-link').style.display = isLoggedIn ? 'block' : 'none';
    }
    
    setupEventListeners() {
        // 搜索功能
        const albumsSearch = document.getElementById('albums-search');
        if (albumsSearch) {
            albumsSearch.addEventListener('input', Utils.debounce((e) => {
                this.searchAndRenderAlbums(e.target.value.toLowerCase());
            }));
        }

        // 分类筛选
        const albumsFilter = document.getElementById('albums-filter');
        if (albumsFilter) {
            albumsFilter.addEventListener('change', (e) => {
                this.filterAndRenderAlbums(e.target.value);
            });
        }

        // 排序功能
        const albumsSort = document.getElementById('albums-sort');
        if (albumsSort) {
            albumsSort.addEventListener('change', (e) => {
                currentSort = e.target.value;
                this.renderAlbums();
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
        const loadMoreBtn = document.getElementById('load-more-albums');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadMoreAlbums();
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
    
    async loadAlbums() {
        try {
            const content = await api.get('/api/content');
            allAlbums = content.images || [];
            
            this.renderAlbums();
            this.loadAndPopulateCategories();
            
            // 预加载图片
            this.preloadImages();
            
        } catch (error) {
            console.error('加载相册失败:', error);
            allAlbums = [];
            this.renderAlbums();
            notificationManager.error('加载相册失败，请稍后重试');
        }
    }
    
    async loadAndPopulateCategories() {
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
    
    renderAlbums() {
        const container = document.getElementById('albums-container');
        if (!container) return;
        
        const searchQuery = document.getElementById('albums-search')?.value.toLowerCase() || '';
        const filterCategory = document.getElementById('albums-filter')?.value || '';
        
        if (searchQuery) {
            this.searchAndRenderAlbums(searchQuery);
            return;
        }
        
        if (filterCategory) {
            this.filterAndRenderAlbums(filterCategory);
            return;
        }
        
        container.innerHTML = '';
        
        let albums = Utils.sortData(allAlbums, currentSort);
        const albumsToShow = albums.slice(0, albumsDisplayed);
        
        if (albumsToShow.length > 0) {
            albumsToShow.forEach((album, index) => {
                const albumElement = this.createAlbumCard(album, index);
                container.appendChild(albumElement);
            });
        } else {
            container.innerHTML = this.createEmptyState('暂无相册', '还没有创建任何相册', '📸');
        }
        
        this.updateLoadMoreButton(albums.length);
    }
    
    searchAndRenderAlbums(query) {
        const container = document.getElementById('albums-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        let filteredAlbums = allAlbums.filter(album => 
            album.title.toLowerCase().includes(query) ||
            album.description.toLowerCase().includes(query) ||
            (album.category && album.category.toLowerCase().includes(query))
        );
        
        filteredAlbums = Utils.sortData(filteredAlbums, currentSort);
        
        if (filteredAlbums.length > 0) {
            filteredAlbums.forEach((album, index) => {
                const albumElement = this.createAlbumCard(album, index);
                container.appendChild(albumElement);
            });
        } else {
            container.innerHTML = this.createEmptyState('未找到相关相册', `没有找到包含"${query}"的相册`, '🔍');
        }
        
        this.updateLoadMoreButton(0); // 搜索时隐藏加载更多按钮
    }
    
    filterAndRenderAlbums(category) {
        const container = document.getElementById('albums-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        let filteredAlbums = category ? 
            allAlbums.filter(album => album.category === category) : 
            allAlbums;
        
        filteredAlbums = Utils.sortData(filteredAlbums, currentSort);
        
        if (filteredAlbums.length > 0) {
            filteredAlbums.forEach((album, index) => {
                const albumElement = this.createAlbumCard(album, index);
                container.appendChild(albumElement);
            });
        } else {
            container.innerHTML = this.createEmptyState(
                '未找到相关相册', 
                category ? `没有找到分类为"${category}"的相册` : '没有找到相关相册',
                '🔍'
            );
        }
        
        this.updateLoadMoreButton(0); // 筛选时隐藏加载更多按钮
    }
    
    createAlbumCard(album, index) {
        const albumElement = document.createElement('div');
        albumElement.className = 'album-card';
        albumElement.style.animationDelay = `${index * 0.1}s`;
        
        const coverImage = album.images && album.images.length > 0 ? 
            Utils.decodeHtmlEntities(album.images[0].url) : 
            'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
        
        const imageCount = album.images ? album.images.length : 0;
        
        albumElement.innerHTML = `
            <div class="album-card-inner">
                <div class="album-card-front">
                    <div class="album-cover">
                        <img src="${coverImage}" alt="${album.title}" loading="lazy">
                        <div class="album-overlay">
                            <div class="album-info">
                                <span class="image-count">
                                    <i class="fas fa-images"></i>
                                    ${imageCount} 张图片
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="album-content">
                        <h3 class="album-title">${album.title}</h3>
                        <p class="album-description">${album.description || '暂无描述'}</p>
                        <div class="album-meta">
                            <span class="album-date">
                                <i class="fas fa-calendar"></i>
                                ${Utils.formatDate(album.date || album.createdAt)}
                            </span>
                            <span class="album-category">
                                <i class="fas fa-tag"></i>
                                ${album.category || '未分类'}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="album-card-back">
                    <div class="album-preview">
                        ${this.createImageGrid(album.images || [])}
                    </div>
                    <div class="album-actions">
                        <button class="btn btn-primary" onclick="albumManager.viewAlbumDetail('${album.id}'); event.stopPropagation();">
                            <i class="fas fa-eye"></i>
                            查看相册
                        </button>
                        <button class="btn btn-secondary" onclick="albumManager.shareAlbum('${album.id}', '${album.title}'); event.stopPropagation();">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加点击事件，使整个卡片可点击
        albumElement.addEventListener('click', (e) => {
            if (!e.target.closest('.album-actions')) {
                this.viewAlbumDetail(album.id);
            }
        });
        
        albumElement.style.cursor = 'pointer';
        
        return albumElement;
    }
    
    createImageGrid(images) {
        if (!images || images.length === 0) {
            return '<div class="no-images">暂无图片</div>';
        }
        
        const maxImages = 4;
        const imagesToShow = images.slice(0, maxImages);
        
        let gridHtml = '';
        imagesToShow.forEach((image, index) => {
            const imageUrl = Utils.decodeHtmlEntities(image.url);
            gridHtml += `<img src="${imageUrl}" alt="预览图片 ${index + 1}" loading="lazy">`;
        });
        
        if (images.length > maxImages) {
            gridHtml += `<div class="more-images">+${images.length - maxImages}</div>`;
        }
        
        return gridHtml;
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
        const container = document.getElementById('albums-container');
        if (container) {
            container.classList.remove('view-grid', 'view-list');
            container.classList.add(`view-${currentView}`);
        }
    }
    
    loadMoreAlbums() {
        albumsDisplayed += CONFIG.ITEMS_PER_PAGE;
        this.renderAlbums();
    }
    
    updateLoadMoreButton(totalCount) {
        const loadMoreBtn = document.getElementById('load-more-albums');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = albumsDisplayed < totalCount ? 'block' : 'none';
        }
    }
    
    viewAlbumDetail(id) {
        const album = allAlbums.find(a => a.id === id);
        if (!album) {
            notificationManager.error('相册不存在');
            return;
        }
        
        window.location.href = `album-detail.html?id=${id}`;
    }
    
    async shareAlbum(id, title) {
        const url = `${window.location.origin}/album-detail.html?id=${id}`;
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
        // 预加载第一页的相册封面图片
        const firstPageAlbums = allAlbums.slice(0, CONFIG.ITEMS_PER_PAGE);
        firstPageAlbums.forEach(album => {
            if (album.images && album.images.length > 0) {
                PerformanceUtils.preloadImage(Utils.decodeHtmlEntities(album.images[0].url))
                    .catch(() => {}); // 忽略预加载错误
            }
        });
    }
}

// 初始化相册管理器
let albumManager;

document.addEventListener('DOMContentLoaded', function() {
    albumManager = new AlbumManager();
});

// 全局函数（向后兼容）
window.viewAlbumDetail = (id) => albumManager?.viewAlbumDetail(id);
window.shareAlbum = (id, title) => albumManager?.shareAlbum(id, title);
window.loadMoreAlbums = () => albumManager?.loadMoreAlbums();
window.scrollToTop = () => Utils.scrollToTop(); 