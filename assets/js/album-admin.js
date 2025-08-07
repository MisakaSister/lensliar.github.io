// 相册管理专用文件 - v2.0 (修复无限递归问题)
// 修复了sortAlbums函数名冲突导致的无限递归问题
let currentPage = 1;
let searchQuery = '';
let currentCategory = '';
let currentSort = 'date-desc';
let editingAlbum = null;
let selectedFiles = [];
const pageSize = 10;

// 全局变量
let allAlbums = [];
let albumCategories = [];

// 分类名称映射
const categoryNameMap = {
    'cat_album_1': '风景摄影',
    'cat_album_2': '人像摄影',
    'cat_album_3': '美食摄影',
    'cat_album_4': '旅行记录',
    'cat_album_5': '工作日常'
};

// 获取友好的分类名称
function getFriendlyCategoryName(category) {
    if (!category) return '未分类';
    return categoryNameMap[category] || category;
}

// 相册管理页面
document.addEventListener('DOMContentLoaded', async function() {
    // 检查登录状态并验证token有效性
    await checkAuthStatus();
    
    // 初始化页面
    initPage();
    
    // 加载相册列表
    await loadAlbums();
    
    // 加载分类列表
    await loadAlbumCategories();
    
    // 渲染页面内容
    renderAlbums();
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

// 初始化页面
function initPage() {
    // 设置事件监听
    setupEventListeners();
    
    // 显示加载状态
    const container = document.getElementById('albums-container');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>正在加载相册列表...</span>
        </div>
    `;
    
    Utils.showLoading(false);
}

// 设置事件监听
function setupEventListeners() {
    // 退出登录
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // 搜索防抖
    const searchInput = document.getElementById('albums-search');
    searchInput.addEventListener('input', debounce(function() {
        searchQuery = this.value;
        currentPage = 1;
        renderAlbums();
    }, 300));
}

// 加载相册数据
async function loadAlbums() {
    try {
        const response = await fetch(`${API_BASE}/images`, {
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        allAlbums = data.images || []; // 后端返回的是 images 字段
        
    } catch (error) {
        console.error('加载相册失败:', error);
        throw error;
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
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        albumCategories = data.categories || [];
        
        console.log('[相册分类] 加载的分类数据:', albumCategories);
        
    } catch (error) {
        console.error('加载相册分类失败:', error);
        albumCategories = [];
    }
}

// 更新统计信息
function updateStats() {
    const statsElement = document.getElementById('albums-stats');
    const totalAlbums = allAlbums.length;
    const totalImages = allAlbums.reduce((sum, album) => sum + (album.images?.length || 0), 0);
    
    statsElement.innerHTML = `
        <i class="fas fa-images "></i>
        <span>共 ${totalAlbums} 个相册，${totalImages} 张图片</span>
    `;
}

// 渲染相册列表
function renderAlbums() {
    const container = document.getElementById('albums-container');
    
    // 过滤和排序相册
    let filteredAlbums = allAlbums.filter(album => {
        const matchesSearch = !searchQuery || 
            album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (album.description && album.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesCategory = !currentCategory || album.category === currentCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    // 排序
    filteredAlbums = sortAlbums(filteredAlbums, currentSort);
    
    // 分页
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageAlbums = filteredAlbums.slice(startIndex, endIndex);
    
    if (pageAlbums.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🖼️</div>
                <h3>暂无相册</h3>
                <p>${searchQuery || currentCategory ? '没有找到符合条件的相册' : '开始创建您的第一个相册吧！'}</p>
                ${!searchQuery && !currentCategory ? '<button class="btn-modern btn-success" onclick="openAlbumModal()">创建相册</button>' : ''}
            </div>
        `;
    } else {
        container.innerHTML = pageAlbums.map(album => createAlbumCard(album)).join('');
    }
    
    // 渲染分页
    renderPagination(Math.ceil(filteredAlbums.length / pageSize));
}

// 创建相册卡片
function createAlbumCard(album) {
    const images = album.images || [];
    const coverImage = album.coverImage?.url || (images.length > 0 ? images[0].url : 'https://images.wengguodong.com/images/1751426822812-c829f00f46b7dda6428d04330b57f890.jpg');
    
    return `
        <div class="content-card" data-id="${album.id}">
            <div class="card-image">
                <img src="${decodeHtmlEntities(coverImage)}" alt="${album.title}" loading="lazy">
                <div class="card-overlay">
                    <div class="card-actions">
                        <button class="btn-action" onclick="editAlbum('${album.id}')" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="deleteAlbum('${album.id}')" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-action" onclick="viewAlbum('${album.id}')" title="预览">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                ${images.length > 1 ? `<div class="image-count">${images.length} 张</div>` : ''}
            </div>
            <div class="card-content">
                <h3 class="card-title">${album.title}</h3>
                <p class="card-text">${album.description || '暂无描述'}</p>
                <div class="card-meta">
                    <span class="card-category">
                        <i class="fas fa-tag"></i>
                        ${getFriendlyCategoryName(album.category)}
                    </span>
                    <span class="card-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(album.createdAt)}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// 排序相册
function sortAlbums(albums, sortType) {
    return [...albums].sort((a, b) => {
        switch(sortType) {
            case 'date-desc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'date-asc':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            case 'count-desc':
                return (b.images?.length || 0) - (a.images?.length || 0);
            case 'count-asc':
                return (a.images?.length || 0) - (b.images?.length || 0);
            default:
                return 0;
        }
    });
}

// 渲染分页
function renderPagination(totalPages) {
    const pagination = document.getElementById('albums-pagination');
    
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
    renderAlbums();
    scrollToTop();
}

// 搜索相册
function searchAlbums() {
    currentPage = 1;
    renderAlbums();
}

// 过滤相册
function filterAlbums() {
    currentCategory = document.getElementById('category-filter').value;
    currentPage = 1;
    renderAlbums();
}

// 处理排序变化
function handleSortChange() {
    currentSort = document.getElementById('sort-select').value;
    currentPage = 1;
    renderAlbums();
}

// 渲染分类选择器
function renderCategorySelect() {
    // 渲染列表页面的分类筛选器
    const filterSelect = document.getElementById('category-filter');
    filterSelect.innerHTML = '<option value="">所有分类</option>';
    
    // 渲染表单中的分类选择器
    const formSelect = document.getElementById('album-category');
    formSelect.innerHTML = '<option value="">请选择分类</option>';
    
    console.log('[相册分类] 渲染分类选择器，分类数量:', albumCategories.length);
    console.log('[相册分类] 分类数据:', albumCategories);
    
    if (albumCategories.length === 0) {
        console.warn('[相册分类] 警告：分类数据为空，可能还没有加载完成');
        return;
    }
    
    albumCategories.forEach(category => {
        console.log('[相册分类] 处理分类:', category);
        
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

// 打开相册模态框
function openAlbumModal(albumId = null) {
    const modal = document.getElementById('album-modal');
    const title = document.querySelector('#album-modal .modal-title');
    const form = document.getElementById('album-form');
    
    // 确保分类选择器被正确渲染
    renderCategorySelect();
    
    if (albumId) {
        // 编辑模式
        editingAlbum = allAlbums.find(a => a.id === albumId);
        if (editingAlbum) {
            title.innerHTML = '<i class="fas fa-edit"></i> 编辑相册';
            fillAlbumForm(editingAlbum);
        }
    } else {
        // 新建模式
        editingAlbum = null;
        title.innerHTML = '<i class="fas fa-plus"></i> 创建相册';
        resetAlbumForm();
    }
    
    modal.style.display = 'flex';
}

// 关闭相册模态框
function closeAlbumModal() {
    const modal = document.getElementById('album-modal');
    modal.style.display = 'none';
    resetAlbumForm();
}

// 填充相册表单
function fillAlbumForm(album) {
    document.getElementById('album-title').value = album.title;
    document.getElementById('album-category').value = album.category;
    document.getElementById('album-description').value = album.description || '';
    
    if (album.images && album.images.length > 0) {
        selectedFiles = album.images;
        displaySelectedFiles();
        updateAlbumFormState();
    }
}

// 重置相册表单
function resetAlbumForm() {
    document.getElementById('album-form').reset();
    selectedFiles = [];
    document.getElementById('albums-preview-container').style.display = 'none';
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('save-album-btn').disabled = true;
    editingAlbum = null;
}

// 保存相册
async function saveAlbum() {
    const title = document.getElementById('album-title').value.trim();
    const category = document.getElementById('album-category').value;
    const description = document.getElementById('album-description').value.trim();
    
    if (!title) {
        showNotification('请输入相册标题', false);
        return;
    }
    
    if (selectedFiles.length === 0) {
        showNotification('请选择至少一张图片', false);
        return;
    }
    
    const saveBtn = document.getElementById('save-album-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    try {
        const albumData = {
            title,
            category,
            description,
            images: selectedFiles
        };
        
        let response;
        if (editingAlbum) {
            // 更新相册
            response = await fetch(`${API_BASE}/images/${editingAlbum.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                },
                body: JSON.stringify(albumData)
            });
        } else {
            // 创建相册
            response = await fetch(`${API_BASE}/images`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                },
                body: JSON.stringify(albumData)
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        showNotification(editingAlbum ? '相册更新成功' : '相册创建成功');
        closeAlbumModal();
        
        // 重新加载数据
        await loadAlbums();
        renderAlbums();
        updateStats();
        
        // 通知其他页面数据已更新
        localStorage.setItem('contentUpdated', Date.now().toString());
        localStorage.setItem('albumUpdated', Date.now().toString());
        
    } catch (error) {
        console.error('保存相册失败:', error);
        showNotification('保存失败: ' + error.message, false);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> 创建相册';
    }
}

// 编辑相册
function editAlbum(id) {
    openAlbumModal(id);
}

// 删除相册
async function deleteAlbum(id) {
    if (!confirm('确定要删除这个相册吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/images/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        showNotification('相册删除成功');
        
        // 重新加载数据
        await loadAlbums();
        renderAlbums();
        updateStats();
        
        // 通知其他页面数据已更新
        localStorage.setItem('contentUpdated', Date.now().toString());
        localStorage.setItem('albumUpdated', Date.now().toString());
        
    } catch (error) {
        console.error('删除相册失败:', error);
        showNotification('删除失败: ' + error.message, false);
    }
}

// 预览相册
function viewAlbum(id) {
    window.open(`album-detail.html?id=${id}`, '_blank');
}

// 处理多文件选择
async function handleMultipleFileSelect(event) {
    const files = Array.from(event.target.files);
    await processSelectedFiles(files);
}

// 处理拖拽事件
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
}

async function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
        await processSelectedFiles(imageFiles);
    }
}

// 处理选中的文件
async function processSelectedFiles(files) {
    const validFiles = [];
    
    for (const file of files) {
        // 验证文件
        const validation = Utils.validateFile(file);
        if (!validation.valid) {
            showNotification(validation.error, false);
            continue;
        }
        validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;
    
    // 显示上传进度
    showUploadProgress(validFiles.length);
    
    try {
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            
            // 更新进度
            updateUploadProgress(i + 1, validFiles.length, file.name, '上传中...');
            
            // 上传文件
            const uploadedFile = await uploadFile(file);
            selectedFiles.push(uploadedFile);
            
            // 更新进度
            updateUploadProgress(i + 1, validFiles.length, file.name, '上传完成');
        }
        
        // 显示选中的文件
        displaySelectedFiles();
        updateAlbumFormState();
        
        showNotification(`成功上传 ${validFiles.length} 张图片`);
        
    } catch (error) {
        console.error('文件上传失败:', error);
        showNotification('文件上传失败: ' + error.message, false);
    } finally {
        hideUploadProgress();
    }
}

// 显示上传进度
function showUploadProgress(totalFiles) {
    const progressContainer = document.getElementById('upload-progress');
    const progressList = document.getElementById('upload-progress-list');
    
    progressList.innerHTML = '';
    progressContainer.style.display = 'block';
}

// 更新上传进度
function updateUploadProgress(current, total, fileName, status) {
    const progressList = document.getElementById('upload-progress-list');
    const progressItem = document.createElement('div');
    progressItem.className = 'upload-progress-item';
    progressItem.innerHTML = `
        <div class="progress-info">
            <span class="progress-filename">${fileName}</span>
            <span class="progress-status">${status}</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${(current / total) * 100}%"></div>
        </div>
    `;
    
    // 更新或添加进度项
    const existingItem = progressList.querySelector(`[data-filename="${fileName}"]`);
    if (existingItem) {
        existingItem.replaceWith(progressItem);
    } else {
        progressList.appendChild(progressItem);
    }
}

// 隐藏上传进度
function hideUploadProgress() {
    document.getElementById('upload-progress').style.display = 'none';
}

// 显示选中的文件
function displaySelectedFiles() {
    const container = document.getElementById('albums-preview-container');
    
    if (selectedFiles.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="preview-item" data-index="${index}">
            <img src="${decodeHtmlEntities(file.url)}" alt="预览图片">
            <button class="remove-btn" onclick="removeSelectedFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    container.style.display = 'flex';
}

// 移除选中的文件
function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    displaySelectedFiles();
    updateAlbumFormState();
}

// 更新相册表单状态
function updateAlbumFormState() {
    const saveBtn = document.getElementById('save-album-btn');
    const title = document.getElementById('album-title').value.trim();
    
    saveBtn.disabled = !title || selectedFiles.length === 0;
}

// 上传文件
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