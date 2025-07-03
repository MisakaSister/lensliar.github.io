// detail.js - 详情页面功能

// 全局变量
let allContent = { articles: [], images: [] };
let currentDetail = null;

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

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    loadDetailContent();
});

// 加载详情内容
async function loadDetailContent() {
    const detailData = JSON.parse(localStorage.getItem('currentDetail'));
    if (!detailData) {
        document.getElementById('detail-container').innerHTML = `
                <div class="detail-header">
                    <h1 class="detail-title">内容不存在</h1>
                    <p>请从首页选择内容查看</p>
                    <button class="btn back-btn" onclick="window.location.href='index.html'">返回首页</button>
                </div>
            `;
        return;
    }

    const { type, id } = detailData;

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
            currentDetail = { type, id };

            if (type === 'article') {
                const article = content.articles.find(a => a.id === id);
                if (article) {
                    renderArticleDetail(article);
                    return;
                }
            } else if (type === 'image') {
                const image = content.images.find(i => i.id === id);
                if (image) {
                    renderImageDetail(image);
                    return;
                }
            } else if (type === 'album') {
                const album = content.images.find(i => i.id === id);
                if (album) {
                    renderAlbumDetail(album);
                    return;
                }
            }

            document.getElementById('detail-container').innerHTML = `
                    <div class="detail-header">
                        <h1 class="detail-title">内容不存在</h1>
                        <p>请求的内容可能已被删除</p>
                        <button class="btn back-btn" onclick="window.location.href='index.html'">返回首页</button>
                    </div>
                `;
        } else {
            showError();
        }
    } catch (error) {
        console.error('加载详情错误:', error);
        showError();
    }
}

// 渲染文章详情
function renderArticleDetail(article) {
    const container = document.getElementById('detail-container');
    container.innerHTML = `
            <div class="detail-header">
                <h1 class="detail-title">${article.title}</h1>
                <div class="detail-meta">
                    <span>分类: ${article.category || '未分类'}</span>
                    <span>发布日期: ${formatDate(article.createdAt || article.date) || '未知日期'}</span>
                </div>
            </div>
            ${article.coverImage?.url ? `<img src="${decodeHtmlEntities(article.coverImage.url)}" alt="${article.title}" class="detail-image">` : ''}
            <div class="detail-content">${decodeContentImages(article.content)}</div>
            <button class="btn back-btn" onclick="window.history.back()">返回</button>
        `;
}

// 渲染图片详情
function renderImageDetail(image) {
    const container = document.getElementById('detail-container');
    container.innerHTML = `
            <div class="detail-header">
                <h1 class="detail-title">${image.title}</h1>
                <div class="detail-meta">
                    <span>分类: ${image.category || '未分类'}</span>
                    <span>发布日期: ${formatDate(image.createdAt || image.date) || '未知日期'}</span>
                </div>
            </div>
            <img src="${decodeHtmlEntities(image.url)}" alt="${image.title}" class="detail-image">
            <div class="detail-content">
                <p>${image.description || ''}</p>
            </div>
            <button class="btn back-btn" onclick="window.history.back()">返回</button>
        `;
}

// 渲染相册详情
function renderAlbumDetail(album) {
    const container = document.getElementById('detail-container');
    
    let imagesHtml = '';
    if (album.images && album.images.length > 0) {
        imagesHtml = album.images.map((image, index) => `
            <div class="album-image-item">
                <img src="${decodeHtmlEntities(image.url)}" 
                     alt="${image.title || album.title}" 
                     class="album-image" 
                     onclick="openImageViewer('${image.url}', ${index})">
                ${image.title ? `<div class="image-title">${image.title}</div>` : ''}
            </div>
        `).join('');
    }
    
    container.innerHTML = `
        <div class="detail-header">
            <h1 class="detail-title">${album.title}</h1>
            <div class="detail-meta">
                <span>分类: ${album.category || '未分类'}</span>
                <span>发布日期: ${formatDate(album.createdAt) || '未知日期'}</span>
                <span>图片数量: ${album.imageCount || album.images?.length || 0} 张</span>
            </div>
        </div>
        ${album.description ? `<div class="detail-description"><p>${album.description}</p></div>` : ''}
        <div class="album-images-grid">
            ${imagesHtml}
        </div>
        <button class="btn back-btn" onclick="window.history.back()">返回</button>
    `;
}

// 显示错误
function showError() {
    document.getElementById('detail-container').innerHTML = `
            <div class="detail-header">
                <h1 class="detail-title">加载失败</h1>
                <p>无法加载内容，请稍后再试</p>
                <button class="btn back-btn" onclick="window.location.href='index.html'">返回首页</button>
            </div>
        `;
}

// 导航功能
function navigateContent(direction) {
    if (!currentDetail || !allContent) return;

    const { type, id } = currentDetail;
    const data = type === 'article' ? allContent.articles : allContent.images;
    const currentIndex = data.findIndex(item => item.id === id);

    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev') {
        newIndex = currentIndex - 1;
    } else {
        newIndex = currentIndex + 1;
    }

    if (newIndex >= 0 && newIndex < data.length) {
        const newItem = data[newIndex];
        localStorage.setItem('currentDetail', JSON.stringify({ type, id: newItem.id }));
        window.location.reload();
    }
}

// 图片查看器功能
let currentImageIndex = 0;
let currentImages = [];
let currentZoom = 1;

function openImageViewer(imageUrl, imageIndex = 0) {
    const viewer = document.getElementById('image-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerTitle = document.getElementById('viewer-title');
    
    if (viewer && viewerImage && viewerTitle) {
        // 如果是相册详情页，设置当前图片列表
        if (currentDetail && currentDetail.type === 'album') {
            const album = allContent.images.find(i => i.id === currentDetail.id);
            if (album && album.images) {
                currentImages = album.images;
                currentImageIndex = imageIndex;
                updateViewerImage();
            }
        } else {
            // 单图查看
            viewerImage.src = imageUrl;
            viewerTitle.textContent = '图片详情';
            currentImages = [{ url: imageUrl }];
            currentImageIndex = 0;
        }
        
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

function updateViewerImage() {
    const viewerImage = document.getElementById('viewer-image');
    const viewerTitle = document.getElementById('viewer-title');
    const imageCounter = document.getElementById('image-counter');
    
    if (currentImages.length > 0 && currentImageIndex >= 0 && currentImageIndex < currentImages.length) {
        const currentImage = currentImages[currentImageIndex];
        
        if (viewerImage) {
            viewerImage.src = currentImage.url;
        }
        
        if (viewerTitle) {
            viewerTitle.textContent = currentImage.title || '图片详情';
        }
        
        if (imageCounter) {
            imageCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
        }
    }
}

function showPrevImage() {
    if (currentImages.length > 1) {
        currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
        updateViewerImage();
        resetZoom();
    }
}

function showNextImage() {
    if (currentImages.length > 1) {
        currentImageIndex = (currentImageIndex + 1) % currentImages.length;
        updateViewerImage();
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

function toggleFullscreen() {
    const viewer = document.getElementById('image-viewer');
    if (viewer) {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            viewer.requestFullscreen();
        }
    }
}

function downloadImage() {
    const viewerImage = document.getElementById('viewer-image');
    if (viewerImage && viewerImage.src) {
        const link = document.createElement('a');
        link.href = viewerImage.src;
        link.download = 'image.jpg';
        link.click();
    }
}

function shareImage() {
    const shareModal = document.getElementById('share-modal');
    const shareUrl = document.getElementById('share-url');
    
    if (shareModal && shareUrl) {
        shareUrl.value = window.location.href;
        shareModal.style.display = 'block';
    }
}

function closeShareModal() {
    const shareModal = document.getElementById('share-modal');
    if (shareModal) {
        shareModal.style.display = 'none';
    }
}

function shareToWeChat() {
    showNotification('请复制链接到微信分享', true);
}

function shareToWeibo() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${title}`);
}

function shareToQQ() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`);
}

function copyLink() {
    copyShareUrl();
}

function copyShareUrl() {
    const shareUrl = document.getElementById('share-url');
    if (shareUrl) {
        shareUrl.select();
        document.execCommand('copy');
        showNotification('链接已复制到剪贴板', true);
        closeShareModal();
    }
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