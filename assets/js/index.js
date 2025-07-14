// index.js - 首页功能

// 全局变量
let imagesData = [];
let allContent = { articles: [], images: [] };
let currentSection = 'home';
let displayedArticles = 0;
let displayedImages = 0;
let itemsPerPage = 6;

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

    // 加载内容
    loadContent();

    // 绑定导航切换事件
    setupNavigation();

    // 绑定搜索功能
    setupSearchFunctionality();

    // 绑定加载更多按钮
    setupLoadMoreButtons();

    // 绑定退出按钮
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });

    // 检查是否需要切换到特定区域
    checkTargetSection();
});

// 检查是否需要切换到特定区域
function checkTargetSection() {
    const targetSection = localStorage.getItem('targetSection');
    if (targetSection) {
        localStorage.removeItem('targetSection');
        // 延迟切换，确保内容已加载
        setTimeout(() => {
            switchSection(targetSection);
        }, 500);
    }
}

// 设置导航功能
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            switchSection(section);
        });
    });
}

// 切换页面区域
function switchSection(section) {
    if (section === currentSection) return;

    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // 隐藏所有区域
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('articles-section').style.display = 'none';
    document.getElementById('albums-section').style.display = 'none';

    // 显示对应区域
    switch(section) {
        case 'home':
            document.getElementById('welcome-section').style.display = 'block';
            break;
        case 'articles':
            document.getElementById('articles-section').style.display = 'block';
            renderArticles();
            break;
        case 'albums':
            document.getElementById('albums-section').style.display = 'block';
            renderAlbums();
            break;
    }

    currentSection = section;
}

// 设置搜索功能
function setupSearchFunctionality() {
    const articlesSearch = document.getElementById('articles-search');
    const imagesSearch = document.getElementById('images-search');

    if (articlesSearch) {
        articlesSearch.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (query === '') {
                renderArticles(); // 重新渲染完整列表
            } else {
                searchAndRenderArticles(query);
            }
        });
    }

    if (imagesSearch) {
        imagesSearch.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (query === '') {
                renderAlbums(); // 重新渲染完整列表
            } else {
                searchAndRenderAlbums(query);
            }
        });
    }
}

// 搜索文章并渲染
function searchAndRenderArticles(query) {
    const container = document.getElementById('articles-container');
    if (!container) return;

    container.innerHTML = '';
    displayedArticles = 0;

    let filteredArticles = allContent.articles || [];

    if (query) {
        filteredArticles = filteredArticles.filter(article =>
            article.title.toLowerCase().includes(query) ||
            article.content.toLowerCase().includes(query) ||
            (article.category && article.category.toLowerCase().includes(query))
        );
    }

    if (filteredArticles.length > 0) {
        filteredArticles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'card';
            const imageUrl = article.coverImage?.url ? decodeHtmlEntities(article.coverImage.url) : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
            articleElement.innerHTML = `
                <img src="${imageUrl}" alt="${article.title}" class="card-img">
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
                    <button class="btn btn-primary" onclick="viewDetail('article', '${article.id}')">
                        <i class="fas fa-eye"></i>
                        阅读全文
                    </button>
                </div>
            `;
            container.appendChild(articleElement);
        });

        displayedArticles = filteredArticles.length;

        // 搜索时隐藏加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-articles');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关文章</h3><p>没有找到包含"${query}"的文章</p></div>`;
        // 隐藏加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-articles');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// 搜索相册并渲染
function searchAndRenderAlbums(query) {
    const container = document.getElementById('images-container');
    if (!container) return;

    container.innerHTML = '';
    displayedImages = 0;

    let filteredAlbums = allContent.images || [];

    if (query) {
        filteredAlbums = filteredAlbums.filter(album =>
            album.title.toLowerCase().includes(query) ||
            (album.description && album.description.toLowerCase().includes(query)) ||
            (album.category && album.category.toLowerCase().includes(query))
        );
    }

    if (filteredAlbums.length > 0) {
        filteredAlbums.forEach(album => {
            const albumElement = document.createElement('div');
            albumElement.className = 'card';
            const imageUrl = album.coverImage?.url || album.url || 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
            albumElement.innerHTML = `
                <img src="${decodeHtmlEntities(imageUrl)}" alt="${album.title}" class="card-img" onclick="viewDetail('album', '${album.id}')">
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
                    <button class="btn btn-primary" onclick="viewDetail('album', '${album.id}')">
                        <i class="fas fa-eye"></i>
                        查看相册
                    </button>
                </div>
            `;
            container.appendChild(albumElement);
        });

        displayedImages = filteredAlbums.length;

        // 搜索时隐藏加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-images');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    } else {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到相关相册</h3><p>没有找到包含"${query}"的相册</p></div>`;
        // 隐藏加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-images');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// 加载内容
async function loadContent() {
    try {
        // 🌟 使用公开API，无需认证
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
        } else {
            // 即使API失败也显示空状态，而不是完全不显示
            allContent = { articles: [], images: [] };
            renderContent(allContent);
            updateStats(allContent);
            showNotification('加载内容失败，请稍后重试', false);
        }
    } catch (error) {
        // 网络错误时也显示空状态
        allContent = { articles: [], images: [] };
        renderContent(allContent);
        updateStats(allContent);
        showNotification('网络错误，请检查网络连接', false);
    }
}

// 解码HTML实体 - 增强版，处理多重编码
function decodeHtmlEntities(text) {
    if (!text || typeof text !== 'string') return text;

    let decoded = text;
    let previousDecoded = '';

    // 循环解码直到没有更多实体可解码
    while (decoded !== previousDecoded) {
        previousDecoded = decoded;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = decoded;
        decoded = textarea.value;
    }

    return decoded;
}

// 解码文章内容中的图片URL
function decodeContentImages(content) {
    if (!content || typeof content !== 'string') return content;

    // 匹配所有img标签的src属性
    return content.replace(/<img([^>]*?)src=["']([^"']*?)["']([^>]*?)>/gi, function(match, beforeSrc, src, afterSrc) {
        const decodedSrc = decodeHtmlEntities(src);
        return `<img${beforeSrc}src="${decodedSrc}"${afterSrc}>`;
    });
}

// 渲染内容（首页用，初始化时调用）
function renderContent(content) {
    // 保存图片数据到全局变量（限制为3条）
    imagesData = content.images ? content.images.slice(0, 3) : [];

    // 首页默认显示欢迎区域
    document.getElementById('welcome-section').style.display = 'block';
    document.getElementById('articles-section').style.display = 'none';
    document.getElementById('albums-section').style.display = 'none';
}

// 更新统计信息
function updateStats(content) {
    const articlesCount = content.articles ? content.articles.length : 0;
    const albumsCount = content.images ? content.images.length : 0;

    const articlesCountEl = document.getElementById('articles-count');
    const albumsCountEl = document.getElementById('albums-count');

    if (articlesCountEl) articlesCountEl.textContent = articlesCount;
    if (albumsCountEl) albumsCountEl.textContent = albumsCount;
}

// 单独渲染文章
function renderArticles() {
    const articlesContainer = document.getElementById('articles-container');
    if (!articlesContainer) return;

    articlesContainer.innerHTML = '';
    displayedArticles = 0;

    if (allContent.articles && allContent.articles.length > 0) {
        const initialBatch = allContent.articles.slice(0, itemsPerPage);
        initialBatch.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'card';
            const imageUrl = article.coverImage?.url ? decodeHtmlEntities(article.coverImage.url) : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
            articleElement.innerHTML = `
                <img src="${imageUrl}" alt="${article.title}" class="card-img">
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
                    <button class="btn btn-primary" onclick="viewDetail('article', '${article.id}')">
                        <i class="fas fa-eye"></i>
                        阅读全文
                    </button>
                </div>
            `;
            articlesContainer.appendChild(articleElement);
        });

        displayedArticles = initialBatch.length;

        // 显示或隐藏加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-articles');
        if (loadMoreBtn) {
            if (allContent.articles.length > itemsPerPage) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    } else {
        articlesContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>暂无文章</h3><p>还没有发布任何文章，快去写一篇吧！</p></div>';
        // 隐藏加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-articles');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// 单独渲染相册
function renderAlbums() {
    const imagesContainer = document.getElementById('images-container');
    if (!imagesContainer) return;

    imagesContainer.innerHTML = '';
    displayedImages = 0;

    if (allContent.images && allContent.images.length > 0) {
        const initialBatch = allContent.images.slice(0, itemsPerPage);
        initialBatch.forEach(album => {
            const albumElement = document.createElement('div');
            albumElement.className = 'card';
            const imageUrl = album.coverImage?.url || album.url || 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
            albumElement.innerHTML = `
                <img src="${decodeHtmlEntities(imageUrl)}" alt="${album.title}" class="card-img" onclick="viewDetail('album', '${album.id}')">
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
                    <button class="btn btn-primary" onclick="viewDetail('album', '${album.id}')">
                        <i class="fas fa-eye"></i>
                        查看相册
                    </button>
                </div>
            `;
            imagesContainer.appendChild(albumElement);
        });

        displayedImages = initialBatch.length;

        // 显示或隐藏加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-images');
        if (loadMoreBtn) {
            if (allContent.images.length > itemsPerPage) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    } else {
        imagesContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">📸</div><h3>暂无相册</h3><p>还没有创建任何相册，快去拍照吧！</p></div>';
        // 隐藏加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-images');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '未知日期';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

// 打开图片查看器
function openImageViewer(imageId) {
    // 这里需要实现图片查看器功能

}

// 查看详情
function viewDetail(type, id) {
    localStorage.setItem('currentDetail', JSON.stringify({ type, id }));
    window.location.href = 'detail.html';
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    showNotification('您已成功退出', true);
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    if (notification) {
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
    }
}

// 图片查看器功能
let currentImageIndex = 0;
let currentImages = [];
let currentZoom = 1;

function openImageViewer(imageId) {
    // 查找图片数据
    const image = imagesData.find(img => img.id === imageId);
    if (!image) return;

    currentImages = imagesData;
    currentImageIndex = currentImages.findIndex(img => img.id === imageId);

    const viewer = document.getElementById('image-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerTitle = document.getElementById('viewer-title');
    const imageCounter = document.getElementById('image-counter');

    if (viewer && viewerImage && viewerTitle && imageCounter) {
        viewerImage.src = decodeHtmlEntities(image.url);
        viewerTitle.textContent = image.title;
        imageCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;

        viewer.style.display = 'block';
        viewer.classList.add('active');
        resetZoom();
    }
}

function closeImageViewer() {
    const viewer = document.getElementById('image-viewer');
    if (viewer) {
        viewer.style.display = 'none';
        viewer.classList.remove('active');
    }
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
    const viewerImage = document.getElementById('viewer-image');
    const viewerTitle = document.getElementById('viewer-title');
    const imageCounter = document.getElementById('image-counter');

    if (viewerImage && viewerTitle && imageCounter) {
        viewerImage.src = decodeHtmlEntities(image.url);
        viewerTitle.textContent = image.title;
        imageCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
        resetZoom();
    }
}

function zoomIn() {
    currentZoom = Math.min(currentZoom * 1.2, 3);
    applyZoom();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom / 1.2, 0.5);
    applyZoom();
}

function resetZoom() {
    currentZoom = 1;
    applyZoom();
}

function applyZoom() {
    const viewerImage = document.getElementById('viewer-image');
    if (viewerImage) {
        viewerImage.style.transform = `scale(${currentZoom})`;
    }
}

// 设置加载更多按钮功能
function setupLoadMoreButtons() {
    const loadMoreArticlesBtn = document.getElementById('load-more-articles');
    const loadMoreImagesBtn = document.getElementById('load-more-images');

    if (loadMoreArticlesBtn) {
        loadMoreArticlesBtn.addEventListener('click', function() {
            loadMoreArticles();
        });
    }

    if (loadMoreImagesBtn) {
        loadMoreImagesBtn.addEventListener('click', function() {
            loadMoreImages();
        });
    }
}

// 加载更多文章
function loadMoreArticles() {
    const container = document.getElementById('articles-container');
    if (!container || !allContent.articles) return;

    const nextBatch = allContent.articles.slice(displayedArticles, displayedArticles + itemsPerPage);

    nextBatch.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'card';
        const imageUrl = article.coverImage?.url ? decodeHtmlEntities(article.coverImage.url) : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
        articleElement.innerHTML = `
            <img src="${imageUrl}" alt="${article.title}" class="card-img">
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
                <button class="btn btn-primary" onclick="viewDetail('article', '${article.id}')">
                    <i class="fas fa-eye"></i>
                    阅读全文
                </button>
            </div>
        `;
        container.appendChild(articleElement);
    });

    displayedArticles += nextBatch.length;

    // 如果已经显示了所有文章，隐藏加载更多按钮
    if (displayedArticles >= allContent.articles.length) {
        document.getElementById('load-more-articles').style.display = 'none';
    }
}

// 加载更多相册
function loadMoreImages() {
    const container = document.getElementById('images-container');
    if (!container || !allContent.images) return;

    const nextBatch = allContent.images.slice(displayedImages, displayedImages + itemsPerPage);

    nextBatch.forEach(album => {
        const albumElement = document.createElement('div');
        albumElement.className = 'card';
        const imageUrl = album.coverImage?.url || album.url || 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
        albumElement.innerHTML = `
            <img src="${decodeHtmlEntities(imageUrl)}" alt="${album.title}" class="card-img" onclick="viewDetail('album', '${album.id}')">
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
                <button class="btn btn-primary" onclick="viewDetail('album', '${album.id}')">
                    <i class="fas fa-eye"></i>
                    查看相册
                </button>
            </div>
        `;
        container.appendChild(albumElement);
    });

    displayedImages += nextBatch.length;

    // 如果已经显示了所有相册，隐藏加载更多按钮
    if (displayedImages >= allContent.images.length) {
        document.getElementById('load-more-images').style.display = 'none';
    }
}
