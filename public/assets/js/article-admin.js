// 文章管理专用文件

// 确保API_BASE可用
if (typeof API_BASE === 'undefined') {
    console.error('API_BASE 未定义，请确保 app.js 已正确加载');
    // 设置默认值
    window.API_BASE = 'https://worker.wengguodong.com';
}

let tinyMCEEditor;
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
    'cat_article_1': '技术分享',
    'cat_article_2': '生活随笔',
    'cat_article_3': '学习笔记',
    'cat_article_4': '项目展示'
};

// 获取友好的分类名称
function getFriendlyCategoryName(category) {
    if (!category) return '未分类';
    return categoryNameMap[category] || category;
}

// 文章管理页面
document.addEventListener('DOMContentLoaded', async function() {
    // 检查登录状态并验证token有效性
    await checkAuthStatus();
    
    // 初始化页面
    initPage();
    
    // 加载文章列表
    await loadArticles();
    
    // 加载分类列表
    await loadArticleCategories();
    
    // 渲染页面内容
    renderArticles();
    renderCategorySelect();
    updateStats();
    
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
        window.location.href = 'login.html';
        return;
    }

    try {
        // 验证token有效性
        const response = await window.fetch(`${API_BASE}/auth/verify`, {
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

// 初始化
function initPage() {
    // 设置事件监听
    setupEventListeners();
    
    // 显示加载状态
    const container = document.getElementById('articles-container');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>正在加载文章列表...</span>
        </div>
    `;
    
    Utils.showLoading(false);
}

// 初始化TinyMCE编辑器
function initTinyMCEEditor() {
    if (tinyMCEEditor) {
        tinyMCEEditor.destroy();
    }

    tinyMCEEditor = tinymce.init({
        selector: '#article-content-editor',
        height: 400,
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | formatselect | bold italic underline strikethrough | ' +
                'alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | link image media table | ' +
                'removeformat | help',
        menubar: 'file edit view insert format tools table help',
        content_style: `
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; }
            .mce-content-body { padding: 20px; }
        `,
        // 图片上传配置
        images_upload_url: `${API_BASE}/upload`,
        images_upload_credentials: true,
        images_upload_handler: function (blobInfo, success, failure) {
            // 检查API_BASE是否定义
            if (typeof API_BASE === 'undefined') {
                failure('API_BASE 未定义');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', blobInfo.blob(), blobInfo.filename());
            
            // 获取认证token
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                failure('未找到认证token');
                return;
            }
            
            // 使用XMLHttpRequest替代fetch，更稳定
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE}/upload`, true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        if (result && result.url) {
                            success(result.url);
                            showNotification('图片上传成功');
                        } else {
                            failure('服务器返回的数据格式错误');
                        }
                    } catch (e) {
                        failure('解析响应数据失败');
                    }
                } else {
                    failure(`上传失败: HTTP ${xhr.status}`);
                }
            };
            
            xhr.onerror = function() {
                failure('网络错误，上传失败');
            };
            
            xhr.send(formData);
        },
        // 自动保存
        auto_save: true,
        auto_save_interval: '30s',
        // 粘贴时自动上传图片
        paste_data_images: true,
        // 拖拽上传图片
        dragdrop_callbacks: true,
        // 设置
        branding: false,
        elementpath: false,
        statusbar: true,
        resize: true,
        // 初始化完成回调
        setup: function(editor) {
            editor.on('change', function() {
                // 内容变化时更新隐藏字段
                document.getElementById('article-content').value = editor.getContent();
            });
            
            // 拖拽上传
            editor.on('drop', function(e) {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    e.preventDefault();
                    handleEditorDrop(files, editor);
                }
            });
        }
    });
}

// 处理编辑器拖拽上传
async function handleEditorDrop(files, editor) {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    // 检查API_BASE是否定义
    if (typeof API_BASE === 'undefined') {
        showNotification('API_BASE 未定义', false);
        return;
    }
    
    // 检查fetch函数是否可用
    if (typeof window.fetch === 'undefined') {
        showNotification('fetch 函数不可用', false);
        return;
    }
    
    // 检查认证token
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        showNotification('未找到认证token', false);
        return;
    }
    
    for (const file of imageFiles) {
        try {
            showNotification('正在上传拖拽的图片...', true);
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await window.fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result && result.url) {
                editor.insertContent(`<img src="${result.url}" alt="${file.name}" style="max-width: 100%; height: auto;">`);
                showNotification('图片上传成功');
            } else {
                showNotification('服务器返回的数据格式错误', false);
            }
        } catch (error) {
            console.error('拖拽图片上传错误:', error);
            showNotification('图片上传失败: ' + error.message, false);
        }
    }
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
        const response = await window.fetch(`${API_BASE}/content`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
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
        const response = await window.fetch(`${API_BASE}/content/categories`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        articleCategories = data.categories || [];
        
        console.log('[文章分类] 加载的分类数据:', articleCategories);
        
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

// 处理排序变化
function handleSortChange() {
    currentSort = document.getElementById('sort-select').value;
    currentPage = 1;
    renderArticles();
}

// 渲染分类选择器
function renderCategorySelect() {
    // 渲染列表页面的分类筛选器
    const filterSelect = document.getElementById('category-filter');
    filterSelect.innerHTML = '<option value="">所有分类</option>';
    
    // 渲染表单中的分类选择器
    const formSelect = document.getElementById('article-category');
    formSelect.innerHTML = '<option value="">请选择分类</option>';
    
    console.log('[文章分类] 渲染分类选择器，分类数量:', articleCategories.length);
    console.log('[文章分类] 分类数据:', articleCategories);
    
    if (articleCategories.length === 0) {
        console.warn('[文章分类] 警告：分类数据为空，可能还没有加载完成');
        return;
    }
    
    articleCategories.forEach(category => {
        console.log('[文章分类] 处理分类:', category);
        
        // 为筛选器添加选项
        const filterOption = document.createElement('option');
        filterOption.value = category.name;
        filterOption.textContent = getFriendlyCategoryName(category.name);
        filterSelect.appendChild(filterOption);
        
        // 为表单选择器添加选项
        const formOption = document.createElement('option');
        formOption.value = category.name;
        formOption.textContent = getFriendlyCategoryName(category.name);
        formSelect.appendChild(formOption);
    });
}

// 打开文章模态框
function openArticleModal(articleId = null) {
    const modal = document.getElementById('article-modal');
    const title = document.getElementById('article-modal-title');
    
    // 确保分类选择器被正确渲染
    renderCategorySelect();
    
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
    
    // 初始化编辑器
    setTimeout(() => {
        initTinyMCEEditor();
    }, 100);
}

// 关闭文章模态框
function closeArticleModal() {
    const modal = document.getElementById('article-modal');
    modal.style.display = 'none';
    
    // 销毁编辑器
    if (tinyMCEEditor) {
        tinyMCEEditor.destroy();
        tinyMCEEditor = null;
    }
    
    resetArticleForm();
}

// 填充文章表单
function fillArticleForm(article) {
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-category').value = article.category;
    
    // 等待编辑器初始化完成后设置内容
    setTimeout(() => {
        if (tinyMCEEditor && tinyMCEEditor.setContent) {
            tinyMCEEditor.setContent(article.content);
        }
    }, 200);
    
    if (article.coverImage?.url) {
        showArticleImagePreview(article.coverImage);
    }
}

// 重置文章表单
function resetArticleForm() {
    document.getElementById('article-form').reset();
    
    if (tinyMCEEditor && tinyMCEEditor.setContent) {
        tinyMCEEditor.setContent('');
    }
    
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-cover-image').value = '';
    editingArticle = null;
}

// 保存文章
async function saveArticle() {
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value;
    const content = tinyMCEEditor ? tinyMCEEditor.getContent() : '';
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
            response = await window.fetch(`${API_BASE}/content/${editingArticle.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                },
                body: JSON.stringify(articleData)
            });
        } else {
            // 创建文章
            response = await window.fetch(`${API_BASE}/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
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
        const response = await window.fetch(`${API_BASE}/content/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
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
    
    const response = await window.fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
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
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
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