// album-detail.js - 相册详情页面功能

// 全局变量
let allAlbums = [];
let currentAlbum = null;
let isDarkTheme = false;
let currentImageIndex = 0;
let currentImages = [];

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

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录并验证token有效性
    checkAuthStatus();

    // 初始化主题
    initTheme();

    // 加载相册详情
    loadAlbumDetail();

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
        } else {
            // token无效，清除并隐藏管理按钮
            sessionStorage.removeItem('authToken');
            document.getElementById('admin-link').style.display = 'none';
        }
    } catch (error) {
        console.error('验证token失败:', error);
        // 网络错误时也隐藏管理按钮
        document.getElementById('admin-link').style.display = 'none';
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

// 加载相册详情
async function loadAlbumDetail() {
    // 从URL参数获取相册ID
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!id) {
        showError('相册ID不存在');
        return;
    }

    try {
        // 使用公开API获取内容
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
            
            // 查找指定相册
            currentAlbum = allAlbums.find(album => album.id === id);
            
            if (currentAlbum) {
                renderAlbumDetail(currentAlbum);
                loadRelatedAlbums(currentAlbum);
                updateNavigationButtons();
            } else {
                showError('相册不存在或已被删除');
            }
        } else {
            showError('加载相册失败');
        }
    } catch (error) {
        console.error('加载相册详情失败:', error);
        showError('网络错误，请检查网络连接');
    }
}

// 渲染相册详情
function renderAlbumDetail(album) {
    const container = document.getElementById('album-container');
    
    // 更新页面标题
    document.title = `${album.title} - 创作空间`;
    
    // 获取相册图片列表
    const images = album.images || [];
    const imageCount = album.imageCount || images.length || 0;
    
    // 创建图片网格
    let imagesHtml = '';
    if (images.length > 0) {
        imagesHtml = images.map((image, index) => `
            <div class="album-image-item">
                <img src="${decodeHtmlEntities(image.url)}" 
                     alt="${image.title || album.title}" 
                     class="album-image" 
                     onclick="openImageViewer('${image.url}', ${index})">
                ${image.title ? `<div class="image-title">${image.title}</div>` : ''}
            </div>
        `).join('');
    } else {
        imagesHtml = `<div class="empty-images">
            <div class="empty-icon">🖼️</div>
            <p>暂无图片</p>
        </div>`;
    }
    
    container.innerHTML = `
        <div class="detail-header">
            <h1 class="detail-title">${album.title}</h1>
            <div class="detail-meta">
                <span><i class="fas fa-tag"></i> 分类: ${getFriendlyCategoryName(album.category)}</span>
                <span><i class="fas fa-calendar"></i> 创建时间: ${formatDate(album.createdAt) || '未知日期'}</span>
                <span><i class="fas fa-images"></i> 图片数量: ${imageCount} 张</span>
            </div>
        </div>
        ${album.description ? `<div class="detail-description"><p>${album.description}</p></div>` : ''}
        <div class="album-images-grid">
            ${imagesHtml}
        </div>
        <div class="album-actions">
            <button class="btn btn-primary" onclick="shareAlbum('${album.id}', '${album.title}')">
                <i class="fas fa-share"></i>
                分享相册
            </button>
            <button class="btn btn-secondary" onclick="goBackToAlbums()">
                <i class="fas fa-arrow-left"></i>
                返回列表
            </button>
        </div>
    `;
}

// 加载相关相册
function loadRelatedAlbums(currentAlbum) {
    const relatedContent = document.getElementById('related-content');
    const relatedGrid = document.getElementById('related-grid');
    
    if (!relatedContent || !relatedGrid) return;
    
    // 获取同分类的相册（排除当前相册）
    const relatedAlbums = allAlbums
        .filter(album => 
            album.id !== currentAlbum.id && 
            album.category === currentAlbum.category
        )
        .slice(0, 3);
    
    if (relatedAlbums.length > 0) {
        relatedGrid.innerHTML = relatedAlbums.map(album => `
            <div class="related-item" onclick="viewAlbumDetail('${album.id}')">
                <img src="${album.coverImage?.url || album.url || 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg'}" 
                     alt="${album.title}" class="related-thumb">
                <div class="related-info">
                    <h4>${album.title}</h4>
                    <p>${album.description ? album.description.substring(0, 80) + '...' : '精美相册'}</p>
                </div>
            </div>
        `).join('');
        
        relatedContent.style.display = 'block';
    } else {
        relatedContent.style.display = 'none';
    }
}

// 更新导航按钮状态
function updateNavigationButtons() {
    if (!currentAlbum || !allAlbums.length) return;
    
    const currentIndex = allAlbums.findIndex(album => album.id === currentAlbum.id);
    const prevButton = document.getElementById('prev-album');
    const nextButton = document.getElementById('next-album');
    
    if (prevButton) {
        prevButton.disabled = currentIndex <= 0;
    }
    
    if (nextButton) {
        nextButton.disabled = currentIndex >= allAlbums.length - 1;
    }
}

// 相册导航
function navigateAlbum(direction) {
    if (!currentAlbum || !allAlbums.length) return;
    
    const currentIndex = allAlbums.findIndex(album => album.id === currentAlbum.id);
    let newIndex;
    
    if (direction === 'prev') {
        newIndex = currentIndex - 1;
    } else {
        newIndex = currentIndex + 1;
    }
    
    if (newIndex >= 0 && newIndex < allAlbums.length) {
        const newAlbum = allAlbums[newIndex];
        window.location.href = `album-detail.html?id=${newAlbum.id}`;
    }
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

// 返回相册列表
function goBackToAlbums() {
    window.location.href = 'albums.html';
}

// 显示错误信息
function showError(message) {
    const container = document.getElementById('album-container');
    container.innerHTML = `
        <div class="detail-header">
            <h1 class="detail-title">加载失败</h1>
            <p>${message}</p>
            <button class="btn back-btn" onclick="goBackToAlbums()">返回相册列表</button>
        </div>
    `;
}

// showNotification函数已在app.js中定义

// 图片查看器功能
function openImageViewer(imageUrl, imageIndex = 0) {
    const viewer = document.getElementById('image-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerTitle = document.getElementById('viewer-title');
    
    if (viewer && viewerImage && viewerTitle) {
        // 设置当前图片列表
        if (currentAlbum && currentAlbum.images) {
            currentImages = currentAlbum.images;
            currentImageIndex = imageIndex;
            updateViewerImage();
        } else {
            // 单图查看
            viewerImage.src = imageUrl;
            viewerTitle.textContent = '图片详情';
            currentImages = [{ url: imageUrl }];
            currentImageIndex = 0;
        }
        
        viewer.style.display = 'block';
        viewer.classList.add('active');
    }
}

function closeImageViewer() {
    const viewer = document.getElementById('image-viewer');
    if (viewer) {
        viewer.classList.remove('active');
        setTimeout(() => {
            viewer.style.display = 'none';
        }, 300);
    }
}

function showPrevImage() {
    if (currentImages.length > 1) {
        currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
        updateViewerImage();
    }
}

function showNextImage() {
    if (currentImages.length > 1) {
        currentImageIndex = (currentImageIndex + 1) % currentImages.length;
        updateViewerImage();
    }
}

function updateViewerImage() {
    const viewerImage = document.getElementById('viewer-image');
    const viewerTitle = document.getElementById('viewer-title');
    const imageCounter = document.getElementById('image-counter');
    
    if (currentImages.length > 0 && currentImageIndex >= 0 && currentImageIndex < currentImages.length) {
        const currentImage = currentImages[currentImageIndex];
        viewerImage.src = decodeHtmlEntities(currentImage.url);
        viewerTitle.textContent = currentImage.title || `图片 ${currentImageIndex + 1}`;
        
        if (imageCounter) {
            imageCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
        }
        
        // 更新导航按钮可见性
        const prevBtn = document.getElementById('prev-image-btn');
        const nextBtn = document.getElementById('next-image-btn');
        
        if (prevBtn) {
            prevBtn.style.display = currentImages.length > 1 ? 'block' : 'none';
        }
        if (nextBtn) {
            nextBtn.style.display = currentImages.length > 1 ? 'block' : 'none';
        }
    }
}

// 图片查看器控制功能
function toggleFullscreen() {
    const viewer = document.getElementById('image-viewer');
    if (viewer) {
        if (!document.fullscreenElement) {
            viewer.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
}

function downloadImage() {
    const viewerImage = document.getElementById('viewer-image');
    if (viewerImage && viewerImage.src) {
        const link = document.createElement('a');
        link.href = viewerImage.src;
        link.download = `image_${currentImageIndex + 1}.jpg`;
        link.click();
    }
}

function shareImage() {
    const image = currentImages[currentImageIndex];
    if (image) {
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
    } else {
        showNotification('无法分享图片', false);
    }
}

// 缩放控制
let currentZoom = 1;
const zoomStep = 0.2;
const maxZoom = 3;
const minZoom = 0.5;

function zoomIn() {
    if (currentZoom < maxZoom) {
        currentZoom += zoomStep;
        updateImageZoom();
    }
}

function zoomOut() {
    if (currentZoom > minZoom) {
        currentZoom -= zoomStep;
        updateImageZoom();
    }
}

function resetZoom() {
    currentZoom = 1;
    updateImageZoom();
}

function updateImageZoom() {
    const viewerImage = document.getElementById('viewer-image');
    if (viewerImage) {
        viewerImage.style.transform = `scale(${currentZoom})`;
    }
}

// 工具函数
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
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('formatDate: 日期格式化错误:', error, '原始值:', dateString);
        return '未知日期';
    }
} 