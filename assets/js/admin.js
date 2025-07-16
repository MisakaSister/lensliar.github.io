// 管理后台主文件
let articleManager, albumManager, quillEditor;
let currentTab = 'articles';
let currentPage = { articles: 1, images: 1 };
let searchQuery = { articles: '', images: '' };
let editingItem = null;
let selectedFiles = [];
const pageSize = 10;

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 检查登录状态
    if (!localStorage.getItem('authToken')) {
        window.location.href = 'login.html';
        return;
    }
    
    // 初始化管理器
    articleManager = new ArticleManager(API_BASE);
    albumManager = new AlbumManager(API_BASE);
    
    // 设置事件监听
    setupEventListeners();
    
    // 加载数据
    try {
        await loadAllContent();
        switchTab('articles');
    } catch (error) {
        console.error('初始化失败:', error);
        if (error.message.includes('401')) {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
            return;
        }
        Utils.showNotification('加载数据失败，请稍后重试', false);
    }
    
    // 初始化富文本编辑器
    initQuillEditor();
    Utils.showLoading(false);
});

// 初始化富文本编辑器
function initQuillEditor() {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
    ];
    
    quillEditor = new Quill('#article-content-editor', {
        theme: 'snow',
        modules: { toolbar: toolbarOptions },
        placeholder: '请输入文章内容...'
    });
    
    quillEditor.on('text-change', function() {
        document.getElementById('article-content').value = quillEditor.root.innerHTML;
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 标签切换
    document.getElementById('articles-tab-btn').addEventListener('click', () => switchTab('articles'));
    document.getElementById('images-tab-btn').addEventListener('click', () => switchTab('images'));
    
    // 搜索
    document.getElementById('articles-search').addEventListener('input', Utils.debounce((e) => {
        searchQuery.articles = e.target.value;
        currentPage.articles = 1;
        renderArticles();
    }, 300));
    
    document.getElementById('images-search').addEventListener('input', Utils.debounce((e) => {
        searchQuery.images = e.target.value;
        currentPage.images = 1;
        renderImages();
    }, 300));
    
    // 模态框
    document.getElementById('article-modal').addEventListener('click', (e) => {
        if (e.target.id === 'article-modal') closeModal('article');
    });
    
    document.getElementById('image-modal').addEventListener('click', (e) => {
        if (e.target.id === 'image-modal') closeModal('image');
    });
    
    // 文件选择
    document.getElementById('article-image-file').addEventListener('change', handleArticleImageSelect);
    
    // 退出登录
    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

// 加载所有内容
async function loadAllContent() {
    const [articles, albums] = await Promise.allSettled([
        articleManager.loadAll(),
        albumManager.loadAll()
    ]);
    
    if (articles.status === 'rejected') {
        Utils.showNotification('加载文章失败: ' + articles.reason.message, false);
    }
    
    if (albums.status === 'rejected') {
        Utils.showNotification('加载相册失败: ' + albums.reason.message, false);
    }
    
    updateStats();
}

// 更新统计信息
function updateStats() {
    const articleStats = articleManager.getStats();
    const albumStats = albumManager.getStats();
    
    const articlesCountEl = document.getElementById('articles-count');
    const imagesCountEl = document.getElementById('images-count');
    
    if (articlesCountEl) articlesCountEl.textContent = articleStats.totalItems;
    if (imagesCountEl) imagesCountEl.textContent = albumStats.totalItems;
    
    const articlesStatsEl = document.getElementById('articles-stats');
    const imagesStatsEl = document.getElementById('images-stats');
    
    if (articlesStatsEl) {
        articlesStatsEl.textContent = `共 ${articleStats.totalItems} 篇文章`;
    }
    
    if (imagesStatsEl) {
        imagesStatsEl.textContent = `共 ${albumStats.totalItems} 个相册`;
    }
}

// 切换标签
function switchTab(tab) {
    currentTab = tab;
    
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tab}-tab-btn`).classList.add('active');
    
    // 更新标签内容
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    renderCurrentTab();
}

// 渲染当前标签
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
    const articles = articleManager.search(searchQuery.articles);
    
    const startIndex = (currentPage.articles - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageArticles = articles.slice(startIndex, endIndex);
    
    if (pageArticles.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无文章</div>';
        document.getElementById('articles-pagination').innerHTML = '';
        return;
    }
    
    container.innerHTML = pageArticles.map(article => `
        <div class="content-card" data-id="${article.id}">
            <div class="card-header">
                <h3 class="card-title">${Utils.escapeHtml(article.title)}</h3>
                <div class="card-meta">
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i>
                        ${Utils.formatDate(article.createdAt)}
                    </span>
                    ${article.category ? `
                        <span class="meta-item">
                            <i class="fas fa-tag"></i>
                            ${Utils.escapeHtml(article.category)}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="card-content">
                <p class="card-summary">${Utils.truncateText(article.summary || article.content, 150)}</p>
            </div>
            <div class="card-actions">
                <button class="btn-modern btn-primary" onclick="editArticle('${article.id}')">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn-modern btn-danger" onclick="deleteArticle('${article.id}')">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        </div>
    `).join('');
    
    renderPagination('articles', Math.ceil(articles.length / pageSize));
}

// 渲染相册列表
function renderImages() {
    const container = document.getElementById('images-container');
    const albums = albumManager.search(searchQuery.images);
    
    const startIndex = (currentPage.images - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageAlbums = albums.slice(startIndex, endIndex);
    
    if (pageAlbums.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无相册</div>';
        document.getElementById('images-pagination').innerHTML = '';
        return;
    }
    
    container.innerHTML = pageAlbums.map(album => `
        <div class="content-card" data-id="${album.id}">
            <div class="card-header">
                <h3 class="card-title">${Utils.escapeHtml(album.title)}</h3>
                <div class="card-meta">
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i>
                        ${Utils.formatDate(album.createdAt)}
                    </span>
                    ${album.category ? `
                        <span class="meta-item">
                            <i class="fas fa-tag"></i>
                            ${Utils.escapeHtml(album.category)}
                        </span>
                    ` : ''}
                    <span class="meta-item">
                        <i class="fas fa-images"></i>
                        ${album.images?.length || 0} 张图片
                    </span>
                </div>
            </div>
            <div class="card-content">
                <p class="card-summary">${Utils.truncateText(album.description, 150)}</p>
            </div>
            <div class="card-actions">
                <button class="btn-modern btn-primary" onclick="editAlbum('${album.id}')">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn-modern btn-danger" onclick="deleteAlbum('${album.id}')">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        </div>
    `).join('');
    
    renderPagination('images', Math.ceil(albums.length / pageSize));
}

// 渲染分页
function renderPagination(type, totalPages) {
    const container = document.getElementById(`${type}-pagination`);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const current = currentPage[type];
    let pagination = '';
    
    if (current > 1) {
        pagination += `<button class="page-btn" onclick="changePage('${type}', ${current - 1})">上一页</button>`;
    }
    
    for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
        pagination += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="changePage('${type}', ${i})">${i}</button>`;
    }
    
    if (current < totalPages) {
        pagination += `<button class="page-btn" onclick="changePage('${type}', ${current + 1})">下一页</button>`;
    }
    
    container.innerHTML = pagination;
}

// 切换页面
function changePage(type, page) {
    currentPage[type] = page;
    renderCurrentTab();
}

// 打开模态框
function openModal(type) {
    editingItem = null;
    resetForm(type);
    document.getElementById(`${type}-modal`).style.display = 'flex';
}

// 关闭模态框
function closeModal(type) {
    document.getElementById(`${type}-modal`).style.display = 'none';
    resetForm(type);
}

// 重置表单
function resetForm(type) {
    editingItem = null;
    if (type === 'article') {
        document.getElementById('article-form').reset();
        quillEditor.root.innerHTML = '';
        document.getElementById('article-image-preview').style.display = 'none';
        document.getElementById('article-modal-title').innerHTML = '<i class="fas fa-edit"></i> 新建文章';
    } else if (type === 'image') {
        document.getElementById('image-form').reset();
        document.getElementById('images-preview-container').style.display = 'none';
        selectedFiles = [];
        updateImageFormState();
    }
}

// 更新图片表单状态
function updateImageFormState() {
    const previewContainer = document.getElementById('images-preview-container');
    const uploadArea = document.querySelector('.file-upload-area');
    
    if (selectedFiles.length > 0) {
        previewContainer.style.display = 'block';
        if (uploadArea) uploadArea.style.display = 'none';
    } else {
        previewContainer.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
    }
}

// 显示选中的文件
function displaySelectedFiles() {
    const container = document.getElementById('images-preview-container');
    if (!container) return;
    
    if (selectedFiles.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="preview-item">
            <img src="${file.url}" alt="${file.fileName}">
            <div class="preview-info">
                <span>${file.fileName}</span>
                <span>${Utils.formatFileSize(file.size)}</span>
            </div>
            <button type="button" class="remove-btn" onclick="removeSelectedFile(${index})">&times;</button>
        </div>
    `).join('');
    
    container.style.display = 'block';
    updateImageFormState();
}

// 移除选中的文件
function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    displaySelectedFiles();
}

// 处理文件选择
async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // 验证文件
    for (const file of files) {
        const validation = Utils.validateFile(file);
        if (!validation.valid) {
            Utils.showNotification(validation.error, false);
            return;
        }
    }
    
    try {
        Utils.showNotification('正在上传文件...', true);
        
        // 上传文件
        for (const file of files) {
            const uploadedFile = await uploadFile(file);
            selectedFiles.push(uploadedFile);
        }
        
        displaySelectedFiles();
        Utils.showNotification(`成功上传 ${files.length} 个文件`);
        
    } catch (error) {
        Utils.showNotification('文件上传失败: ' + error.message, false);
    }
    
    // 清空文件输入
    event.target.value = '';
}

// 上传单个文件
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '上传失败');
    }
    
    const result = await response.json();
    return {
        url: result.url,
        fileName: result.fileName,
        size: result.size,
        type: result.type
    };
}

// 处理多文件选择
async function handleMultipleFileSelect(event) {
    await handleFileSelect(event);
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
    if (files.length > 0) {
        const fileInput = document.getElementById('image-files');
        fileInput.files = event.dataTransfer.files;
        handleFileSelect({ target: fileInput });
    }
}

// 处理文章图片选择
async function handleArticleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const validation = Utils.validateFile(file);
    if (!validation.valid) {
        Utils.showNotification(validation.error, false);
        return;
    }
    
    try {
        const preview = await Utils.createImagePreview(file);
        const previewContainer = document.getElementById('article-image-preview');
        
        previewContainer.innerHTML = `
            <div class="preview-item">
                <img src="${preview.url}" alt="${preview.name}">
                <div class="preview-info">
                    <span>${preview.name}</span>
                    <span>${Utils.formatFileSize(preview.size)}</span>
                </div>
                <button type="button" class="remove-btn" onclick="removeArticleImage()">&times;</button>
            </div>
        `;
        
        previewContainer.style.display = 'block';
        document.getElementById('article-cover-image').value = preview.url;
        
    } catch (error) {
        Utils.showNotification('图片预览失败', false);
    }
}

// 删除文章图片
function removeArticleImage() {
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-image-file').value = '';
    document.getElementById('article-cover-image').value = '';
}

// 保存文章
async function saveArticle() {
    const form = document.getElementById('article-form');
    const formData = new FormData(form);
    
    const articleData = {
        title: formData.get('title'),
        content: quillEditor.root.innerHTML,
        category: formData.get('category'),
        coverImage: document.getElementById('article-cover-image').value
    };
    
    if (!articleData.title || !articleData.content) {
        Utils.showNotification('请填写标题和内容', false);
        return;
    }
    
    try {
        if (editingItem) {
            await articleManager.update(editingItem, articleData);
            Utils.showNotification('文章更新成功');
        } else {
            await articleManager.create(articleData);
            Utils.showNotification('文章创建成功');
        }
        
        closeModal('article');
        await loadAllContent();
        renderCurrentTab();
        
    } catch (error) {
        Utils.showNotification('保存失败: ' + error.message, false);
    }
}

// 保存相册
async function saveImages() {
    const form = document.getElementById('image-form');
    const formData = new FormData(form);
    
    const albumData = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        images: selectedFiles
    };
    
    if (!albumData.title || selectedFiles.length === 0) {
        Utils.showNotification('请填写标题并选择图片', false);
        return;
    }
    
    try {
        if (editingItem) {
            await albumManager.update(editingItem, albumData);
            Utils.showNotification('相册更新成功');
        } else {
            await albumManager.create(albumData);
            Utils.showNotification('相册创建成功');
        }
        
        closeModal('image');
        await loadAllContent();
        renderCurrentTab();
        
    } catch (error) {
        Utils.showNotification('保存失败: ' + error.message, false);
    }
}

// 编辑文章
async function editArticle(id) {
    const article = articleManager.getById(id);
    if (!article) {
        Utils.showNotification('文章不存在', false);
        return;
    }
    
    editingItem = id;
    document.getElementById('article-modal-title').innerHTML = '<i class="fas fa-edit"></i> 编辑文章';
    
    // 填充表单
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-category').value = article.category || '';
    quillEditor.root.innerHTML = article.content;
    
    if (article.coverImage) {
        document.getElementById('article-cover-image').value = article.coverImage;
        // 显示封面图片预览
    }
    
    openModal('article');
}

// 编辑相册
async function editAlbum(id) {
    const album = albumManager.getById(id);
    if (!album) {
        Utils.showNotification('相册不存在', false);
        return;
    }
    
    editingItem = id;
    
    // 填充表单
    document.getElementById('image-title').value = album.title;
    document.getElementById('image-description').value = album.description || '';
    document.getElementById('image-category').value = album.category || '';
    
    selectedFiles = album.images || [];
    displaySelectedFiles();
    
    openModal('image');
}

// 删除文章
async function deleteArticle(id) {
    if (!confirm('确定要删除这篇文章吗？')) return;
    
    try {
        await articleManager.delete(id);
        Utils.showNotification('文章删除成功');
        await loadAllContent();
        renderCurrentTab();
    } catch (error) {
        Utils.showNotification('删除失败: ' + error.message, false);
    }
}

// 删除相册
async function deleteAlbum(id) {
    if (!confirm('确定要删除这个相册吗？')) return;
    
    try {
        await albumManager.delete(id);
        Utils.showNotification('相册删除成功');
        await loadAllContent();
        renderCurrentTab();
    } catch (error) {
        Utils.showNotification('删除失败: ' + error.message, false);
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
}

// 全局函数
window.switchTab = switchTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.saveArticle = saveArticle;
window.saveImages = saveImages;
window.editArticle = editArticle;
window.editAlbum = editAlbum;
window.deleteArticle = deleteArticle;
window.deleteAlbum = deleteAlbum;
window.removeArticleImage = removeArticleImage;
window.scrollToTop = Utils.scrollToTop;
window.toggleTheme = Utils.toggleTheme;
