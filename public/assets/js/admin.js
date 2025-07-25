// 管理后台主文件
let articleManager, albumManager, quillEditor;
let currentTab = 'articles';
let currentPage = { articles: 1, images: 1 };
let searchQuery = { articles: '', images: '' };
let editingItem = null;
let selectedFiles = [];
const pageSize = 10;

// 全局变量
let articleCategories = [];
let albumCategories = [];

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 检查登录状态并验证token有效性
    await checkAuthStatus();
    
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
            sessionStorage.removeItem('authToken');
            window.location.href = 'login.html';
            return;
        }
        Utils.showNotification('加载数据失败，请稍后重试', false);
    }
    
    // 初始化富文本编辑器
    initQuillEditor();
    Utils.showLoading(false);
});

// 检查认证状态
async function checkAuthStatus() {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
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

        if (!response.ok) {
            // token无效，清除并跳转到登录页
            sessionStorage.removeItem('authToken');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('验证token失败:', error);
        // 网络错误时也跳转到登录页
        sessionStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}

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
        modules: { 
            toolbar: {
                container: toolbarOptions,
                handlers: {
                    image: imageHandler
                }
            }
        },
        placeholder: '请输入文章内容...'
    });
    
    quillEditor.on('text-change', function() {
        document.getElementById('article-content').value = quillEditor.root.innerHTML;
    });
    
    // 处理粘贴事件
    quillEditor.on('paste', async function(e) {
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;
        
        const items = clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                
                const file = item.getAsFile();
                if (!file) continue;
                
                // 验证文件
                const validation = Utils.validateFile(file);
                if (!validation.valid) {
                    Utils.showNotification(validation.error, false);
                    continue;
                }
                
                try {
                    Utils.showNotification('正在上传粘贴的图片...', true);
                    
                    // 上传图片到R2
                    const uploadedFile = await uploadFile(file);
                    
                    // 获取当前光标位置
                    const range = quillEditor.getSelection();
                    
                    // 如果光标位置为null，插入到文档末尾
                    const insertIndex = range ? range.index : quillEditor.getLength();
                    
                    // 插入图片到编辑器
                    quillEditor.insertEmbed(insertIndex, 'image', uploadedFile.url);
                    
                    // 移动光标到图片后面
                    quillEditor.setSelection(insertIndex + 1);
                    
                    Utils.showNotification('图片上传成功');
                    
                } catch (error) {
                    Utils.showNotification('图片上传失败: ' + error.message, false);
                }
            }
        }
    });
    
    // 处理拖拽事件
    const editorElement = document.getElementById('article-content-editor');
    editorElement.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    });
    
    editorElement.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    });
    
    editorElement.addEventListener('drop', async function(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) return;
        
        for (const file of imageFiles) {
            // 验证文件
            const validation = Utils.validateFile(file);
            if (!validation.valid) {
                Utils.showNotification(validation.error, false);
                continue;
            }
            
            try {
                Utils.showNotification('正在上传拖拽的图片...', true);
                
                // 上传图片到R2
                const uploadedFile = await uploadFile(file);
                
                // 获取当前光标位置
                const range = quillEditor.getSelection();
                
                // 如果光标位置为null，插入到文档末尾
                const insertIndex = range ? range.index : quillEditor.getLength();
                
                // 插入图片到编辑器
                quillEditor.insertEmbed(insertIndex, 'image', uploadedFile.url);
                
                // 移动光标到图片后面
                quillEditor.setSelection(insertIndex + 1);
                
                Utils.showNotification('图片上传成功');
                
            } catch (error) {
                Utils.showNotification('图片上传失败: ' + error.message, false);
            }
        }
    });
}

// 图片处理器
async function imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        
        // 验证文件
        const validation = Utils.validateFile(file);
        if (!validation.valid) {
            Utils.showNotification(validation.error, false);
            return;
        }
        
        try {
            Utils.showNotification('正在上传图片...', true);
            
            // 上传图片到R2
            const uploadedFile = await uploadFile(file);
            
            // 获取当前光标位置
            const range = quillEditor.getSelection();
            
            // 如果光标位置为null，插入到文档末尾
            const insertIndex = range ? range.index : quillEditor.getLength();
            
            // 插入图片到编辑器
            quillEditor.insertEmbed(insertIndex, 'image', uploadedFile.url);
            
            // 移动光标到图片后面
            quillEditor.setSelection(insertIndex + 1);
            
            Utils.showNotification('图片上传成功');
            
        } catch (error) {
            Utils.showNotification('图片上传失败: ' + error.message, false);
        }
    };
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
    try {
        Utils.showNotification('正在加载数据...', true);
        
        // 并行加载文章、相册和分类数据
        const [articlesResult, imagesResult, articleCategoriesResult, albumCategoriesResult] = await Promise.all([
            articleManager.loadAll(),
            albumManager.loadAll(),
            loadArticleCategories(),
            loadAlbumCategories()
        ]);
        
        // 更新全局数据
        articleCategories = articleCategoriesResult.categories || [];
        albumCategories = albumCategoriesResult.categories || [];
        
        console.log('加载完成 - 文章数量:', articleManager.getAll().length);
        console.log('加载完成 - 相册数量:', albumManager.getAll().length);
        console.log('文章分类数量:', articleCategories.length);
        console.log('相册分类数量:', albumCategories.length);
        
        updateStats();
        renderCurrentTab();
        Utils.showNotification('数据加载完成');
        
    } catch (error) {
        console.error('加载数据失败:', error);
        Utils.showNotification('加载数据失败: ' + error.message, false);
    }
}

// 加载文章分类
async function loadArticleCategories() {
    try {
        const response = await fetch(`${API_BASE}/content/categories`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取文章分类失败');
        }
        
        return await response.json();
    } catch (error) {
        console.error('加载文章分类失败:', error);
        return { categories: [] };
    }
}

// 加载相册分类
async function loadAlbumCategories() {
    try {
        const response = await fetch(`${API_BASE}/images/categories`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取相册分类失败');
        }
        
        return await response.json();
    } catch (error) {
        console.error('加载相册分类失败:', error);
        return { categories: [] };
    }
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
        articlesStatsEl.innerHTML = `
            <i class="fas fa-newspaper"></i>
            <span>共 ${articleStats.totalItems} 篇文章</span>
        `;
    }
    
    if (imagesStatsEl) {
        imagesStatsEl.innerHTML = `
            <i class="fas fa-images"></i>
            <span>共 ${albumStats.totalItems} 个相册</span>
        `;
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
    const articles = articleManager.getAll();
    
    if (articles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <h3>暂无文章</h3>
                <p>点击"新建文章"开始创作</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = articles.map(article => {
        const category = articleCategories.find(cat => cat.id === article.category);
        const categoryName = category ? category.name : article.category || '未分类';
        const categoryColor = category ? category.color : '#6c757d';
        
        return `
            <div class="content-card" data-id="${article.id}">
                <div class="card-header">
                    <div class="card-title">
                        <h3>${article.title}</h3>
                        <span class="category-badge" style="background-color: ${categoryColor}">${categoryName}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="editArticle('${article.id}')" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteArticle('${article.id}')" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <p>${article.summary || article.content.substring(0, 100)}...</p>
                </div>
                <div class="card-footer">
                    <div class="card-meta">
                        <span><i class="fas fa-user"></i> ${article.author}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(article.createdAt).toLocaleDateString()}</span>
                        <span><i class="fas fa-eye"></i> ${article.stats?.views || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染相册列表
function renderImages() {
    const container = document.getElementById('images-container');
    const albums = albumManager.getAll();
    
    console.log('渲染相册列表，相册数量:', albums.length);
    console.log('相册数据:', albums);
    
    if (albums.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <h3>暂无相册</h3>
                <p>点击"创建相册"开始上传图片</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = albums.map(album => {
        const category = albumCategories.find(cat => cat.id === album.category);
        const categoryName = category ? category.name : album.category || '未分类';
        const categoryColor = category ? category.color : '#6c757d';
        
        return `
            <div class="content-card" data-id="${album.id}">
                <div class="card-header">
                    <div class="card-title">
                        <h3>${album.title}</h3>
                        <span class="category-badge" style="background-color: ${categoryColor}">${categoryName}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="editAlbum('${album.id}')" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteAlbum('${album.id}')" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="album-preview">
                        ${album.coverImage ? `
                            <img src="${album.coverImage.url}" alt="${album.title}" class="album-cover">
                        ` : `
                            <div class="no-cover">
                                <i class="fas fa-images"></i>
                                <span>无封面图片</span>
                            </div>
                        `}
                    </div>
                    <p class="album-description">${album.description || '暂无描述'}</p>
                </div>
                <div class="card-footer">
                    <div class="card-meta">
                        <span><i class="fas fa-images"></i> ${album.imageCount} 张图片</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(album.createdAt).toLocaleDateString()}</span>
                        <span><i class="fas fa-user"></i> ${album.uploadedBy}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
    if (type === 'article') {
        document.getElementById('article-modal').style.display = 'flex';
        renderArticleCategorySelect();
    } else if (type === 'image') {
        document.getElementById('image-modal').style.display = 'flex';
        renderAlbumCategorySelect();
        
        // 设置初始按钮状态
        const saveButton = document.getElementById('save-images-btn');
        if (saveButton) {
            saveButton.disabled = selectedFiles.length === 0;
        }
    }
}

// 渲染文章分类下拉框
function renderArticleCategorySelect() {
    const select = document.getElementById('article-category');
    if (!select) return;
    
    // 清空现有选项
    select.innerHTML = '<option value="">请选择分类</option>';
    
    // 添加分类选项
    articleCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

// 渲染相册分类下拉框
function renderAlbumCategorySelect() {
    const select = document.getElementById('image-category');
    if (!select) return;
    
    // 清空现有选项
    select.innerHTML = '<option value="">请选择分类</option>';
    
    // 添加分类选项
    albumCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
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
        const coverImageElement = document.getElementById('article-cover-image');
        if (coverImageElement) {
            coverImageElement.value = '';
        }
        document.getElementById('article-modal-title').innerHTML = '<i class="fas fa-edit"></i> 新建文章';
    } else if (type === 'image') {
        document.getElementById('image-form').reset();
        document.getElementById('images-preview-container').style.display = 'none';
        selectedFiles = [];
        updateImageFormState();
        
        // 重置保存按钮状态
        const saveButton = document.getElementById('save-images-btn');
        if (saveButton) {
            saveButton.disabled = true;
        }
    }
}

// 更新图片表单状态
function updateImageFormState() {
    const previewContainer = document.getElementById('images-preview-container');
    const uploadArea = document.querySelector('.file-upload-area');
    const saveButton = document.getElementById('save-images-btn');
    
    if (selectedFiles.length > 0) {
        previewContainer.style.display = 'block';
        if (uploadArea) uploadArea.style.display = 'none';
        if (saveButton) saveButton.disabled = false;
    } else {
        previewContainer.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        if (saveButton) saveButton.disabled = true;
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
    
    // 更新保存按钮状态
    const saveButton = document.getElementById('save-images-btn');
    if (saveButton) {
        saveButton.disabled = selectedFiles.length === 0;
    }
}

// 移除选中的文件
function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    displaySelectedFiles();
    
    // 更新保存按钮状态
    const saveButton = document.getElementById('save-images-btn');
    if (saveButton) {
        saveButton.disabled = selectedFiles.length === 0;
    }
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
        // 更新按钮状态
        const saveButton = document.getElementById('save-images-btn');
        if (saveButton) {
            saveButton.disabled = selectedFiles.length === 0;
        }
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
            'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
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
        const coverImageElement = document.getElementById('article-cover-image');
        if (coverImageElement) {
            coverImageElement.value = preview.url;
        }
        
    } catch (error) {
        Utils.showNotification('图片预览失败', false);
    }
}

// 删除文章图片
function removeArticleImage() {
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-image-file').value = '';
    const coverImageElement = document.getElementById('article-cover-image');
    if (coverImageElement) {
        coverImageElement.value = '';
    }
}

// 保存文章
async function saveArticle() {
    const titleElement = document.getElementById('article-title');
    const categoryElement = document.getElementById('article-category');
    const coverImageElement = document.getElementById('article-cover-image');
    
    const articleData = {
        title: titleElement ? titleElement.value.trim() : '',
        content: quillEditor.root.innerHTML,
        category: categoryElement ? categoryElement.value : '',
        coverImage: coverImageElement ? coverImageElement.value : null
    };
    
    console.log('文章数据:', articleData);
    console.log('内容长度:', articleData.content.length);
    
    if (!articleData.title || !articleData.content) {
        Utils.showNotification('请填写标题和内容', false);
        return;
    }
    
    // 检查内容长度限制（D1单字段最大约1MB）
    if (articleData.content.length > 500000) {
        Utils.showNotification('内容过大，无法保存（请减少图片数量或压缩图片）', false);
        return;
    }
    
    try {
        // 禁用保存按钮防止重复提交
        const saveButton = document.getElementById('save-article-btn');
        if (saveButton) saveButton.disabled = true;
        
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
        // 重新启用保存按钮
        const saveButton = document.getElementById('save-article-btn');
        if (saveButton) saveButton.disabled = false;
    }
}

// 保存相册
async function saveImages() {
    const titleElement = document.getElementById('image-title');
    const descriptionElement = document.getElementById('image-description');
    const categoryElement = document.getElementById('image-category');
    
    const albumData = {
        title: titleElement ? titleElement.value.trim() : '',
        description: descriptionElement ? descriptionElement.value.trim() : '',
        category: categoryElement ? categoryElement.value : '',
        images: selectedFiles
    };
    
    console.log('相册数据:', albumData);
    console.log('选中的文件数量:', selectedFiles.length);
    
    if (!albumData.title || selectedFiles.length === 0) {
        Utils.showNotification('请填写标题并选择图片', false);
        return;
    }
    
    try {
        // 禁用保存按钮防止重复提交
        const saveButton = document.getElementById('save-images-btn');
        if (saveButton) saveButton.disabled = true;
        
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
        // 重新启用保存按钮
        const saveButton = document.getElementById('save-images-btn');
        if (saveButton) saveButton.disabled = false;
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
    
    // 渲染分类下拉框
    renderArticleCategorySelect();
    
    // 填充表单
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-category').value = article.category || '';
    quillEditor.root.innerHTML = article.content;
    
    if (article.coverImage) {
        const coverImageElement = document.getElementById('article-cover-image');
        if (coverImageElement) {
            coverImageElement.value = article.coverImage;
        }
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
    
    // 渲染分类下拉框
    renderAlbumCategorySelect();
    
    // 填充表单
    document.getElementById('image-title').value = album.title;
    document.getElementById('image-description').value = album.description || '';
    document.getElementById('image-category').value = album.category || '';
    
    selectedFiles = album.images || [];
    displaySelectedFiles();
    
    // 更新保存按钮状态
    const saveButton = document.getElementById('save-images-btn');
    if (saveButton) {
        saveButton.disabled = selectedFiles.length === 0;
    }
    
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
    sessionStorage.removeItem('authToken');
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
window.removeSelectedFile = removeSelectedFile;
window.handleMultipleFileSelect = handleMultipleFileSelect;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.scrollToTop = Utils.scrollToTop;
window.toggleTheme = Utils.toggleTheme;
