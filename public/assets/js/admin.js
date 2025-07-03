// admin.js - 现代化管理后台功能

// 全局变量
let currentTab = 'articles';
let articlesData = [];
let imagesData = [];
let currentPage = { articles: 1, images: 1 };
let pageSize = 9;
let searchQuery = { articles: '', images: '' };
let selectedFiles = [];
let editingItem = null;
let removedCoverImage = false; // 标记是否删除了封面图片

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

// 智能文本截断函数
function truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    
    // 移除HTML标签
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    
    if (cleanText.length <= maxLength) return cleanText;
    
    // 在单词边界截断
    let truncated = cleanText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
        truncated = truncated.substring(0, lastSpace);
    }
    
    return truncated + '...';
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('管理后台初始化开始...');
    
    // 检查是否已登录
    if (!localStorage.getItem('authToken')) {
        showNotification('请先登录', false);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    // 绑定退出按钮 - 添加空值检查
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    }

    // 初始化模态框关闭事件
    setupModalEvents();

    // 加载内容
    console.log('开始加载内容...');
    loadAllContent();
});

// 设置模态框事件
function setupModalEvents() {
    // 点击模态框外部关闭
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id.replace('-modal', ''));
        }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="display: block"]');
            if (openModal) {
                closeModal(openModal.id.replace('-modal', ''));
            }
        }
    });
}

// 加载所有内容
async function loadAllContent() {
    try {
        console.log('开始加载内容...');
        
        // 并行加载文章和图片数据
        const [articlesResult, imagesResult] = await Promise.allSettled([
            loadArticles(),
            loadImages()
        ]);
        
        // 处理文章数据
        if (articlesResult.status === 'fulfilled') {
            articlesData = articlesResult.value || [];
        } else {
            console.error('加载文章失败:', articlesResult.reason);
            articlesData = [];
        }
        
        // 处理图片数据
        if (imagesResult.status === 'fulfilled') {
            imagesData = imagesResult.value || [];
        } else {
            console.error('加载图片失败:', imagesResult.reason);
            imagesData = [];
        }
        
        // 更新统计信息
        updateStats();
        
        // 渲染当前标签页内容
        renderCurrentTab();
        
        console.log(`内容加载完成: ${articlesData.length} 篇文章, ${imagesData.length} 张图片`);
        
    } catch (error) {
        console.error('加载内容失败:', error);
        showNotification('加载内容失败: ' + error.message, false);
        showEmptyState();
    }
}

// 加载文章数据
async function loadArticles() {
    try {
        const response = await fetch(`${API_BASE}/content`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.articles || [];
    } catch (error) {
        console.error('加载文章失败:', error);
        throw error;
    }
}

// 加载图片数据
async function loadImages() {
    try {
        console.log('Loading images from API...');
        const response = await fetch(`${API_BASE}/images`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Images API response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Images loaded from API:', result);
        return result.images || [];
    } catch (error) {
        console.error('加载图片失败:', error);
        throw error;
    }
}

// 更新统计信息
function updateStats() {
    const articlesCountEl = document.getElementById('articles-count');
    const imagesCountEl = document.getElementById('images-count');
    const articlesStats = document.getElementById('articles-stats');
    const imagesStats = document.getElementById('images-stats');
    
    if (articlesCountEl) articlesCountEl.textContent = articlesData.length;
    if (imagesCountEl) imagesCountEl.textContent = imagesData.length;
    
    // 更新详细统计
    if (articlesStats && imagesStats) {
        const filteredArticles = getFilteredData('articles');
        const filteredImages = getFilteredData('images');
        
        articlesStats.textContent = `共 ${articlesData.length} 篇文章${filteredArticles.length !== articlesData.length ? ` (筛选后 ${filteredArticles.length} 篇)` : ''}`;
        imagesStats.textContent = `共 ${imagesData.length} 张图片${filteredImages.length !== imagesData.length ? ` (筛选后 ${filteredImages.length} 张)` : ''}`;
    }
}

// 切换标签页
function switchTab(tab) {
    currentTab = tab;
    
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabBtn = document.getElementById(`${tab}-tab-btn`);
    if (tabBtn) tabBtn.classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const tabContent = document.getElementById(`${tab}-tab`);
    if (tabContent) tabContent.classList.add('active');

// 渲染内容
    renderCurrentTab();
}

// 渲染当前标签页内容
function renderCurrentTab() {
    if (currentTab === 'articles') {
        renderArticles();
    } else if (currentTab === 'images') {
        renderImages();
    }
}

// 获取筛选后的数据
function getFilteredData(type) {
    const data = type === 'articles' ? articlesData : imagesData;
    const query = searchQuery[type].toLowerCase();
    
    if (!query) return data;
    
    return data.filter(item => {
        return item.title.toLowerCase().includes(query) ||
               (item.category && item.category.toLowerCase().includes(query)) ||
               (item.content && item.content.toLowerCase().includes(query));
    });
}

// 获取分页数据
function getPaginatedData(type) {
    const filteredData = getFilteredData(type);
    const page = currentPage[type];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
        data: filteredData.slice(start, end),
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / pageSize),
        currentPage: page
    };
}

// 渲染文章列表
function renderArticles() {
    const container = document.getElementById('articles-container');
    const paginationContainer = document.getElementById('articles-pagination');
    
    if (!container) {
        console.error('articles-container not found');
        return;
    }
    
    const paginatedData = getPaginatedData('articles');
    
    if (paginatedData.data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>暂无文章</h3>
                <p>点击"新建文章"按钮创建您的第一篇文章</p>
                </div>
            `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    // 渲染文章卡片
    container.innerHTML = paginatedData.data.map(article => `
        <div class="content-card">
            <div class="card-header">
                <h4 class="card-title">${escapeHtml(article.title)}</h4>
            </div>
            <div class="card-meta">
                ${article.category ? `<span>${escapeHtml(article.category)}</span> • ` : ''}
                <span>${formatDate(article.createdAt)}</span>
            </div>
            ${(article.coverImage?.url || article.imageUrl) ? `<img src="${decodeHtmlEntities(article.coverImage?.url || article.imageUrl)}" alt="${escapeHtml(article.title)}" class="card-image" onerror="this.style.display='none'">` : ''}
            <div class="card-content">${truncateText(escapeHtml(article.content || ''), 120)}</div>
            <div class="card-actions">
                <button class="btn-modern btn-primary btn-small" onclick="editArticle('${article.id}')">
                    编辑
                </button>
                <button class="btn-modern btn-danger btn-small" onclick="deleteArticle('${article.id}')">
                    删除
                </button>
            </div>
        </div>
    `).join('');
    
    // 渲染分页
    renderPagination('articles', paginatedData);
}

// 渲染图片列表
function renderImages() {
    const container = document.getElementById('images-container');
    const paginationContainer = document.getElementById('images-pagination');
    
    if (!container) {
        console.error('images-container not found');
        return;
    }
    
    const paginatedData = getPaginatedData('images');
    
    if (paginatedData.data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🖼️</div>
                <h3>暂无图片</h3>
                <p>点击"上传图片"按钮上传您的第一张图片</p>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    // 渲染相册卡片
    container.innerHTML = paginatedData.data.map(album => `
        <div class="content-card">
            <img src="${decodeHtmlEntities(album.coverImage.url)}" alt="${escapeHtml(album.title)}" class="card-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik04NyA2NUw5MyA3MUwxMDcgNTdMMTIzIDczTDEzNyA1OUwxNTMgNzVMMTY3IDYxTDE4MyA3N0wxOTcgNjNWMTM3SDE3VjEzN0g5N1YxMzdIMTdWNjNMMzMgNzdMNDcgNjNMNjMgNzlMNzcgNjVMODcgNjVaIiBmaWxsPSIjREREREREIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjQwIiByPSIxNSIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
            <div class="card-header">
                <h4 class="card-title">${escapeHtml(album.title)}</h4>
                ${album.imageCount > 1 ? `<span class="image-count">${album.imageCount} 张图片</span>` : ''}
            </div>
            <div class="card-meta">
                ${album.category ? `<span>${escapeHtml(album.category)}</span> • ` : ''}
                <span>${formatDate(album.createdAt)}</span>
            </div>
            ${album.description ? `<div class="card-content">${truncateText(escapeHtml(album.description), 80)}</div>` : ''}
            <div class="card-actions">
                <button class="btn-modern btn-primary btn-small" onclick="viewAlbum('${album.id}')">
                    ${album.imageCount > 1 ? '查看相册' : '查看图片'}
                </button>
                <button class="btn-modern btn-secondary btn-small" onclick="editAlbum('${album.id}')">
                    编辑
                </button>
                <button class="btn-modern btn-danger btn-small" onclick="deleteAlbum('${album.id}')">
                    删除
                </button>
            </div>
        </div>
    `).join('');
    
    // 渲染分页
    renderPagination('images', paginatedData);
}

// 渲染分页组件
function renderPagination(type, paginatedData) {
    const container = document.getElementById(`${type}-pagination`);
    if (!container) return;
    
    const { totalPages, currentPage: page, total } = paginatedData;
    
    if (totalPages <= 1) {
    container.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页按钮
    paginationHTML += `
        <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} onclick="changePage('${type}', ${page - 1})">
            ← 上一页
        </button>
    `;
    
    // 页码按钮
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="changePage('${type}', 1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-info">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === page ? 'active' : ''}" onclick="changePage('${type}', ${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-info">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="changePage('${type}', ${totalPages})">${totalPages}</button>`;
    }
    
    // 下一页按钮
    paginationHTML += `
        <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} onclick="changePage('${type}', ${page + 1})">
            下一页 →
        </button>
    `;
    
    // 页面信息
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    paginationHTML += `<span class="pagination-info">第 ${start}-${end} 项，共 ${total} 项</span>`;
    
    container.innerHTML = paginationHTML;
}

// 切换页面
function changePage(type, page) {
    currentPage[type] = page;
    renderCurrentTab();
}

// 搜索内容
function searchContent(type) {
    const searchInput = document.getElementById(`${type}-search`);
    searchQuery[type] = searchInput.value;
    currentPage[type] = 1;
    updateStats();
    renderCurrentTab();
}

// 显示空状态
function showEmptyState() {
    document.getElementById('articles-container').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>暂无内容</h3>
            <p>开始创建您的第一篇文章或上传图片</p>
        </div>
    `;
    document.getElementById('images-container').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🖼️</div>
            <h3>暂无图片</h3>
            <p>点击上传按钮添加图片</p>
                </div>
            `;
}

// 打开模态框
function openModal(type) {
    const modal = document.getElementById(`${type}-modal`);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // 重置表单
    if (type === 'article') {
        resetArticleForm();
    } else if (type === 'image') {
        resetImageForm();
    }
}

// 关闭模态框
function closeModal(type) {
    const modal = document.getElementById(`${type}-modal`);
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // 清理编辑状态
    editingItem = null;
    removedCoverImage = false; // 重置封面图片删除标记
    
    // 重置表单
    if (type === 'article') {
        resetArticleForm();
    } else if (type === 'image') {
        resetImageForm();
    }
}

// 重置文章表单
function resetArticleForm() {
    document.getElementById('article-form').reset();
    document.getElementById('article-modal-title').textContent = editingItem ? '编辑文章' : '新建文章';
    document.getElementById('save-article-btn').textContent = editingItem ? '保存修改' : '保存文章';
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-image-preview').innerHTML = '';
    removedCoverImage = false; // 重置封面图片删除标记
}

// 重置图片表单
function resetImageForm() {
    document.getElementById('image-form').reset();
    document.getElementById('image-title').value = '';
    document.getElementById('image-category').value = '';
    document.getElementById('image-description').value = '';
    document.getElementById('images-preview-container').style.display = 'none';
    document.getElementById('images-preview-container').innerHTML = '';
    document.getElementById('save-images-btn').disabled = true;
    document.getElementById('save-images-btn').textContent = '上传并保存';
    document.getElementById('upload-progress').style.display = 'none';
    selectedFiles = [];
}

// 处理文章封面图片选择
function handleArticleImageSelect(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('article-image-preview');

    if (!file) {
        previewContainer.style.display = 'none';
        return;
    }
    
    // 验证文件
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
        showNotification('不支持的图片格式，请选择 JPG、PNG、GIF 或 WebP 格式', false);
        event.target.value = '';
        return;
    }
    
    if (file.size > maxSize) {
        showNotification('图片大小不能超过 5MB', false);
        event.target.value = '';
        return;
    }
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = function(e) {
        previewContainer.innerHTML = `
            <div class="preview-item">
                <img src="${e.target.result}" alt="预览" class="preview-image">
                <button type="button" class="preview-remove" onclick="removeArticleImage()">×</button>
            </div>
        `;
        previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 移除文章封面图片
function removeArticleImage() {
    document.getElementById('article-image-file').value = '';
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-image-preview').innerHTML = '';
    
    // 标记删除了封面图片
    removedCoverImage = true;
}

// 处理多文件选择
function handleMultipleFileSelect(event) {
    const files = Array.from(event.target.files);
    processSelectedFiles(files);
}

// 处理拖拽上传
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    processSelectedFiles(files);
    
    // 更新文件输入框
    const fileInput = document.getElementById('image-files');
    fileInput.files = event.dataTransfer.files;
}

// 处理选择的文件
function processSelectedFiles(files) {
    const previewContainer = document.getElementById('images-preview-container');
    const saveButton = document.getElementById('save-images-btn');
    
    // 清空之前的预览
    previewContainer.innerHTML = '';
    selectedFiles = [];
    
    if (files.length === 0) {
        previewContainer.style.display = 'none';
        saveButton.disabled = true;
        return;
    }
    
    // 验证文件
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    files.forEach((file, index) => {
        if (!allowedTypes.includes(file.type)) {
            showNotification(`文件 "${file.name}" 格式不支持`, false);
            return;
        }
        
        if (file.size > maxSize) {
            showNotification(`文件 "${file.name}" 大小超过 5MB 限制`, false);
            return;
        }
        
        selectedFiles.push(file);
        
        // 创建预览
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="预览" class="preview-image">
                <button type="button" class="preview-remove" onclick="removeSelectedFile(${selectedFiles.length - 1})">×</button>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; padding: 8px 6px 4px; font-size: 0.7rem; line-height: 1.2;">
                    <div style="font-weight: 500; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
                    <div style="opacity: 0.9;">${(file.size/1024/1024).toFixed(1)}MB</div>
                </div>
            `;
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
    
    // 更新界面状态
    if (selectedFiles.length > 0) {
        previewContainer.style.display = 'grid';
        saveButton.disabled = false;
        saveButton.textContent = `上传并保存 ${selectedFiles.length} 张图片`;
    } else {
        previewContainer.style.display = 'none';
        saveButton.disabled = true;
        saveButton.textContent = '上传并保存';
    }
}

// 移除选中的文件
function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    
    // 重新处理文件列表
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    document.getElementById('image-files').files = dt.files;
    
    processSelectedFiles(selectedFiles);
}

// 保存文章
async function saveArticle() {
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value.trim();
    const content = document.getElementById('article-content').value.trim();
    const imageFile = document.getElementById('article-image-file').files[0];

    if (!title) {
        showNotification('请输入文章标题', false);
        return;
    }
    
    if (!content) {
        showNotification('请输入文章内容', false);
        return;
    }
    
    const saveBtn = document.getElementById('save-article-btn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';
    
    try {
        let imageUrl = '';
        
        // 如果有选择封面图片，先上传
        let uploadResult = null;
        if (imageFile) {
            showNotification('正在上传封面图片...', true);
            uploadResult = await uploadImageToCloudflare(imageFile);
        }
        
        // 如果是编辑模式且没有上传新图片，保留原有封面图片
        let coverImage = null;
        if (uploadResult) {
            // 有新上传的图片 - 包含完整的图片元数据
            coverImage = {
                url: uploadResult.url,
                fileName: uploadResult.fileName,
                title: imageFile.name.replace(/\.[^/.]+$/, ''),
                alt: title,
                caption: '',
                size: imageFile.size,
                type: imageFile.type
            };
        } else if (editingItem && !removedCoverImage) {
            // 编辑模式，且没有删除封面图片，保留原有封面图片
            coverImage = editingItem.coverImage || (editingItem.imageUrl ? {
                url: editingItem.imageUrl,
                fileName: '',
                title: title,
                alt: title,
                caption: '',
                size: 0,
                type: 'image/jpeg'
            } : null);
        } else if (editingItem && removedCoverImage) {
            // 编辑模式，且删除了封面图片，明确设置为null
            coverImage = null;
        }
        
        const articleData = {
            id: editingItem ? editingItem.id : `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title,
            content,
            summary: content.substring(0, 200), // 自动生成摘要
            category: category || '',
            tags: [], // 暂时为空，可以后续添加标签功能
            
            // 封面图片 - 明确传递coverImage，即使是null
            coverImage: coverImage,
            
            // 文章中的图片集合（暂时为空）
            images: [],
            
            // 附件（暂时为空）
            attachments: [],
            
            // 元数据
            author: 'Admin',
            status: 'published',
            visibility: 'public',
            
            // 时间戳
            createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            
            // SEO信息
            seo: {
                metaTitle: title,
                metaDescription: content.substring(0, 160),
                keywords: [],
                slug: title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim('-')
            },
            
            // 统计信息
            stats: {
                views: editingItem ? (editingItem.stats?.views || 0) : 0,
                likes: editingItem ? (editingItem.stats?.likes || 0) : 0,
                comments: 0,
                shares: 0
            }
        };
        
        // 保存到服务器 - 使用新的单篇文章API
        if (editingItem) {
            // 更新现有文章
            await saveArticleData(articleData.id, articleData);
            // 更新本地数据
            const index = articlesData.findIndex(item => item.id === editingItem.id);
            if (index !== -1) {
                articlesData[index] = articleData;
            }
        } else {
            // 创建新文章
            await saveArticleData(null, articleData);
            // 添加到本地数据
            articlesData.unshift(articleData);
        }
        
        showNotification(`文章${editingItem ? '更新' : '创建'}成功！`, true);
        closeModal('article');
        updateStats();
        renderCurrentTab();
        
    } catch (error) {
        console.error('保存文章失败:', error);
        showNotification('保存失败: ' + error.message, false);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// 保存图片（创建相册）
async function saveImages() {
    const title = document.getElementById('image-title').value.trim();
    const category = document.getElementById('image-category').value.trim();
    const description = document.getElementById('image-description').value.trim();
    
    if (selectedFiles.length === 0) {
        showNotification('请选择要上传的图片文件', false);
        return;
    }

    const saveBtn = document.getElementById('save-images-btn');
    const progressContainer = document.getElementById('upload-progress');
    const progressList = document.getElementById('upload-progress-list');
    const progressSummary = document.getElementById('upload-summary');
    
    saveBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressList.innerHTML = '';
    progressSummary.innerHTML = '';
    
    let successCount = 0;
    let errorCount = 0;
    const uploadedImages = [];
    
    try {
        // 先上传所有图片
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const progressItem = document.createElement('div');
            progressItem.style.cssText = 'margin-bottom: 10px; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e9ecef;';
            progressItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: 500;">${file.name}</span>
                    <span id="status-${i}" style="color: #6c757d;">准备上传...</span>
                </div>
                <div style="background: #e9ecef; border-radius: 10px; height: 6px; overflow: hidden;">
                    <div id="progress-${i}" style="background: #667eea; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
            `;
            progressList.appendChild(progressItem);
            
            try {
                // 更新状态
                document.getElementById(`status-${i}`).textContent = '上传中...';
                document.getElementById(`status-${i}`).style.color = '#667eea';
                document.getElementById(`progress-${i}`).style.width = '50%';
                
                // 上传图片
                const uploadResult = await uploadImageToCloudflare(file);
                
                // 添加到上传成功列表
                uploadedImages.push({
                    url: uploadResult.url,
                    fileName: uploadResult.fileName,
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    size: file.size,
                    type: file.type
                });
                
                // 更新进度
                document.getElementById(`progress-${i}`).style.width = '100%';
                document.getElementById(`status-${i}`).textContent = '上传成功';
                document.getElementById(`status-${i}`).style.color = '#28a745';
                
                successCount++;
                
            } catch (error) {
                console.error(`上传文件 ${file.name} 失败:`, error);
                document.getElementById(`status-${i}`).textContent = '上传失败';
                document.getElementById(`status-${i}`).style.color = '#dc3545';
                errorCount++;
            }
        }
        
        // 如果有成功上传的图片，创建相册
        if (uploadedImages.length > 0) {
            try {
                const albumData = {
                    title: title || '未命名相册',
                    description: description,
                    category: category || '默认分类',
                    tags: [],
                    images: uploadedImages
                };
                
                console.log('Creating album with data:', albumData);
                
                const response = await fetch(`${API_BASE}/images`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(albumData)
                });
                
                console.log('Album creation response status:', response.status);
                
                if (!response.ok) {
                    const error = await response.text();
                    console.error('Album creation failed:', error);
                    throw new Error(`创建相册失败: ${error}`);
                }
                
                const result = await response.json();
                console.log('Album created successfully:', result);
                
                // 添加到本地数据
                imagesData.unshift(result.album);
                
                // 更新摘要
                progressSummary.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 10px;">相册创建完成</div>
                    <div style="color: #28a745;">成功: ${successCount} 个文件</div>
                    ${errorCount > 0 ? `<div style="color: #dc3545;">失败: ${errorCount} 个文件</div>` : ''}
                    <div style="color: #667eea; margin-top: 10px;">相册名称: ${result.album.title}</div>
                `;
                
                showNotification(`成功创建相册，包含 ${successCount} 张图片！`, true);
                setTimeout(() => {
                    closeModal('image');
                    updateStats();
                    renderCurrentTab();
                }, 2000);
                
            } catch (error) {
                console.error('创建相册失败:', error);
                showNotification('图片上传成功，但创建相册失败: ' + error.message, false);
            }
        } else {
            showNotification('所有文件上传失败', false);
        }
        
    } catch (error) {
        console.error('批量上传失败:', error);
        showNotification('上传过程中发生错误: ' + error.message, false);
    } finally {
        saveBtn.disabled = false;
    }
}

// 上传图片到Cloudflare
async function uploadImageToCloudflare(file) {
    console.log('开始上传图片到Cloudflare:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        apiUrl: `${API_BASE}/upload`
    });
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
    });
    
    console.log('上传响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
        const error = await response.text();
        console.error('上传失败，响应内容:', error);
        throw new Error(`上传失败: ${error}`);
    }
    
    const result = await response.json();
    console.log('上传成功，返回结果:', result);
    return {
        url: result.url,
        fileName: result.fileName
    };
}

// 保存单篇文章数据
async function saveArticleData(articleId, articleData) {
    const url = articleId ? `${API_BASE}/content/${articleId}` : `${API_BASE}/content`;
    const method = articleId ? 'PUT' : 'POST';
    
    // 添加调试信息
    console.log('发送数据到API:', {
        url,
        method,
        articleData: JSON.stringify(articleData, null, 2)
    });
    
    const response = await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(articleData)
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error('API响应错误:', error);
        throw new Error(`保存失败: ${error}`);
    }
    
    return await response.json();
}

// 删除单篇文章数据
async function deleteArticleData(articleId) {
    const response = await fetch(`${API_BASE}/content/${articleId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`删除失败: ${error}`);
    }
    
    return await response.json();
}

// 编辑文章
async function editArticle(id) {
    const article = articlesData.find(item => item.id === id);
    if (!article) {
        showNotification('文章不存在', false);
        return;
    }
    
    editingItem = article;
    
    // 填充表单
    document.getElementById('article-title').value = article.title || '';
    document.getElementById('article-category').value = article.category || '';
    document.getElementById('article-content').value = decodeContentImages(article.content || '');
    
    // 如果有封面图片，显示预览（支持新旧格式）
    const coverImageUrl = article.coverImage ? article.coverImage.url : article.imageUrl;
    if (coverImageUrl) {
        const previewContainer = document.getElementById('article-image-preview');
        previewContainer.innerHTML = `
            <div class="preview-item">
                <img src="${decodeHtmlEntities(coverImageUrl)}" alt="当前封面" class="preview-image">
                <button type="button" class="preview-remove" onclick="removeArticleImage()">×</button>
            </div>
        `;
        previewContainer.style.display = 'block';
    }
    
    openModal('article');
}

// 删除文章
async function deleteArticle(id) {
    if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const index = articlesData.findIndex(item => item.id === id);
        if (index === -1) {
            showNotification('文章不存在', false);
            return;
        }
        
        // 调用删除API
        await deleteArticleData(id);
        
        // 从本地数据中移除
        articlesData.splice(index, 1);
        
        showNotification('文章删除成功', true);
        updateStats();
        renderCurrentTab();
        
    } catch (error) {
        console.error('删除文章失败:', error);
        showNotification('删除失败: ' + error.message, false);
    }
}

// 删除相册
async function deleteAlbum(id) {
    const album = imagesData.find(item => item.id === id);
    const itemName = album ? (album.imageCount > 1 ? '相册' : '图片') : '项目';
    
    if (!confirm(`确定要删除这个${itemName}吗？此操作不可恢复。`)) {
        return;
    }
    
    try {
        const index = imagesData.findIndex(item => item.id === id);
        if (index === -1) {
            showNotification(`${itemName}不存在`, false);
            return;
        }
        
        // 调用删除API
        const response = await fetch(`${API_BASE}/images/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`删除失败: ${error}`);
        }
        
        // 从本地数据中移除
        imagesData.splice(index, 1);
        
        showNotification(`${itemName}删除成功`, true);
        updateStats();
        renderCurrentTab();
        
    } catch (error) {
        console.error(`删除${itemName}失败:`, error);
        showNotification('删除失败: ' + error.message, false);
    }
}

// 同步R2图片
async function syncImagesFromR2() {
    const syncBtn = document.getElementById('sync-images-btn');
    if (!syncBtn) return;
    
    try {
        syncBtn.disabled = true;
        syncBtn.textContent = '同步中...';
        
        const response = await fetch(`${API_BASE}/images/sync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`同步失败: ${error}`);
        }
        
        const result = await response.json();
        showNotification(`同步成功，共同步了 ${result.total} 张图片`, true);
        
        // 重新加载图片数据
        await loadImages().then(images => {
            imagesData = images;
            updateStats();
            renderCurrentTab();
        });
        
    } catch (error) {
        console.error('同步R2图片失败:', error);
        showNotification('同步失败: ' + error.message, false);
    } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = '同步R2图片';
    }
}

// 查看相册
function viewAlbum(id) {
    const album = imagesData.find(item => item.id === id);
    if (!album) {
        showNotification('相册不存在', false);
        return;
    }
    
    if (album.imageCount === 1) {
        // 单图直接打开
        viewImage(album.coverImage.url);
    } else {
        // 多图显示相册弹窗
        showAlbumModal(album);
    }
}

// 查看图片
function viewImage(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// 编辑相册
function editAlbum(id) {
    const album = imagesData.find(item => item.id === id);
    if (!album) {
        showNotification('相册不存在', false);
        return;
    }
    
    showEditAlbumModal(album);
}

// 显示相册弹窗
function showAlbumModal(album) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content album-modal">
            <div class="modal-header">
                <h3>${escapeHtml(album.title)}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="album-info">
                    <p><strong>分类:</strong> ${escapeHtml(album.category)}</p>
                    <p><strong>描述:</strong> ${escapeHtml(album.description || '无描述')}</p>
                    <p><strong>创建时间:</strong> ${formatDate(album.createdAt)}</p>
                    <p><strong>图片数量:</strong> ${album.imageCount} 张</p>
                </div>
                <div class="album-images">
                    ${album.images.map(img => `
                        <div class="album-image-item">
                            <img src="${decodeHtmlEntities(img.url)}" alt="${escapeHtml(img.title)}" onclick="viewImage('${decodeHtmlEntities(img.url)}')">
                            <p>${escapeHtml(img.title)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 显示编辑相册弹窗
function showEditAlbumModal(album) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content edit-album-modal">
            <div class="modal-header">
                <h3>编辑相册</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editAlbumForm">
                    <div class="form-group">
                        <label for="albumTitle">标题</label>
                        <input type="text" id="albumTitle" name="title" value="${escapeHtml(album.title)}" required>
                    </div>
                    <div class="form-group">
                        <label for="albumDescription">描述</label>
                        <textarea id="albumDescription" name="description" rows="3">${escapeHtml(album.description || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="albumCategory">分类</label>
                        <input type="text" id="albumCategory" name="category" value="${escapeHtml(album.category)}" required>
                    </div>
                    <div class="form-group">
                        <label for="albumTags">标签 (用逗号分隔)</label>
                        <input type="text" id="albumTags" name="tags" value="${album.tags.join(', ')}" placeholder="风景, 旅行, 自然">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-modern btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                        <button type="submit" class="btn-modern btn-primary">保存</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 处理表单提交
    const form = modal.querySelector('#editAlbumForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const updateData = {
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag)
        };
        
        try {
            const response = await fetch(`${API_BASE}/images/${album.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`更新失败: ${error}`);
            }
            
            const result = await response.json();
            
            // 更新本地数据
            const index = imagesData.findIndex(item => item.id === album.id);
            if (index !== -1) {
                imagesData[index] = result.album;
            }
            
            showNotification('相册更新成功', true);
            renderCurrentTab();
            modal.remove();
            
        } catch (error) {
            console.error('更新相册失败:', error);
            showNotification('更新失败: ' + error.message, false);
        }
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    showNotification('已退出登录', true);
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// 工具函数
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    if (notification) {
    notification.textContent = message;
        notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
        notification.style.display = 'block';

    setTimeout(() => {
            notification.style.display = 'none';
    }, 3000);
}
}
