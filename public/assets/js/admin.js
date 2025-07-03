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
        console.log('调用getAdminContentData...');
        const content = await getAdminContentData();
        console.log('获取到的内容:', content);
        
        if (content) {
            articlesData = content.articles || [];
            imagesData = content.images || [];
            
            // 更新统计信息
            updateStats();
            
            // 渲染当前标签页内容
            renderCurrentTab();
            
            console.log(`内容加载完成: ${articlesData.length} 篇文章, ${imagesData.length} 张图片`);
        } else {
            console.log('内容为空');
            showEmptyState();
        }
    } catch (error) {
        console.error('加载内容失败:', error);
        showNotification('加载内容失败: ' + error.message, false);
        showEmptyState();
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
            ${article.imageUrl ? `<img src="${article.imageUrl}" alt="${escapeHtml(article.title)}" class="card-image" onerror="this.style.display='none'">` : ''}
            <div class="card-content">${escapeHtml(article.content || '').substring(0, 150)}${article.content && article.content.length > 150 ? '...' : ''}</div>
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
    
    // 渲染图片卡片
    container.innerHTML = paginatedData.data.map(image => `
        <div class="content-card">
            <img src="${image.url}" alt="${escapeHtml(image.title)}" class="card-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik04NyA2NUw5MyA3MUwxMDcgNTdMMTIzIDczTDEzNyA1OUwxNTMgNzVMMTY3IDYxTDE4MyA3N0wxOTcgNjNWMTM3SDE3VjEzN0g5N1YxMzdIMTdWNjNMMzMgNzdMNDcgNjNMNjMgNzlMNzcgNjVMODcgNjVaIiBmaWxsPSIjREREREREIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjQwIiByPSIxNSIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
            <div class="card-header">
                <h4 class="card-title">${escapeHtml(image.title)}</h4>
            </div>
            <div class="card-meta">
                ${image.category ? `<span>${escapeHtml(image.category)}</span> • ` : ''}
                <span>${formatDate(image.createdAt)}</span>
            </div>
            ${image.description ? `<div class="card-content">${escapeHtml(image.description).substring(0, 100)}${image.description.length > 100 ? '...' : ''}</div>` : ''}
            <div class="card-actions">
                <button class="btn-modern btn-primary btn-small" onclick="viewImage('${image.url}')">
                    查看
                </button>
                <button class="btn-modern btn-danger btn-small" onclick="deleteImage('${image.id}')">
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
}

// 重置图片表单
function resetImageForm() {
    document.getElementById('image-form').reset();
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
        if (imageFile) {
            showNotification('正在上传封面图片...', true);
            imageUrl = await uploadImageToCloudflare(imageFile);
        }
        
        const articleData = {
            id: editingItem ? editingItem.id : Date.now().toString(),
            title,
            category,
            content,
            imageUrl,
            createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 保存文章数据
        if (editingItem) {
            const index = articlesData.findIndex(item => item.id === editingItem.id);
            if (index !== -1) {
                articlesData[index] = articleData;
            }
        } else {
            articlesData.unshift(articleData);
        }
        
        // 保存到服务器
        await saveContentData({ articles: articlesData, images: imagesData });
        
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

// 保存图片
async function saveImages() {
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
    
    try {
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
                const imageUrl = await uploadImageToCloudflare(file);
                
                // 创建图片数据
                const imageData = {
                    id: Date.now().toString() + '_' + i,
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    category,
                    description,
                    url: imageUrl,
                    filename: file.name,
                    size: file.size,
                    createdAt: new Date().toISOString()
                };
                
                imagesData.unshift(imageData);
                
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
        
        // 保存到服务器
        if (successCount > 0) {
            await saveContentData({ articles: articlesData, images: imagesData });
        }
        
        // 更新摘要
        progressSummary.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 10px;">上传完成</div>
            <div style="color: #28a745;">成功: ${successCount} 个文件</div>
            ${errorCount > 0 ? `<div style="color: #dc3545;">失败: ${errorCount} 个文件</div>` : ''}
        `;
        
        if (successCount > 0) {
            showNotification(`成功上传 ${successCount} 张图片！`, true);
            setTimeout(() => {
                closeModal('image');
                updateStats();
                renderCurrentTab();
            }, 2000);
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
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`上传失败: ${error}`);
    }
    
    const result = await response.json();
    return result.url;
}

// 保存内容数据
async function saveContentData(contentData) {
    const response = await fetch(`${API_BASE_URL}/content`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(contentData)
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`保存失败: ${error}`);
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
    document.getElementById('article-content').value = article.content || '';
    
    // 如果有封面图片，显示预览
    if (article.imageUrl) {
        const previewContainer = document.getElementById('article-image-preview');
        previewContainer.innerHTML = `
            <div class="preview-item">
                <img src="${article.imageUrl}" alt="当前封面" class="preview-image">
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
        
        articlesData.splice(index, 1);
        await saveContentData({ articles: articlesData, images: imagesData });
        
        showNotification('文章删除成功', true);
        updateStats();
        renderCurrentTab();
        
    } catch (error) {
        console.error('删除文章失败:', error);
        showNotification('删除失败: ' + error.message, false);
    }
}

// 删除图片
async function deleteImage(id) {
    if (!confirm('确定要删除这张图片吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const index = imagesData.findIndex(item => item.id === id);
        if (index === -1) {
            showNotification('图片不存在', false);
            return;
        }
        
        imagesData.splice(index, 1);
        await saveContentData({ articles: articlesData, images: imagesData });
        
        showNotification('图片删除成功', true);
        updateStats();
        renderCurrentTab();
        
    } catch (error) {
        console.error('删除图片失败:', error);
        showNotification('删除失败: ' + error.message, false);
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