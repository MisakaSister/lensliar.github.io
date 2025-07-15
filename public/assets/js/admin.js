// 管理后台主文件

// 管理器实例
let articleManager;
let albumManager;
let quillEditor;

// 界面状态
let currentTab = 'articles';
let currentPage = { articles: 1, images: 1 };
let searchQuery = { articles: '', images: '' };
let editingItem = null;
let removedCoverImage = false;
let selectedFiles = [];
const pageSize = 10;

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    
    // 检查登录状态
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // 初始化管理器
    articleManager = new ArticleManager(API_BASE);
    albumManager = new AlbumManager(API_BASE);
    
    // 设置事件监听
    setupEventListeners();
    
    // 尝试加载数据以验证token有效性
    try {
        await loadAllContent();
        
        // 初始化界面
        switchTab('articles');
    } catch (error) {
        console.error('初始化失败:', error);
        // 如果加载失败，可能是token无效，让用户重新登录
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
            return;
        }
        showNotification('加载数据失败，请稍后重试', 'error');
    }
    
    // 添加全局错误处理
    window.addEventListener('unhandledrejection', function(event) {
        console.error('未处理的Promise错误:', event.reason);
        if (event.reason && event.reason.message && event.reason.message.includes('401')) {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        }
    });
    
    // 初始化富文本编辑器
    initQuillEditor();
    
    // 隐藏加载动画
    hideLoadingAnimation();
});

// 初始化富文本编辑器
function initQuillEditor() {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // 格式化
        ['blockquote', 'code-block'],                     // 引用和代码块
        
        [{ 'header': 1 }, { 'header': 2 }],              // 标题
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],    // 列表
        [{ 'script': 'sub'}, { 'script': 'super' }],     // 上下标
        [{ 'indent': '-1'}, { 'indent': '+1' }],         // 缩进
        [{ 'direction': 'rtl' }],                         // 文本方向
        
        [{ 'size': ['small', false, 'large', 'huge'] }], // 字体大小
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],       // 标题
        
        [{ 'color': [] }, { 'background': [] }],          // 颜色
        [{ 'font': [] }],                                 // 字体
        [{ 'align': [] }],                                // 对齐
        
        ['link', 'image', 'video'],                       // 链接和媒体
        ['clean']                                         // 清除格式
    ];
    
    quillEditor = new Quill('#article-content-editor', {
        theme: 'snow',
        modules: {
            toolbar: toolbarOptions
        },
        placeholder: '请输入文章内容...',
        formats: [
            'bold', 'italic', 'underline', 'strike',
            'blockquote', 'code-block',
            'header', 'list', 'script', 'indent', 'direction',
            'size', 'color', 'background', 'font', 'align',
            'link', 'image', 'video'
        ]
    });
    
    // 当编辑器内容改变时，更新隐藏的textarea
    quillEditor.on('text-change', function() {
        const content = quillEditor.root.innerHTML;
        document.getElementById('article-content').value = content;
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 标签切换
    document.getElementById('articles-tab-btn').addEventListener('click', () => switchTab('articles'));
    document.getElementById('images-tab-btn').addEventListener('click', () => switchTab('images'));
    
    // 搜索
    document.getElementById('articles-search').addEventListener('input', (e) => {
        searchQuery.articles = e.target.value;
        currentPage.articles = 1;
        renderArticles();
    });
    
    document.getElementById('images-search').addEventListener('input', (e) => {
        searchQuery.images = e.target.value;
        currentPage.images = 1;
        renderImages();
    });
    
    // 模态框
    document.getElementById('article-modal').addEventListener('click', (e) => {
        if (e.target.id === 'article-modal') {
            closeModal('article');
        }
    });
    
    document.getElementById('image-modal').addEventListener('click', (e) => {
        if (e.target.id === 'image-modal') {
            closeModal('image');
        }
    });
    
    // 文件选择
    document.getElementById('article-image-file').addEventListener('change', handleArticleImageSelect);
    // image-files 已在HTML中使用内联事件处理器，无需重复绑定
}

// 加载所有内容
async function loadAllContent() {
    try {

        
        // 并行加载文章和相册数据
        const [articles, albums] = await Promise.allSettled([
            articleManager.loadArticles(),
            albumManager.loadAlbums()
        ]);
        
        if (articles.status === 'rejected') {

            showNotification('加载文章失败: ' + articles.reason.message, false);
        }
        
        if (albums.status === 'rejected') {

            showNotification('加载相册失败: ' + albums.reason.message, false);
        }
        
        // 更新统计信息
        updateStats();
        

        
    } catch (error) {

        showNotification('加载内容失败: ' + error.message, false);
    }
}

// 更新统计信息
function updateStats() {
    const articleStats = articleManager.getStats();
    const albumStats = albumManager.getStats();
    
    // 更新计数器
    const articlesCountEl = document.getElementById('articles-count');
    const imagesCountEl = document.getElementById('images-count');
    
    if (articlesCountEl) articlesCountEl.textContent = articleStats.totalArticles;
    if (imagesCountEl) imagesCountEl.textContent = albumStats.totalAlbums;
    
    // 更新详细统计
    const articlesStatsEl = document.getElementById('articles-stats');
    const imagesStatsEl = document.getElementById('images-stats');
    
    if (articlesStatsEl) {
        articlesStatsEl.textContent = `共 ${articleStats.totalArticles} 篇文章`;
    }
    
    if (imagesStatsEl) {
        imagesStatsEl.textContent = `共 ${albumStats.totalAlbums} 个相册`;
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

// 渲染文章列表
function renderArticles() {
    const container = document.getElementById('articles-container');
    const paginationContainer = document.getElementById('articles-pagination');
    
    if (!container) return;
    
    // 获取筛选后的数据
    const filteredArticles = articleManager.searchArticles(searchQuery.articles);
    
    // 分页
    const start = (currentPage.articles - 1) * pageSize;
    const end = start + pageSize;
    const paginatedArticles = filteredArticles.slice(start, end);
    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    
    if (paginatedArticles.length === 0) {
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
    container.innerHTML = paginatedArticles.map(article => `
        <div class="content-card">
            <div class="card-header">
                <h4 class="card-title">${escapeHtml(article.title)}</h4>
            </div>
            <div class="card-meta">
                ${article.category ? `<span>${escapeHtml(article.category)}</span> • ` : ''}
                <span>${formatDate(article.createdAt)}</span>
            </div>
            ${article.coverImage?.url ? `<img src="${article.coverImage.url}" alt="${escapeHtml(article.title)}" class="card-image" onerror="this.style.display='none'">` : ''}
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
    renderPagination('articles', totalPages);
}

// 渲染相册列表
function renderImages() {
    const container = document.getElementById('images-container');
    const paginationContainer = document.getElementById('images-pagination');
    
    if (!container) return;
    
    // 获取筛选后的数据
    const filteredAlbums = albumManager.searchAlbums(searchQuery.images);
    
    // 分页
    const start = (currentPage.images - 1) * pageSize;
    const end = start + pageSize;
    const paginatedAlbums = filteredAlbums.slice(start, end);
    const totalPages = Math.ceil(filteredAlbums.length / pageSize);
    
    if (paginatedAlbums.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🖼️</div>
                <h3>暂无相册</h3>
                <p>点击"创建相册"按钮创建您的第一个相册</p>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    // 渲染相册卡片

    
    container.innerHTML = paginatedAlbums.map((album, index) => {

        
        const coverImageUrl = album.coverImage?.url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik04NyA2NUw5MyA3MUwxMDcgNTdMMTIzIDczTDEzNyA1OUwxNTMgNzVMMTY3IDYxTDE4MyA3N0wxOTcgNjNWMTM3SDE3VjEzN0g5N1YxMzdIMTdWNjNMMzMgNzdMNDcgNjNMNjMgNzlMNzcgNjVMODcgNjVaIiBmaWxsPSIjREREREREIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjQwIiByPSIxNSIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K';
        
        return `
            <div class="content-card">
                <img src="${coverImageUrl}" alt="${escapeHtml(album.title || '未命名相册')}" class="card-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik04NyA2NUw5MyA3MUwxMDcgNTdMMTIzIDczTDEzNyA1OUwxNTMgNzVMMTY3IDYxTDE4MyA3N0wxOTcgNjNWMTM3SDE3VjEzN0g5N1YxMzdIMTdWNjNMMzMgNzdMNDcgNjNMNjMgNzlMNzcgNjVMODcgNjVaIiBmaWxsPSIjREREREREIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjQwIiByPSIxNSIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                <div class="card-header">
                    <h4 class="card-title">${escapeHtml(album.title || '未命名相册')}</h4>
                    ${(album.imageCount || 0) > 1 ? `<span class="image-count">${album.imageCount || 0} 张图片</span>` : ''}
                </div>
                <div class="card-meta">
                    ${album.category ? `<span>${escapeHtml(album.category)}</span> • ` : ''}
                    <span>${formatDate(album.createdAt)}</span>
                </div>
                ${album.description ? `<div class="card-content">${truncateText(escapeHtml(album.description), 80)}</div>` : ''}
                <div class="card-actions">
                    <button class="btn-modern btn-primary btn-small" onclick="viewAlbum('${album.id}')">
                        ${(album.imageCount || 0) > 1 ? '查看相册' : '查看图片'}
                    </button>
                    <button class="btn-modern btn-secondary btn-small" onclick="editAlbum('${album.id}')">
                        编辑
                    </button>
                    <button class="btn-modern btn-danger btn-small" onclick="deleteAlbum('${album.id}')">
                        删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
    

    
    // 渲染分页
    renderPagination('images', totalPages);
}

// 渲染分页
function renderPagination(type, totalPages) {
    const container = document.getElementById(`${type}-pagination`);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    const current = currentPage[type];
    let html = '<div class="pagination">';
    
    // 上一页
    if (current > 1) {
        html += `<button class="btn-modern btn-small" onclick="changePage('${type}', ${current - 1})">上一页</button>`;
    }
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (i === current) {
            html += `<button class="btn-modern btn-primary btn-small">${i}</button>`;
        } else {
            html += `<button class="btn-modern btn-small" onclick="changePage('${type}', ${i})">${i}</button>`;
        }
    }
    
    // 下一页
    if (current < totalPages) {
        html += `<button class="btn-modern btn-small" onclick="changePage('${type}', ${current + 1})">下一页</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// 切换页面
function changePage(type, page) {
    currentPage[type] = page;
    renderCurrentTab();
}

// 打开模态框
function openModal(type) {
    const modal = document.getElementById(`${type}-modal`);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 设置模态框标题
        if (type === 'article') {
            const titleElement = document.getElementById('article-modal-title');
            if (titleElement) {
                titleElement.innerHTML = editingItem ? 
                    '<i class="fas fa-edit"></i> 编辑文章' : 
                    '<i class="fas fa-plus"></i> 新建文章';
            }
        }
    }
}

// 关闭模态框
function closeModal(type) {
    const modal = document.getElementById(`${type}-modal`);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // 重置表单
    if (type === 'article') {
        resetArticleForm();
    } else if (type === 'image') {
        resetImageForm();
    }
}

// 重置文章表单
function resetArticleForm() {
    document.getElementById('article-title').value = '';
    document.getElementById('article-category').value = '';
    document.getElementById('article-content').value = '';
    document.getElementById('article-image-file').value = '';
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-image-preview').innerHTML = '';
    
    // 清空富文本编辑器
    if (quillEditor) {
        quillEditor.setText('');
    }
    
    editingItem = null;
    removedCoverImage = false;
}

// 重置相册表单
function resetImageForm() {
    document.getElementById('image-title').value = '';
    document.getElementById('image-category').value = '';
    document.getElementById('image-description').value = '';
    document.getElementById('image-files').value = '';
    document.getElementById('images-preview-container').style.display = 'none';
    document.getElementById('images-preview-container').innerHTML = '';
    document.getElementById('upload-progress').style.display = 'none';
    selectedFiles = [];
    updateImageFormState();
}

// 处理文章图片选择
function handleArticleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
        showNotification('请选择图片文件', false);
        return;
    }
    
    // 验证文件大小
    if (file.size > 5 * 1024 * 1024) {
        showNotification('图片文件大小不能超过5MB', false);
        return;
    }
    
    // 显示预览
    const previewContainer = document.getElementById('article-image-preview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        previewContainer.innerHTML = `
            <div class="preview-item">
                <img src="${e.target.result}" alt="预览图片" class="preview-image">
                <button type="button" class="preview-remove" onclick="removeArticleImage()">×</button>
            </div>
        `;
        previewContainer.style.display = 'block';
    };
    
    reader.readAsDataURL(file);
}

// 移除文章图片
function removeArticleImage() {
    document.getElementById('article-image-file').value = '';
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-image-preview').innerHTML = '';
    removedCoverImage = true;
}

// 处理多文件选择
function handleMultipleFileSelect(event) {
    const files = Array.from(event.target.files);
    processSelectedFiles(files);
}

// 处理拖拽
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    processSelectedFiles(files);
}

// 处理选择的文件
function processSelectedFiles(files) {
    // 过滤图片文件
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showNotification('请选择图片文件', false);
        return;
    }
    
    // 检查文件大小
    const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
        showNotification(`${oversizedFiles.length} 个文件超过5MB限制`, false);
        return;
    }
    
    selectedFiles = imageFiles;
    displaySelectedFiles();
    updateImageFormState();
}

// 显示选择的文件
function displaySelectedFiles() {
    const container = document.getElementById('images-preview-container');
    
    if (selectedFiles.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="preview-item">
            <img src="${URL.createObjectURL(file)}" alt="${file.name}" class="preview-image">
            <div class="preview-info">
                <div class="preview-name">${file.name}</div>
                <div class="preview-size">${formatFileSize(file.size)}</div>
            </div>
            <button type="button" class="preview-remove" onclick="removeSelectedFile(${index})">×</button>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

// 移除选择的文件
function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    displaySelectedFiles();
    updateImageFormState();
}

// 更新相册表单状态
function updateImageFormState() {
    const saveBtn = document.getElementById('save-images-btn');
    saveBtn.disabled = selectedFiles.length === 0;
}

// 保存文章
async function saveArticle() {
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value.trim();
    const content = document.getElementById('article-content').value.trim();
    const imageFile = document.getElementById('article-image-file').files[0];
    
    if (!title || !content) {
        showNotification('请填写标题和内容', false);
        return;
    }
    
    try {
        let coverImage = null;
        
        // 处理封面图片
        if (imageFile) {
            const uploadResult = await articleManager.uploadImage(imageFile);
            coverImage = {
                url: uploadResult.url,
                fileName: uploadResult.fileName,
                title: imageFile.name.replace(/\.[^/.]+$/, ''),
                alt: title,
                caption: '',
                size: uploadResult.size,
                type: uploadResult.type
            };
        } else if (editingItem && !removedCoverImage) {
            coverImage = editingItem.coverImage;
        }
        
        const articleData = {
            title,
            content,
            category: category || '未分类',
            tags: [],
            coverImage,
            author: 'admin',
            publishedAt: new Date().toISOString()
        };
        
        if (editingItem) {
            await articleManager.updateArticle(editingItem.id, articleData);
            showNotification('文章更新成功', true);
        } else {
            await articleManager.createArticle(articleData);
            showNotification('文章创建成功', true);
        }
        
        closeModal('article');
        updateStats();
        renderCurrentTab();
        
    } catch (error) {

        showNotification('保存失败: ' + error.message, false);
    }
}

// 保存相册
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
    
    saveBtn.disabled = true;
    progressContainer.style.display = 'block';
    
    try {
        const albumInfo = {
            title: title || '未命名相册',
            description,
            category: category || '默认分类',
            tags: []
        };
        

        await albumManager.uploadAndCreateAlbum(selectedFiles, albumInfo);
        
        showNotification(`成功创建相册，包含 ${selectedFiles.length} 张图片！`, true);
        
        // 立即重新加载数据并刷新界面
        await albumManager.loadAlbums();
        
        setTimeout(() => {
            closeModal('image');
            updateStats();
            renderCurrentTab();
        }, 1000);
        
    } catch (error) {

        showNotification('创建相册失败: ' + error.message, false);
    } finally {
        saveBtn.disabled = false;
    }
}

// 编辑文章
async function editArticle(id) {
    const article = articleManager.getArticleById(id);
    if (!article) {
        showNotification('文章不存在', false);
        return;
    }
    
    editingItem = article;
    
    // 填充表单
    document.getElementById('article-title').value = article.title || '';
    document.getElementById('article-category').value = article.category || '';
    document.getElementById('article-content').value = article.content || '';
    
    // 加载富文本编辑器内容
    if (quillEditor) {
        quillEditor.root.innerHTML = article.content || '';
    }
    
    // 显示封面图片预览
    if (article.coverImage?.url) {
        const previewContainer = document.getElementById('article-image-preview');
        previewContainer.innerHTML = `
            <div class="preview-item">
                <img src="${article.coverImage.url}" alt="当前封面" class="preview-image">
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
        await articleManager.deleteArticle(id);
        showNotification('文章删除成功', true);
        updateStats();
        renderCurrentTab();
    } catch (error) {

        showNotification('删除失败: ' + error.message, false);
    }
}

// 查看相册
function viewAlbum(id) {
    const album = albumManager.getAlbumById(id);
    if (!album) {
        showNotification('相册不存在', false);
        return;
    }
    
    if (album.imageCount === 1) {
        viewImage(album.coverImage.url);
    } else {
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
                            <img src="${img.url}" alt="${escapeHtml(img.title)}" onclick="viewImage('${img.url}')">
                            <p>${escapeHtml(img.title)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 编辑相册
function editAlbum(id) {
    const album = albumManager.getAlbumById(id);
    if (!album) {
        showNotification('相册不存在', false);
        return;
    }
    
    showEditAlbumModal(album);
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
                        <input type="text" id="albumTags" name="tags" value="${(album.tags || []).join(', ')}" placeholder="风景, 旅行, 自然">
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
            await albumManager.updateAlbum(album.id, updateData);
            showNotification('相册更新成功', true);
            
            // 立即重新加载数据并刷新界面
            await albumManager.loadAlbums();
            
            updateStats();
            renderCurrentTab();
            modal.remove();
        } catch (error) {

            showNotification('更新失败: ' + error.message, false);
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 删除相册
async function deleteAlbum(id) {
    const album = albumManager.getAlbumById(id);
    const itemName = album ? (album.imageCount > 1 ? '相册' : '图片') : '项目';
    
    if (!confirm(`确定要删除这个${itemName}吗？此操作不可恢复。`)) {
        return;
    }
    
    try {
        await albumManager.deleteAlbum(id);
        showNotification(`${itemName}删除成功`, true);
        
        // 立即重新加载数据并刷新界面
        await albumManager.loadAlbums();
        
        updateStats();
        renderCurrentTab();
    } catch (error) {

        showNotification('删除失败: ' + error.message, false);
    }
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

// 隐藏页面加载动画
function hideLoadingAnimation() {
    const loadingElement = document.getElementById('page-loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// 显示页面加载动画
function showLoadingAnimation() {
    const loadingElement = document.getElementById('page-loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}
