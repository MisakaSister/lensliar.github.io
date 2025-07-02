// admin.js - 管理后台功能

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已登录
    if (!localStorage.getItem('authToken')) {
        showNotification('请先登录', false);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }

    // 设置预览事件
    document.getElementById('article-image').addEventListener('input', updateArticlePreview);
    document.getElementById('image-url').addEventListener('input', updateImagePreview);
    
    // 设置图片上传相关事件
    document.getElementById('image-file').addEventListener('change', handleFileSelect);

    // 绑定退出按钮
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });

    // 加载内容
    loadContent();
});

// 加载内容
async function loadContent() {
    try {
        // 🔒 使用管理员专用API函数
        const content = await getAdminContentData();
        if (content && (content.articles || content.images)) {
            renderContent(content);
        } else {
            showNotification('加载内容失败', false);
        }
    } catch (error) {
        console.error('加载内容异常:', error);
        showNotification('网络错误，请重试', false);
    }
}

// 渲染内容
function renderContent(content) {
    renderArticlesList(content.articles);
    renderImagesList(content.images);
}

// 渲染文章列表
function renderArticlesList(articles) {
    const container = document.getElementById('articles-list-container');
    container.innerHTML = '';

    articles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'list-item';
        articleElement.innerHTML = `
                <div class="list-item-title">${article.title}</div>
                <div class="list-actions">
                    <button class="btn" onclick="editArticle(${article.id})">编辑</button>
                    <button class="btn btn-danger" onclick="deleteArticle(${article.id})">删除</button>
                </div>
            `;
        container.appendChild(articleElement);
    });
}

// 渲染图片列表
function renderImagesList(images) {
    const container = document.getElementById('images-list-container');
    container.innerHTML = '';

    images.forEach(image => {
        const imageElement = document.createElement('div');
        imageElement.className = 'list-item';
        imageElement.innerHTML = `
                <div class="list-item-title">${image.title}</div>
                <div class="list-actions">
                    <button class="btn" onclick="editImage(${image.id})">编辑</button>
                    <button class="btn btn-danger" onclick="deleteImage(${image.id})">删除</button>
                </div>
            `;
        container.appendChild(imageElement);
    });
}

// 更新文章图片预览
function updateArticlePreview() {
    const url = document.getElementById('article-image').value;
    const preview = document.getElementById('article-image-preview');

    if (url) {
        preview.innerHTML = `<img src="${url}" alt="预览">`;
    } else {
        preview.innerHTML = '<span>图片预览</span>';
    }
}

// 🗑️ 已移除的旧函数
// updateImagePreview(), toggleImageSource(), handleFileSelect() 
// 这些函数已被新的多图上传功能替代

// 🖼️ 处理多文件选择
function handleMultipleFileSelect(event) {
    const files = Array.from(event.target.files);
    const previewContainer = document.getElementById('images-preview-container');
    const saveButton = document.getElementById('save-images-btn');
    
    // 清空之前的预览
    previewContainer.innerHTML = '';
    
    if (files.length === 0) {
        previewContainer.innerHTML = '<div class="image-preview-placeholder" style="aspect-ratio: 1; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 0.9rem;">选择文件后显示预览</div>';
        saveButton.disabled = true;
        return;
    }
    
    // 验证文件
    let validFiles = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    files.forEach((file, index) => {
        if (!allowedTypes.includes(file.type)) {
            showNotification(`文件 "${file.name}" 格式不支持`, false);
            return;
        }
        
        if (file.size > maxSize) {
            showNotification(`文件 "${file.name}" 大小超过5MB限制`, false);
            return;
        }
        
        validFiles.push(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.style.cssText = `
                position: relative;
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                border: 2px solid #e0e0e0;
                background: #f8f9fa;
            `;
            
            previewItem.innerHTML = `
                <img src="${e.target.result}" 
                     style="width: 100%; height: 100%; object-fit: cover;" 
                     alt="Preview">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; padding: 8px 6px 4px; font-size: 0.75rem; line-height: 1.2;">
                    <div style="font-weight: 500; margin-bottom: 2px;">${file.name}</div>
                    <div style="opacity: 0.9;">${(file.size/1024/1024).toFixed(1)}MB</div>
                </div>
            `;
            
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
    
    // 存储有效文件到全局变量
    window.selectedFiles = validFiles;
    saveButton.disabled = validFiles.length === 0;
    
    // 更新按钮文本
    if (validFiles.length > 0) {
        saveButton.textContent = `上传并保存 ${validFiles.length} 个图片`;
    }
}

// 🚀 保存多个图片
async function saveImages() {
    const title = document.getElementById('image-title').value;
    const category = document.getElementById('image-category').value;
    const description = document.getElementById('image-description').value;
    const files = window.selectedFiles || [];

    if (!title) {
        showNotification('图片标题不能为空', false);
        return;
    }
    
    if (files.length === 0) {
        showNotification('请选择要上传的图片文件', false);
        return;
    }

    const progressContainer = document.getElementById('upload-progress');
    const progressList = document.getElementById('upload-progress-list');
    const summary = document.getElementById('upload-summary');
    const saveButton = document.getElementById('save-images-btn');
    
    // 显示进度条
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
            
            // 创建进度条
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
                
                // 生成图片数据
                const imageTitle = files.length === 1 ? title : `${title} (${i + 1})`;
                
                uploadResults.push({
                    id: Date.now() + i, // 确保ID唯一
                    title: imageTitle,
                    category,
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
        
        // 保存到KV存储
        if (uploadResults.length > 0) {
            const currentContent = await getCurrentContent();
            currentContent.images.push(...uploadResults);
            
            const response = await saveContentData(currentContent);
            
            if (response) {
                summary.innerHTML = `
                    <div style="color: #27ae60; font-weight: 500; margin-bottom: 5px;">
                        ✅ 成功上传 ${uploadResults.length} 个图片
                    </div>
                    <div style="color: #666;">
                        上传时间: ${new Date(currentTime).toLocaleString('zh-CN')}
                    </div>
                `;
                
                showNotification(`成功上传 ${uploadResults.length} 个图片！`, true);
                
                // 延迟清空表单和刷新列表
                setTimeout(() => {
                    clearImageForm();
                    renderImagesList(currentContent.images);
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

// 🔄 带进度的图片上传函数
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

// 显示表单
function showForm(type) {
    if (type === 'article') {
        document.getElementById('article-form').style.display = 'block';
        document.getElementById('image-form').style.display = 'none';
    } else {
        document.getElementById('article-form').style.display = 'none';
        document.getElementById('image-form').style.display = 'block';
        
        // 如果不是编辑模式，确保按钮显示正确的文本
        if (!window.editingImageId) {
            document.getElementById('save-image-btn').textContent = '保存图片';
        }
    }
}

// 保存文章
async function saveArticle() {
    const title = document.getElementById('article-title').value;
    const category = document.getElementById('article-category').value;
    const content = document.getElementById('article-content').value;
    const image = document.getElementById('article-image').value;

    if (!title || !content) {
        showNotification('标题和内容不能为空', false);
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const currentContent = await getCurrentContent();

        const newArticle = {
            id: Date.now(),
            title,
            content,
            category,
            image,
            date: new Date().toISOString().split('T')[0]
        };

        currentContent.articles.push(newArticle);

        const response = await saveContentData(currentContent);

        if (response) {
            showNotification('文章已保存', true);
            clearArticleForm();
            renderArticlesList(currentContent.articles);
        } else {
            showNotification('保存失败，请重试', false);
        }
    } catch (error) {
        console.log('保存文章异常:', error);
        showNotification('网络错误，请重试', false);
    }
}

// 保存图片数据到KV
async function saveContentData(contentData) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/content`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(contentData)
    });

    return response.ok;
}

// 🔍 预览图片
function viewImage(imageUrl) {
    // 创建模态窗口预览图片
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="max-width: 90%; max-height: 90%; position: relative;">
            <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" alt="图片预览">
            <div style="position: absolute; top: -40px; right: 0; color: white; font-size: 24px; cursor: pointer; background: rgba(0,0,0,0.5); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">×</div>
        </div>
    `;
    
    // 点击关闭
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.body.appendChild(modal);
}

// 获取当前内容
async function getCurrentContent() {
    // 🔒 使用管理员专用API函数
    return await getAdminContentData();
}

// 清空文章表单
function clearArticleForm() {
    document.getElementById('article-title').value = '';
    document.getElementById('article-category').value = '';
    document.getElementById('article-content').value = '';
    document.getElementById('article-image').value = '';
    document.getElementById('article-image-preview').innerHTML = '<span>图片预览</span>';
}

// 清空图片表单
function clearImageForm() {
    document.getElementById('image-title').value = '';
    document.getElementById('image-category').value = '';
    document.getElementById('image-files').value = '';
    document.getElementById('image-description').value = '';
    
    // 重置预览容器
    const previewContainer = document.getElementById('images-preview-container');
    previewContainer.innerHTML = '<div class="image-preview-placeholder" style="aspect-ratio: 1; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 0.9rem;">选择文件后显示预览</div>';
    
    // 隐藏上传进度
    document.getElementById('upload-progress').style.display = 'none';
    
    // 清空文件选择
    delete window.selectedFiles;
    
    // 重置按钮状态
    const saveButton = document.getElementById('save-images-btn');
    saveButton.disabled = true;
    saveButton.textContent = '上传并保存图片';
    
    // 清除编辑状态
    delete window.editingImageId;
}

// 切换内容部分
function toggleSection(section) {
    if (section === 'articles') {
        document.getElementById('articles-list').style.display = 'block';
        document.getElementById('images-list').style.display = 'none';
    } else {
        document.getElementById('articles-list').style.display = 'none';
        document.getElementById('images-list').style.display = 'block';
    }
}

// 编辑文章
async function editArticle(id) {
    try {
        const token = localStorage.getItem('authToken');
        const content = await getCurrentContent();
        const article = content.articles.find(a => a.id === id);

        if (article) {
            document.getElementById('article-title').value = article.title;
            document.getElementById('article-category').value = article.category;
            document.getElementById('article-content').value = article.content;
            document.getElementById('article-image').value = article.image || '';
            // updateArticlePreview(); // 文章预览功能保留

            document.getElementById('article-form').scrollIntoView({ behavior: 'smooth' });
            showNotification('正在编辑文章: ' + article.title, true);
        }
    } catch (error) {
        showNotification('编辑失败，请重试', false);
    }
}

// 删除文章
async function deleteArticle(id) {
    if (confirm('确定要删除这篇文章吗？')) {
        try {
            const token = localStorage.getItem('authToken');
            const content = await getCurrentContent();
            content.articles = content.articles.filter(a => a.id !== id);

            const response = await saveContentData(content);

            if (response) {
                showNotification('文章已删除', true);
                renderArticlesList(content.articles);
            } else {
                showNotification('删除失败，请重试', false);
            }
        } catch (error) {
            console.log('删除文章异常:', error);
            showNotification('网络错误，请重试', false);
        }
    }
}

// 🗑️ 编辑图片功能已移除
// 由于改为纯上传模式，编辑功能不再适用
async function editImage(id) {
    showNotification('编辑功能已移除，请删除后重新上传图片', false);
}

// 删除图片
async function deleteImage(id) {
    if (confirm('确定要删除这张图片吗？')) {
        try {
            const token = localStorage.getItem('authToken');
            const content = await getCurrentContent();
            content.images = content.images.filter(i => i.id !== id);

            const response = await saveContentData(content);

            if (response) {
                showNotification('图片已删除', true);
                renderImagesList(content.images);
            } else {
                showNotification('删除失败，请重试', false);
            }
        } catch (error) {
            console.log('删除网络异常:', error);
            showNotification('网络错误，请重试', false);
        }
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('authToken');
    showNotification('您已成功退出', true);
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}