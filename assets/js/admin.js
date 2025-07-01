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

// 更新图片预览
function updateImagePreview() {
    const url = document.getElementById('image-url').value;
    const preview = document.getElementById('image-preview');

    if (url) {
        preview.innerHTML = `<img src="${url}" alt="预览">`;
    } else {
        preview.innerHTML = '<span>图片预览</span>';
    }
}

// 切换图片来源
function toggleImageSource() {
    const selectedSource = document.querySelector('input[name="image-source"]:checked').value;
    const urlGroup = document.getElementById('url-input-group');
    const uploadGroup = document.getElementById('upload-input-group');
    const preview = document.getElementById('image-preview');
    const progressDiv = document.getElementById('upload-progress');

    if (selectedSource === 'url') {
        urlGroup.style.display = 'block';
        uploadGroup.style.display = 'none';
        // 清空文件选择
        document.getElementById('image-file').value = '';
    } else {
        urlGroup.style.display = 'none';
        uploadGroup.style.display = 'block';
        // 清空URL输入
        document.getElementById('image-url').value = '';
    }
    
    // 重置预览和进度条
    preview.innerHTML = '<span>图片预览</span>';
    progressDiv.style.display = 'none';
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('image-preview');

    if (file) {
        // 检查文件大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('文件大小超过5MB限制', false);
            event.target.value = '';
            preview.innerHTML = '<span>图片预览</span>';
            return;
        }

        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            showNotification('请选择图片文件', false);
            event.target.value = '';
            preview.innerHTML = '<span>图片预览</span>';
            return;
        }

        // 显示预览
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="预览">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '<span>图片预览</span>';
    }
}

// 上传图片到Cloudflare
async function uploadImageToCloudflare(file) {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('file', file);

    // 显示进度条
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const statusDiv = document.getElementById('upload-status');
    
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    statusDiv.textContent = '准备上传...';

    try {
        // 使用XMLHttpRequest来支持进度监控
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // 监听上传进度
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentage = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percentage + '%';
                    statusDiv.textContent = `上传中... ${percentage}%`;
                }
            });

            // 监听状态变化
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        progressBar.style.width = '100%';
                        statusDiv.textContent = '上传完成！';
                        
                        // 3秒后隐藏进度条
                        setTimeout(() => {
                            progressDiv.style.display = 'none';
                        }, 3000);
                        
                        resolve(result.url);
                    } catch (parseError) {
                        reject(new Error('解析响应失败'));
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.message || '上传失败'));
                    } catch {
                        reject(new Error(`上传失败 (状态码: ${xhr.status})`));
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('网络错误，上传失败'));
            });

            xhr.addEventListener('timeout', () => {
                reject(new Error('上传超时'));
            });

            // 配置并发送请求
            xhr.open('POST', `${API_BASE}/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.withCredentials = true;
            xhr.timeout = 30000; // 30秒超时
            xhr.send(formData);
        });

    } catch (error) {
        // 隐藏进度条并显示错误
        progressDiv.style.display = 'none';
        console.error('上传图片错误:', error);
        throw error;
    }
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

// 保存图片
async function saveImage() {
    const title = document.getElementById('image-title').value;
    const category = document.getElementById('image-category').value;
    const description = document.getElementById('image-description').value;
    const selectedSource = document.querySelector('input[name="image-source"]:checked').value;

    if (!title) {
        showNotification('图片标题不能为空', false);
        return;
    }

    let imageUrl = '';

    try {
        if (selectedSource === 'url') {
            // URL模式
            imageUrl = document.getElementById('image-url').value;
            if (!imageUrl) {
                showNotification('请输入图片URL', false);
                return;
            }
        } else {
            // 上传模式
            const fileInput = document.getElementById('image-file');
            const file = fileInput.files[0];
            
            if (!file) {
                showNotification('请选择要上传的图片文件', false);
                return;
            }

            // 上传图片到Cloudflare
            imageUrl = await uploadImageToCloudflare(file);
        }

        // 保存图片数据
        const currentContent = await getCurrentContent();

        if (window.editingImageId) {
            // 编辑模式 - 更新现有图片
            const imageIndex = currentContent.images.findIndex(i => i.id === window.editingImageId);
            if (imageIndex !== -1) {
                currentContent.images[imageIndex] = {
                    ...currentContent.images[imageIndex],
                    title,
                    category,
                    description,
                    url: imageUrl
                };
                showNotification('图片已更新', true);
            }
        } else {
            // 新增模式
            const newImage = {
                id: Date.now(),
                title,
                category,
                description,
                url: imageUrl,
                date: new Date().toISOString().split('T')[0]
            };
            currentContent.images.push(newImage);
            showNotification('图片已保存', true);
        }

        const response = await saveContentData(currentContent);

        if (response) {
            clearImageForm();
            renderImagesList(currentContent.images);
        } else {
            showNotification('保存失败，请重试', false);
        }

    } catch (error) {
        console.log('保存图片异常:', error);
        showNotification('网络错误，请重试', false);
    }
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
    document.getElementById('image-url').value = '';
    document.getElementById('image-file').value = '';
    document.getElementById('image-description').value = '';
    document.getElementById('image-preview').innerHTML = '<span>图片预览</span>';
    
    // 重置为URL模式
    document.querySelector('input[name="image-source"][value="url"]').checked = true;
    document.getElementById('url-input-group').style.display = 'block';
    document.getElementById('upload-input-group').style.display = 'none';
    
    // 隐藏上传进度
    document.getElementById('upload-progress').style.display = 'none';
    
    // 清除编辑状态并重置按钮文本
    delete window.editingImageId;
    document.getElementById('save-image-btn').textContent = '保存图片';
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
            updateArticlePreview();

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

// 编辑图片
async function editImage(id) {
    try {
        const content = await getCurrentContent();
        const image = content.images.find(i => i.id === id);

        if (image) {
            // 显示图片表单
            showForm('image');
            
            // 填充表单数据
            document.getElementById('image-title').value = image.title;
            document.getElementById('image-category').value = image.category || '';
            document.getElementById('image-description').value = image.description || '';
            
            // 编辑时统一使用URL模式显示现有图片
            document.querySelector('input[name="image-source"][value="url"]').checked = true;
            document.getElementById('url-input-group').style.display = 'block';
            document.getElementById('upload-input-group').style.display = 'none';
            document.getElementById('image-url').value = image.url;
            document.getElementById('image-file').value = '';
            
            // 更新预览
            updateImagePreview();

            document.getElementById('image-form').scrollIntoView({ behavior: 'smooth' });
            showNotification('正在编辑图片: ' + image.title, true);
            
            // 存储正在编辑的图片ID，用于更新而不是新增
            window.editingImageId = id;
            
            // 更新按钮文本
            document.getElementById('save-image-btn').textContent = '更新图片';
        }
    } catch (error) {
        showNotification('编辑失败，请重试', false);
    }
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