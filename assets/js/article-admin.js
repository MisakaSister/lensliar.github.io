// 文章管理专用文件
let quillEditor;
let currentPage = 1;
let searchQuery = '';
let currentCategory = '';
let currentSort = 'date-desc';
let editingArticle = null;
let selectedFiles = [];
const pageSize = 10;

// 全局变量
let allArticles = [];
let articleCategories = [];

// 分类名称映射
const categoryNameMap = {
    'cat_article_1': '技术文章',
    'cat_article_2': '生活随笔',
    'cat_article_3': '学习笔记',
    'cat_article_4': '项目展示'
};

// 获取友好的分类名称
function getFriendlyCategoryName(category) {
    if (!category) return '未分类';
    return categoryNameMap[category] || category;
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 检查登录状态
    if (!localStorage.getItem('authToken')) {
        window.location.href = 'login.html';
        return;
    }
    
    // 设置事件监听
    setupEventListeners();
    
    // 加载数据
    try {
        await loadArticles();
        await loadArticleCategories();
        renderArticles();
        updateStats();
        renderCategorySelect();
    } catch (error) {
        console.error('初始化失败:', error);
        if (error.message.includes('401')) {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
            return;
        }
        showNotification('加载数据失败，请稍后重试', false);
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
                    showNotification(validation.error, false);
                    continue;
                }
                
                try {
                    showNotification('正在上传粘贴的图片...', true);
                    
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
                    
                    showNotification('图片上传成功');
                    
                } catch (error) {
                    showNotification('图片上传失败: ' + error.message, false);
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
                showNotification(validation.error, false);
                continue;
            }
            
            try {
                showNotification('正在上传拖拽的图片...', true);
                
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
                
                showNotification('图片上传成功');
                
            } catch (error) {
                showNotification('图片上传失败: ' + error.message, false);
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
            showNotification(validation.error, false);
            return;
        }
        
        try {
            showNotification('正在上传图片...', true);
            
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
            
            showNotification('图片上传成功');
            
        } catch (error) {
            showNotification('图片上传失败: ' + error.message, false);
        }
    };
}

// 设置事件监听
function setupEventListeners() {
    // 退出登录
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // 搜索防抖
    const searchInput = document.getElementById('articles-search');
    searchInput.addEventListener('input', debounce(function() {
        searchQuery = this.value;
        currentPage = 1;
        renderArticles();
    }, 300));
}

// 加载文章数据
async function loadArticles() {
    try {
        const response = await fetch(`${API_BASE}/content`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        allArticles = data.articles || [];
        
    } catch (error) {
        console.error('加载文章失败:', error);
        throw error;
    }
}

// 加载文章分类
async function loadArticleCategories() {
    try {
        const response = await fetch(`${API_BASE}/content/categories`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        articleCategories = data.categories || [];
        
    } catch (error) {
        console.error('加载文章分类失败:', error);
        articleCategories = [];
    }
}

// 更新统计信息
function updateStats() {
    const statsElement = document.getElementById('articles-stats');
    const totalArticles = allArticles.length;
    const publishedArticles = allArticles.filter(article => article.status === 'published').length;
    
    statsElement.innerHTML = `
        <i class="fas fa-newspaper"></i>
        <span>共 ${totalArticles} 篇文章，${publishedArticles} 篇已发布</span>
    `;
}

// 渲染文章列表
function renderArticles() {
    const container = document.getElementById('articles-container');
    
    // 过滤和排序文章
    let filteredArticles = allArticles.filter(article => {
        const matchesSearch = !searchQuery || 
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = !currentCategory || article.category === currentCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    // 排序
    filteredArticles = sortArticles(filteredArticles, currentSort);
    
    // 分页
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageArticles = filteredArticles.slice(startIndex, endIndex);
    
    if (pageArticles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>暂无文章</h3>
                <p>${searchQuery || currentCategory ? '没有找到符合条件的文章' : '开始创建您的第一篇文章吧！'}</p>
                ${!searchQuery && !currentCategory ? '<button class="btn-modern btn-primary" onclick="openArticleModal()">新建文章</button>' : ''}
            </div>
        `;
    } else {
        container.innerHTML = pageArticles.map(article => createArticleCard(article)).join('');
    }
    
    // 渲染分页
    renderPagination(Math.ceil(filteredArticles.length / pageSize));
}

// 创建文章卡片
function createArticleCard(article) {
    const imageUrl = article.coverImage?.url ? decodeHtmlEntities(article.coverImage.url) : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg';
    
    return `
        <div class="content-card" data-id="${article.id}">
            <div class="card-image">
                <img src="${imageUrl}" alt="${article.title}" loading="lazy">
                <div class="card-overlay">
                    <div class="card-actions">
                        <button class="btn-action" onclick="editArticle('${article.id}')" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="deleteArticle('${article.id}')" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-action" onclick="viewArticle('${article.id}')" title="预览">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-content">
                <h3 class="card-title">${article.title}</h3>
                <p class="card-text">${decodeContentImages(article.content).substring(0, 100)}...</p>
                <div class="card-meta">
                    <span class="card-category">
                        <i class="fas fa-tag"></i>
                        ${getFriendlyCategoryName(article.category)}
                    </span>
                    <span class="card-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(article.createdAt)}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// 排序文章
function sortArticles(articles, sortType) {
    return [...articles].sort((a, b) => {
        switch(sortType) {
            case 'date-desc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'date-asc':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            default:
                return 0;
        }
    });
}

// 渲染分页
function renderPagination(totalPages) {
    const pagination = document.getElementById('articles-pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="changePage(${currentPage - 1})">上一页</button>`;
    }
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="page-btn active">${i}</button>`;
        } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    // 下一页
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="changePage(${currentPage + 1})">下一页</button>`;
    }
    
    pagination.innerHTML = paginationHTML;
}

// 切换页面
function changePage(page) {
    currentPage = page;
    renderArticles();
    scrollToTop();
}

// 搜索文章
function searchArticles() {
    currentPage = 1;
    renderArticles();
}

// 过滤文章
function filterArticles() {
    currentCategory = document.getElementById('category-filter').value;
    currentPage = 1;
    renderArticles();
}

// 排序文章
function sortArticles() {
    currentSort = document.getElementById('sort-select').value;
    currentPage = 1;
    renderArticles();
}

// 渲染分类选择器
function renderCategorySelect() {
    const select = document.getElementById('category-filter');
    select.innerHTML = '<option value="">所有分类</option>';
    
    articleCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = getFriendlyCategoryName(category.name);
        select.appendChild(option);
    });
}

// 打开文章模态框
function openArticleModal(articleId = null) {
    const modal = document.getElementById('article-modal');
    const title = document.getElementById('article-modal-title');
    const form = document.getElementById('article-form');
    
    if (articleId) {
        // 编辑模式
        editingArticle = allArticles.find(a => a.id === articleId);
        if (editingArticle) {
            title.innerHTML = '<i class="fas fa-edit"></i> 编辑文章';
            fillArticleForm(editingArticle);
        }
    } else {
        // 新建模式
        editingArticle = null;
        title.innerHTML = '<i class="fas fa-plus"></i> 新建文章';
        resetArticleForm();
    }
    
    modal.style.display = 'flex';
}

// 关闭文章模态框
function closeArticleModal() {
    const modal = document.getElementById('article-modal');
    modal.style.display = 'none';
    resetArticleForm();
}

// 填充文章表单
function fillArticleForm(article) {
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-category').value = article.category;
    quillEditor.root.innerHTML = article.content;
    document.getElementById('article-content').value = article.content;
    
    if (article.coverImage?.url) {
        showArticleImagePreview(article.coverImage);
    }
}

// 重置文章表单
function resetArticleForm() {
    document.getElementById('article-form').reset();
    quillEditor.setText('');
    document.getElementById('article-content').value = '';
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-cover-image').value = '';
    editingArticle = null;
}

// 保存文章
async function saveArticle() {
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value;
    const content = document.getElementById('article-content').value.trim();
    const coverImage = document.getElementById('article-cover-image').value;
    
    if (!title) {
        showNotification('请输入文章标题', false);
        return;
    }
    
    if (!content) {
        showNotification('请输入文章内容', false);
        return;
    }
    
    const saveBtn = document.getElementById('save-article-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    try {
        const articleData = {
            title,
            category,
            content,
            coverImage: coverImage ? JSON.parse(coverImage) : null
        };
        
        let response;
        if (editingArticle) {
            // 更新文章
            response = await fetch(`${API_BASE}/content/${editingArticle.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(articleData)
            });
        } else {
            // 创建文章
            response = await fetch(`${API_BASE}/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(articleData)
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        showNotification(editingArticle ? '文章更新成功' : '文章创建成功');
        closeArticleModal();
        
        // 重新加载数据
        await loadArticles();
        renderArticles();
        updateStats();
        
    } catch (error) {
        console.error('保存文章失败:', error);
        showNotification('保存失败: ' + error.message, false);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> 保存文章';
    }
}

// 编辑文章
function editArticle(id) {
    openArticleModal(id);
}

// 删除文章
async function deleteArticle(id) {
    if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/content/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        showNotification('文章删除成功');
        
        // 重新加载数据
        await loadArticles();
        renderArticles();
        updateStats();
        
    } catch (error) {
        console.error('删除文章失败:', error);
        showNotification('删除失败: ' + error.message, false);
    }
}

// 预览文章
function viewArticle(id) {
    window.open(`article-detail.html?id=${id}`, '_blank');
}

// 处理文章图片选择
async function handleArticleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件
    const validation = Utils.validateFile(file);
    if (!validation.valid) {
        showNotification(validation.error, false);
        return;
    }
    
    try {
        showNotification('正在上传封面图片...', true);
        
        // 上传图片
        const uploadedFile = await uploadFile(file);
        
        // 显示预览
        showArticleImagePreview(uploadedFile);
        
        // 保存到隐藏字段
        document.getElementById('article-cover-image').value = JSON.stringify(uploadedFile);
        
        showNotification('封面图片上传成功');
        
    } catch (error) {
        showNotification('封面图片上传失败: ' + error.message, false);
    }
}

// 显示文章图片预览
function showArticleImagePreview(imageData) {
    const preview = document.getElementById('article-image-preview');
    preview.innerHTML = `
        <div class="preview-item">
            <img src="${decodeHtmlEntities(imageData.url)}" alt="封面图片">
            <button class="remove-btn" onclick="removeArticleImage()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    preview.style.display = 'flex';
}

// 移除文章图片
function removeArticleImage() {
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-cover-image').value = '';
    document.getElementById('article-image-file').value = '';
}

// 上传文件
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
        throw new Error(`上传失败: HTTP ${response.status}`);
    }
    
    return await response.json();
}

// 工具函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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

function decodeContentImages(content) {
    if (!content) return '';
    
    let decoded = decodeHtmlEntities(content);
    decoded = decoded.replace(/<img[^>]*>/g, '[图片]');
    decoded = decoded.replace(/<[^>]*>/g, '');
    
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
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('formatDate: 日期格式化错误:', error, '原始值:', dateString);
        return '未知日期';
    }
}

function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    showNotification('已退出登录');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const icon = document.querySelector('.quick-btn .fa-moon');
    if (icon) {
        icon.classList.toggle('fa-sun');
    }
} 