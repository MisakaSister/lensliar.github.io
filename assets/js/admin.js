// =====================================
// 🎯 Admin管理页面核心功能
// =====================================

let currentEditingArticle = null;

// 🚀 页面加载时自动初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 检查登录状态
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('请先登录', false);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        // 自动加载内容列表
        await loadAllContent();
        
        showNotification('管理后台加载完成', true);
    } catch (error) {
        console.error('初始化失败:', error);
        showNotification('加载失败，请刷新页面重试', false);
    }
});

// 🔄 加载所有内容
async function loadAllContent() {
    try {
        const content = await getAdminContentData();
        
        // 🔍 调试：检查加载的数据
        console.log('🔍 页面加载 - 获取到的数据:', {
            articles: content.articles?.length || 0,
            images: content.images?.length || 0
        });
        
        if (content.images && content.images.length > 0) {
            console.log('🔍 图片列表前5项:', content.images.slice(0, 5).map(img => ({
                id: img.id,
                title: img.title,
                url: img.url ? img.url.substring(0, 50) + '...' : 'no url'
            })));
        }
        
        // 渲染文章列表
        renderArticlesList(content.articles || []);
        updateArticlesCount(content.articles?.length || 0);
        
        // 渲染图片列表  
        renderImagesList(content.images || []);
        updateImagesCount(content.images?.length || 0);
        
    } catch (error) {
        console.error('加载内容失败:', error);
        document.getElementById('articles-list-container').innerHTML = 
            '<div class="loading-placeholder">❌ 加载失败，请刷新页面重试</div>';
        document.getElementById('images-list-container').innerHTML = 
            '<div class="loading-placeholder">❌ 加载失败，请刷新页面重试</div>';
    }
}

// 📊 更新计数显示
function updateArticlesCount(count) {
    document.getElementById('articles-count').textContent = `共 ${count} 篇文章`;
}

function updateImagesCount(count) {
    document.getElementById('images-count').textContent = `共 ${count} 张图片`;
}

// =====================================
// 🎨 标签页切换功能
// =====================================

function switchTab(tabName) {
    // 移除所有active类
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 激活选中的标签
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// =====================================
// 🎪 模态框管理
// =====================================

function openAddModal(type) {
    if (type === 'article') {
        clearArticleForm();
        document.getElementById('article-modal-title').textContent = '添加新文章';
        document.getElementById('save-article-btn').textContent = '保存文章';
        currentEditingArticle = null;
        document.getElementById('article-modal').style.display = 'block';
    } else if (type === 'image') {
        clearImageForm();
        document.getElementById('image-modal').style.display = 'block';
    }
}

function closeModal(type) {
    if (type === 'article') {
        document.getElementById('article-modal').style.display = 'none';
        clearArticleForm();
    } else if (type === 'image') {
        document.getElementById('image-modal').style.display = 'none';
        clearImageForm();
    }
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const articleModal = document.getElementById('article-modal');
    const imageModal = document.getElementById('image-modal');
    
    if (event.target === articleModal) {
        closeModal('article');
    } else if (event.target === imageModal) {
        closeModal('image');
    }
}

// =====================================
// 📝 文章管理功能
// =====================================

// 🖼️ 处理文章封面图片选择
function handleArticleImageSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('article-image-preview');
    
    if (!file) {
        preview.innerHTML = '<span>暂无图片</span>';
        return;
    }
    
    // 文件验证
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('文件格式不支持，请选择图片文件', false);
        event.target.value = '';
        preview.innerHTML = '<span>暂无图片</span>';
        return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showNotification('文件大小不能超过5MB', false);
        event.target.value = '';
        preview.innerHTML = '<span>暂无图片</span>';
        return;
    }
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="预览">`;
    };
    reader.readAsDataURL(file);
}

// 💾 保存文章
async function saveArticle() {
    const title = document.getElementById('article-title').value.trim();
    const category = document.getElementById('article-category').value.trim();
    const content = document.getElementById('article-content').value.trim();
    const imageFile = document.getElementById('article-image-file').files[0];
    
    if (!title || !content) {
        showNotification('标题和内容不能为空', false);
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
            imageUrl = await uploadSingleImage(imageFile);
            console.log('🔍 上传成功，图片URL:', imageUrl);
        }
        
        const currentContent = await getAdminContentData();
        
        if (currentEditingArticle) {
            // 编辑模式
            const articleIndex = currentContent.articles.findIndex(a => a.id === currentEditingArticle);
            if (articleIndex !== -1) {
                currentContent.articles[articleIndex] = {
                    ...currentContent.articles[articleIndex],
                    title,
                    content,
                    category,
                    image: imageUrl || currentContent.articles[articleIndex].image || ''
                };
                showNotification('文章已更新', true);
            }
        } else {
            // 新增模式
            const newArticle = {
                id: Date.now(),
                title,
                content,
                category,
                image: imageUrl,
                date: new Date().toISOString().split('T')[0]
            };
            currentContent.articles.unshift(newArticle); // 添加到开头
            showNotification('文章已保存', true);
        }
        
        const success = await saveContentData(currentContent);
        
        if (success) {
            closeModal('article');
            renderArticlesList(currentContent.articles);
            updateArticlesCount(currentContent.articles.length);
        } else {
            showNotification('保存失败，请重试', false);
        }
        
    } catch (error) {
        console.error('保存文章失败:', error);
        showNotification('保存失败：' + error.message, false);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// 🔄 清空文章表单
function clearArticleForm() {
    document.getElementById('article-title').value = '';
    document.getElementById('article-category').value = '';
    document.getElementById('article-content').value = '';
    document.getElementById('article-image-file').value = '';
    document.getElementById('article-image-preview').innerHTML = '<span>暂无图片</span>';
    currentEditingArticle = null;
}

// ✏️ 编辑文章
async function editArticle(id) {
    try {
        const content = await getAdminContentData();
        const article = content.articles.find(a => a.id === id);
        
        if (!article) {
            showNotification('找不到要编辑的文章', false);
            return;
        }
        
        // 填充表单数据
        document.getElementById('article-title').value = article.title;
        document.getElementById('article-category').value = article.category || '';
        document.getElementById('article-content').value = article.content;
        
        // 如果有封面图片，显示预览
        if (article.image) {
            document.getElementById('article-image-preview').innerHTML = 
                `<img src="${article.image}" alt="当前封面">`;
        }
        
        // 设置编辑模式
        currentEditingArticle = id;
        document.getElementById('article-modal-title').textContent = '编辑文章';
        document.getElementById('save-article-btn').textContent = '更新文章';
        
        // 打开模态框
        document.getElementById('article-modal').style.display = 'block';
        
        showNotification('正在编辑: ' + article.title, true);
        
    } catch (error) {
        console.error('编辑文章失败:', error);
        showNotification('编辑失败，请重试', false);
    }
}

// 🗑️ 删除文章
async function deleteArticle(id) {
    if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;
    
    try {
        const content = await getAdminContentData();
        const originalCount = content.articles.length;
        content.articles = content.articles.filter(a => a.id !== id);
        
        if (content.articles.length === originalCount) {
            showNotification('未找到要删除的文章', false);
            return;
        }
        
        const success = await saveContentData(content);
        
        if (success) {
            showNotification('文章已删除', true);
            renderArticlesList(content.articles);
            updateArticlesCount(content.articles.length);
        } else {
            showNotification('删除失败，请重试', false);
        }
        
    } catch (error) {
        console.error('删除文章失败:', error);
        showNotification('删除失败：' + error.message, false);
    }
}

// 📋 渲染文章列表
function renderArticlesList(articles) {
    const container = document.getElementById('articles-list-container');
    
    if (!articles || articles.length === 0) {
        container.innerHTML = `
            <div class="loading-placeholder">
                📝 暂无文章，点击"添加文章"创建第一篇文章
            </div>
        `;
        return;
    }
    
    container.innerHTML = articles.map(article => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">📝 ${article.title}</div>
                <div class="list-item-meta">
                    分类: ${article.category || '无'} | 发布日期: ${article.date}
                    ${article.image ? ' | 有封面图片' : ''}
                </div>
                ${article.content ? `
                    <div class="list-item-description">
                        ${article.content.length > 100 ? article.content.substring(0, 100) + '...' : article.content}
                    </div>
                ` : ''}
            </div>
            <div class="list-actions">
                <button class="btn" onclick="editArticle(${article.id})" style="background: #f39c12; color: white;">编辑</button>
                <button class="btn btn-danger" onclick="deleteArticle(${article.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// =====================================
// 🖼️ 图片管理功能
// =====================================

// 🎯 处理多文件选择（优化命名）
function handleMultipleFileSelect(event) {
    const files = Array.from(event.target.files);
    const previewContainer = document.getElementById('images-preview-container');
    const saveButton = document.getElementById('save-images-btn');
    
    // 清空之前的预览
    previewContainer.innerHTML = '';
    
    if (files.length === 0) {
        previewContainer.innerHTML = '<div class="image-preview-placeholder">选择文件后显示预览</div>';
        saveButton.disabled = true;
        saveButton.textContent = '上传并保存图片';
        return;
    }
    
    // 验证文件
    let validFiles = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    files.forEach((file) => {
        if (!allowedTypes.includes(file.type)) {
            showNotification(`文件 "${file.name}" 格式不支持`, false);
            return;
        }
        
        if (file.size > maxSize) {
            showNotification(`文件 "${file.name}" 大小超过5MB限制`, false);
            return;
        }
        
        validFiles.push(file);
        
        // 创建预览
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="preview-overlay">
                    <div class="preview-filename">${file.name}</div>
                    <div class="preview-filesize">${(file.size/1024/1024).toFixed(1)}MB</div>
                </div>
            `;
            
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
    
    // 存储有效文件
    window.selectedFiles = validFiles;
    saveButton.disabled = validFiles.length === 0;
    
    // 更新按钮文本
    if (validFiles.length > 0) {
        saveButton.textContent = `上传并保存 ${validFiles.length} 张图片`;
    }
}

// 🚀 批量保存图片（优化命名逻辑）
async function saveImages() {
    const category = document.getElementById('image-category').value.trim();
    const description = document.getElementById('image-description').value.trim();
    const files = window.selectedFiles || [];

    if (files.length === 0) {
        showNotification('请选择要上传的图片文件', false);
        return;
    }

    const progressContainer = document.getElementById('upload-progress');
    const progressList = document.getElementById('upload-progress-list');
    const summary = document.getElementById('upload-summary');
    const saveButton = document.getElementById('save-images-btn');
    
    // 显示进度界面
    progressContainer.style.display = 'block';
    progressList.innerHTML = '';
    saveButton.disabled = true;
    saveButton.textContent = '上传中...';
    
    const uploadResults = [];
    const currentTime = new Date().toISOString();
    
    try {
        // 逐个上传文件
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 创建进度项
            const progressItem = document.createElement('div');
            progressItem.style.cssText = 'margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #3498db;';
            progressItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 0.9rem; font-weight: 500;">${file.name}</span>
                    <span id="status-${i}" style="font-size: 0.8rem; color: #3498db;">准备上传...</span>
                </div>
                <div style="background-color: #e0e0e0; border-radius: 3px; overflow: hidden; height: 4px;">
                    <div id="progress-${i}" style="height: 100%; background-color: #3498db; width: 0%; transition: width 0.3s ease;"></div>
                </div>
            `;
            progressList.appendChild(progressItem);
            
            try {
                // 更新状态
                document.getElementById(`status-${i}`).textContent = '上传中...';
                document.getElementById(`status-${i}`).style.color = '#f39c12';
                
                // 上传图片
                const imageUrl = await uploadImageToCloudflareWithProgress(file, i);
                
                // 更新进度
                document.getElementById(`progress-${i}`).style.width = '100%';
                document.getElementById(`status-${i}`).textContent = '上传成功';
                document.getElementById(`status-${i}`).style.color = '#27ae60';
                
                // 🎯 优化命名：使用原文件名（去掉扩展名）
                const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                
                // 🔧 生成更安全的唯一ID
                const uniqueId = Date.now() + Math.random() * 1000 + i;
                
                uploadResults.push({
                    id: Math.floor(uniqueId), // 确保ID唯一
                    title: fileNameWithoutExt, // 🔥 直接使用文件名，不添加序号
                    category: category || '默认',
                    description,
                    url: imageUrl,
                    date: new Date().toISOString().split('T')[0],
                    uploadTime: currentTime,
                    fileName: file.name,
                    fileSize: file.size,
                    source: 'upload'
                });
                
            } catch (error) {
                document.getElementById(`progress-${i}`).style.backgroundColor = '#e74c3c';
                document.getElementById(`status-${i}`).textContent = '上传失败';
                document.getElementById(`status-${i}`).style.color = '#e74c3c';
                console.error(`上传文件 ${file.name} 失败:`, error);
            }
        }
        
        // 保存到数据库
        if (uploadResults.length > 0) {
            const currentContent = await getAdminContentData();
            
            // 🔍 调试：检查数据保存前后的状态
            console.log('🔍 保存前图片数量:', currentContent.images.length);
            console.log('🔍 要添加的新图片数量:', uploadResults.length);
            console.log('🔍 新图片数据:', uploadResults);
            
            currentContent.images.unshift(...uploadResults); // 添加到开头
            
            console.log('🔍 合并后图片数量:', currentContent.images.length);
            console.log('🔍 完整数据准备保存:', {
                articles: currentContent.articles.length,
                images: currentContent.images.length
            });
            
            const success = await saveContentData(currentContent);
            
            if (success) {
                // 🔍 保存成功后重新验证数据
                const verifyContent = await getAdminContentData();
                console.log('🔍 保存后验证 - 图片数量:', verifyContent.images.length);
                
                summary.innerHTML = `
                    <div style="color: #27ae60; font-weight: 500; margin-bottom: 5px;">
                        ✅ 成功上传 ${uploadResults.length} 张图片
                    </div>
                    <div style="color: #666;">
                        上传时间: ${new Date(currentTime).toLocaleString('zh-CN')}
                    </div>
                `;
                
                showNotification(`成功上传 ${uploadResults.length} 张图片！`, true);
                
                // 使用重新获取的数据刷新列表
                renderImagesList(verifyContent.images);
                updateImagesCount(verifyContent.images.length);
                
                // 延迟关闭模态框
                setTimeout(() => {
                    closeModal('image');
                }, 2000);
                
            } else {
                summary.innerHTML = '<div style="color: #e74c3c;">❌ 保存到数据库失败</div>';
                showNotification('保存失败，请重试', false);
            }
        } else {
            summary.innerHTML = '<div style="color: #e74c3c;">❌ 没有文件上传成功</div>';
            showNotification('所有文件上传失败', false);
        }
        
    } catch (error) {
        console.error('批量上传异常:', error);
        summary.innerHTML = '<div style="color: #e74c3c;">❌ 上传过程中发生错误</div>';
        showNotification('上传异常，请重试', false);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = '上传并保存图片';
    }
}

// 🔄 清空图片表单
function clearImageForm() {
    document.getElementById('image-category').value = '';
    document.getElementById('image-files').value = '';
    document.getElementById('image-description').value = '';
    
    // 重置预览容器
    const previewContainer = document.getElementById('images-preview-container');
    previewContainer.innerHTML = '<div class="image-preview-placeholder">选择文件后显示预览</div>';
    
    // 隐藏上传进度
    document.getElementById('upload-progress').style.display = 'none';
    
    // 清空文件选择
    delete window.selectedFiles;
    
    // 重置按钮状态
    const saveButton = document.getElementById('save-images-btn');
    saveButton.disabled = true;
    saveButton.textContent = '上传并保存图片';
}

// 📋 渲染图片列表
function renderImagesList(images) {
    const container = document.getElementById('images-list-container');
    
    if (!images || images.length === 0) {
        container.innerHTML = `
            <div class="loading-placeholder">
                🖼️ 暂无图片，点击"批量上传图片"添加第一张图片
            </div>
        `;
        return;
    }
    
    container.innerHTML = images.map(image => {
        // 格式化上传时间
        let uploadTimeText = '';
        if (image.uploadTime) {
            const uploadDate = new Date(image.uploadTime);
            uploadTimeText = ` | 上传: ${uploadDate.toLocaleString('zh-CN')}`;
        }
        
        // 格式化文件大小
        let fileSizeText = '';
        if (image.fileSize) {
            const sizeInMB = (image.fileSize / 1024 / 1024).toFixed(1);
            fileSizeText = ` | ${sizeInMB}MB`;
        }
        
        return `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">
                        🖼️ ${image.title}
                        ${image.fileName ? `<small style="color: #666; font-weight: normal;"> (${image.fileName})</small>` : ''}
                    </div>
                    <div class="list-item-meta">
                        分类: ${image.category || '无'} | 日期: ${image.date}${uploadTimeText}${fileSizeText}
                    </div>
                    ${image.description ? `
                        <div class="list-item-description">${image.description}</div>
                    ` : ''}
                </div>
                <div class="list-actions">
                    <button class="btn" onclick="viewImage('${image.url}')" style="background: #3498db; color: white;">预览</button>
                    <button class="btn btn-danger" onclick="deleteImage(${image.id})">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 🔍 预览图片
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
        align-items: center;
        justify-content: center;
        z-index: 2000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="max-width: 90%; max-height: 90%; position: relative;">
            <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);" alt="图片预览">
            <div style="position: absolute; top: -50px; right: -20px; color: white; font-size: 32px; cursor: pointer; background: rgba(0,0,0,0.6); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">×</div>
        </div>
    `;
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.body.appendChild(modal);
}

// 🗑️ 删除图片
async function deleteImage(id) {
    if (!confirm('确定要删除这张图片吗？此操作不可恢复。')) return;
    
    try {
        const content = await getAdminContentData();
        const originalCount = content.images.length;
        content.images = content.images.filter(i => i.id !== id);
        
        if (content.images.length === originalCount) {
            showNotification('未找到要删除的图片', false);
            return;
        }
        
        const success = await saveContentData(content);
        
        if (success) {
            showNotification('图片已删除', true);
            renderImagesList(content.images);
            updateImagesCount(content.images.length);
        } else {
            showNotification('删除失败，请重试', false);
        }
        
    } catch (error) {
        console.error('删除图片失败:', error);
        showNotification('删除失败：' + error.message, false);
    }
}

// =====================================
// 🛠️ 工具函数
// =====================================

// 🔒 获取管理员内容数据
async function getAdminContentData() {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('未登录');

    const response = await fetch(`${API_BASE}/content`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取数据失败');
    }

    return await response.json();
}

// 💾 保存内容数据（增强版本）
async function saveContentData(contentData) {
    const token = localStorage.getItem('authToken');
    
    // 🔧 数据完整性检查
    if (!contentData || !contentData.articles || !contentData.images) {
        console.error('🔍 数据结构错误:', contentData);
        throw new Error('数据结构不完整');
    }
    
    // 🔍 调试：检查要保存的数据
    console.log('🔍 正在保存数据:', {
        articles: contentData.articles?.length || 0,
        images: contentData.images?.length || 0
    });
    
    // 🔧 ID唯一性检查
    const imageIds = contentData.images.map(img => img.id);
    const duplicateIds = imageIds.filter((id, index) => imageIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
        console.warn('🔍 发现重复ID:', duplicateIds);
        // 修复重复ID
        contentData.images.forEach((img, index) => {
            if (duplicateIds.includes(img.id)) {
                img.id = Date.now() + Math.random() * 1000 + index;
                console.log('🔧 修复重复ID:', img.id);
            }
        });
    }
    
    const response = await fetch(`${API_BASE}/content`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(contentData)
    });

    // 🔍 调试：检查保存响应
    if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 保存失败:', response.status, errorText);
        
        // 尝试解析错误信息
        try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || '保存失败');
        } catch (e) {
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
    } else {
        console.log('🔍 保存成功');
    }

    return response.ok;
}

// 📤 上传单个图片（用于文章封面）
async function uploadSingleImage(file) {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
    }
    
    const result = await response.json();
    return result.url;
}

// 🔄 带进度的图片上传
async function uploadImageToCloudflareWithProgress(file, index) {
    const token = localStorage.getItem('authToken');
    
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const xhr = new XMLHttpRequest();
        
        // 进度监听
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                const progressBar = document.getElementById(`progress-${index}`);
                if (progressBar) {
                    progressBar.style.width = percentComplete + '%';
                }
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success) {
                        resolve(result.url);
                    } else {
                        reject(new Error(result.error || '上传失败'));
                    }
                } catch (e) {
                    reject(new Error('解析响应失败'));
                }
            } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
        });
        
        xhr.addEventListener('error', () => {
            reject(new Error('网络错误'));
        });
        
        xhr.open('POST', `${API_BASE}/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
    });
}

// 🚪 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('authToken');
        showNotification('已成功退出', true);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// 📢 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
} 