// index.js - 首页功能

// 全局变量
let imagesData = [];

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

    // 绑定退出按钮
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
});

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
            renderContent(content);
        } else {

            // 即使API失败也显示空状态，而不是完全不显示
            renderContent({ articles: [], images: [] });
            showNotification('加载内容失败，请稍后重试', false);
        }
    } catch (error) {

        // 网络错误时也显示空状态
        renderContent({ articles: [], images: [] });
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

// 渲染内容
function renderContent(content) {
    const articlesContainer = document.getElementById('articles-container');
    const imagesContainer = document.getElementById('images-container');

    // 保存图片数据到全局变量（限制为3条）
    imagesData = content.images ? content.images.slice(0, 3) : [];

    // 清空容器
    articlesContainer.innerHTML = '';
    imagesContainer.innerHTML = '';

    // 渲染文章
    if (content.articles && content.articles.length > 0) {
    content.articles.slice(0, 3).forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'card';
        const imageUrl = article.coverImage?.url ? decodeHtmlEntities(article.coverImage.url) : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
        articleElement.innerHTML = `
                <img src="${imageUrl}" alt="${article.title}" class="card-img">
                <div class="card-body">
                    <h3 class="card-title">${article.title}</h3>
                    <p class="card-text">${decodeContentImages(article.content).substring(0, 100)}...</p>
                    <div class="card-meta">
                        <span class="card-date">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(article.date || article.createdAt)}
                        </span>
                    </div>
                    <button class="btn" onclick="viewDetail('article', '${article.id}')">查看详情</button>
                </div>
            `;
        articlesContainer.appendChild(articleElement);
    });
    } else {
        articlesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-newspaper empty-icon"></i><h3>暂无文章</h3><p>还没有发布任何文章</p></div>';
    }

    // 渲染相册
    if (content.images && content.images.length > 0) {
    content.images.slice(0, 3).forEach(album => {
        const albumElement = document.createElement('div');
        albumElement.className = 'card';
        const imageUrl = album.coverImage?.url || album.url || 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
        albumElement.innerHTML = `
                <img src="${decodeHtmlEntities(imageUrl)}" alt="${album.title}" class="card-img" onclick="viewDetail('album', '${album.id}')">
                <div class="card-body">
                    <h3 class="card-title">${album.title}</h3>
                    <p class="card-text">${album.description ? album.description.substring(0, 100) + '...' : ''}</p>
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
                    <button class="btn" onclick="viewDetail('album', '${album.id}')">查看相册</button>
                </div>
            `;
            imagesContainer.appendChild(albumElement);
    });
    } else {
        imagesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-images empty-icon"></i><h3>暂无相册</h3><p>还没有创建任何相册</p></div>';
    }

    // 在控制台输出统计信息
    const totalArticles = content.articles ? content.articles.length : 0;
    const totalImages = content.images ? content.images.length : 0;

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
