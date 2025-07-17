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
    // 初始化主题
    initTheme();
    
    // 加载详情内容
    loadDetailContent();
    
    // 检查是否已登录
    if (localStorage.getItem('authToken')) {
        document.getElementById('admin-link').style.display = 'block';
    } else {
        document.getElementById('admin-link').style.display = 'none';
    }
    
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

// 加载详情内容
async function loadDetailContent() {
    // 从URL参数获取数据
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const id = urlParams.get('id');
    
    if (!type || !id) {
        document.getElementById('detail-container').innerHTML = `
                <div class="detail-header">
                    <h1 class="detail-title">内容不存在</h1>
                    <p>请从首页选择内容查看</p>
                    <button class="btn back-btn" onclick="window.location.href='index.html'">返回首页</button>
                </div>
            `;
        return;
    }

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
            <button class="btn back-btn" onclick="goBackToIndex()">返回</button>
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
            <button class="btn back-btn" onclick="goBackToIndex()">返回</button>
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
        <button class="btn back-btn" onclick="goBackToIndex()">返回</button>
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

// 返回首页功能
function goBackToIndex() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    
    // 设置目标区域以便首页正确显示对应的内容区域
    if (type === 'article') {
        localStorage.setItem('targetSection', 'articles');
    } else if (type === 'album') {
        localStorage.setItem('targetSection', 'albums');
    }
    
    window.location.href = 'index.html';
}

// 导航功能
function navigateContent(direction) {
    if (!allContent) return;

    // 从URL参数获取当前信息
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const id = urlParams.get('id');
    
    if (!type || !id) return;

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
        // 使用URL参数导航
        window.location.href = `detail.html?type=${type}&id=${newItem.id}`;
    }
}

// 图片查看器功能
let currentImageIndex = 0;
let currentImages = [];

function openImageViewer(imageUrl, imageIndex = 0) {
    const viewer = document.getElementById('image-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerTitle = document.getElementById('viewer-title');
    
    if (viewer && viewerImage && viewerTitle) {
        // 从URL参数获取当前详情信息
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const id = urlParams.get('id');
        
        // 如果是相册详情页，设置当前图片列表
        if (type === 'album' && id) {
            const album = allContent.images.find(i => i.id === id);
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
    const imageContainer = document.querySelector('.image-container');
    
    if (currentImages.length > 0 && currentImageIndex >= 0 && currentImageIndex < currentImages.length) {
        const currentImage = currentImages[currentImageIndex];
        
        // 显示加载状态
        if (imageContainer) {
            imageContainer.classList.add('loading');
        }
        
        // 图片加载完成后的处理
        viewerImage.onload = function() {
            if (imageContainer) {
                imageContainer.classList.remove('loading');
            }
        };
        
        viewerImage.onerror = function() {
            if (imageContainer) {
                imageContainer.classList.remove('loading');
            }
            showNotification('图片加载失败', false);
        };
        
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

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const themeIcon = document.querySelector('.quick-btn i');
        if (themeIcon) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        }
    }
}

// 切换主题
function toggleTheme() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    document.body.classList.toggle('dark-theme');
    
    const themeIcon = document.querySelector('.quick-btn i');
    if (themeIcon) {
        if (!isDarkTheme) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    }
}

// 返回顶部
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 键盘事件处理
document.addEventListener('keydown', function(e) {
    const imageViewer = document.getElementById('image-viewer');
    if (imageViewer && imageViewer.style.display === 'block') {
        switch (e.key) {
            case 'Escape':
                closeImageViewer();
                break;
            case 'ArrowLeft':
                showPrevImage();
                break;
            case 'ArrowRight':
                showNextImage();
                break;
            case ' ':
                // 空格键切换缩放
                e.preventDefault();
                const viewerImage = document.getElementById('viewer-image');
                if (viewerImage) {
                    toggleImageZoom(viewerImage);
                }
                break;
            case 'r':
            case 'R':
                // R键重置缩放
                const imgElement = document.getElementById('viewer-image');
                if (imgElement) {
                    resetImageZoom(imgElement);
                }
                break;
        }
    }
});

// 点击事件处理
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
            
            if (quickActions) {
                if (scrollTop > 200) {
                    quickActions.style.opacity = '1';
                } else {
                    quickActions.style.opacity = '0.7';
                }
            }
            
            ticking = false;
        });
        ticking = true;
    }
});

// 图片点击缩放功能
document.addEventListener('DOMContentLoaded', function() {
    // 为图片查看器中的图片添加点击缩放功能
    document.addEventListener('click', function(e) {
        if (e.target.id === 'viewer-image') {
            toggleImageZoom(e.target);
        }
    });
    
    // 双击重置缩放
    document.addEventListener('dblclick', function(e) {
        if (e.target.id === 'viewer-image') {
            resetImageZoom(e.target);
        }
    });
});

function toggleImageZoom(imgElement) {
    if (imgElement.classList.contains('zoomed')) {
        // 缩小
        imgElement.classList.remove('zoomed');
        imgElement.style.cursor = 'zoom-in';
    } else {
        // 放大
        imgElement.classList.add('zoomed');
        imgElement.style.cursor = 'zoom-out';
    }
}

function resetImageZoom(imgElement) {
    imgElement.classList.remove('zoomed');
    imgElement.style.cursor = 'zoom-in';
    imgElement.style.transform = 'scale(1)';
}