// 公共JavaScript - app.js

// 模拟数据存储 - 实际应用中会从GitHub加载
let contentData = {
    articles: [
        {
            id: 1,
            title: "静态网站的优势",
            content: "<p>静态网站具有速度快、安全性高、成本低等优势。它们不需要服务器端处理，可以直接从CDN提供服务，大大提高了访问速度。</p><p>此外，静态网站更容易部署和维护，特别适合个人博客、作品集和小型企业网站。</p><p>使用GitHub Pages等静态网站托管服务，您可以免费托管您的网站，并且享受自动HTTPS、全球CDN等高级功能。</p>",
            category: "技术",
            image: "https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            date: "2023-06-15"
        },
        {
            id: 2,
            title: "GitHub Pages使用指南",
            content: "<p>GitHub Pages是GitHub提供的免费静态网站托管服务。您可以直接从GitHub仓库托管个人、项目或组织页面。</p><p>要使用GitHub Pages，只需创建一个特殊的仓库（username.github.io），然后将您的静态网站文件推送到该仓库即可。</p><p>GitHub Pages支持自定义域名、HTTPS和Jekyll静态站点生成器，是个人项目和文档的理想选择。</p>",
            category: "教程",
            image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            date: "2023-06-10"
        }
    ],
    images: [
        {
            id: 1,
            title: "美丽的风景",
            category: "自然",
            description: "这张照片展示了壮丽的山脉和清澈的湖泊，捕捉了大自然的宁静与美丽。拍摄于加拿大班夫国家公园，使用专业设备在黄金时段拍摄。",
            url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            date: "2023-06-05"
        },
        {
            id: 2,
            title: "城市夜景",
            category: "城市",
            description: "繁华都市的夜景照片，展示了现代城市的灯光和活力。长时间曝光拍摄捕捉了车流的光轨和摩天大楼的轮廓，呈现出城市的动态美感。",
            url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            date: "2023-06-01"
        }
    ]
};

// 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 初始化页面
function initPage() {
    // 检查是否已登录
    if (localStorage.getItem('isLoggedIn')) {
        document.getElementById('admin-link')?.style.display = 'block';
        document.getElementById('logout-link')?.style.display = 'block';
    }
    
    // 页面特定初始化
    if (document.getElementById('home-page')) {
        renderArticles();
        renderGallery();
    }
    
    if (document.getElementById('admin-page')) {
        renderArticlesList();
        renderImagesList();
        setupFormEvents();
    }
    
    if (document.getElementById('detail-page')) {
        loadDetailContent();
    }
}

// 登录功能
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // 在实际应用中，这里会验证GitHub Secrets中的凭证
    if (username === 'admin' && password === 'password') {
        localStorage.setItem('isLoggedIn', 'true');
        showNotification('登录成功！', true);
        window.location.href = 'home.html';
    } else {
        showNotification('用户名或密码错误', false);
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('isLoggedIn');
    showNotification('您已成功退出', true);
    window.location.href = 'index.html';
}

// 渲染文章列表
function renderArticles() {
    const container = document.getElementById('articles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    contentData.articles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'card';
        articleElement.innerHTML = `
            <img src="${article.image}" alt="${article.title}" class="card-img">
            <div class="card-body">
                <h3 class="card-title">${article.title}</h3>
                <p class="card-text">${article.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                <div style="display:flex; justify-content:space-between; margin-top:15px;">
                    <span class="badge">${article.category}</span>
                    <span class="card-date">${article.date}</span>
                </div>
                <button class="btn" style="margin-top:10px; width:100%;" 
                        onclick="viewDetail('article', ${article.id})">查看详情</button>
            </div>
        `;
        container.appendChild(articleElement);
    });
}

// 渲染图片集
function renderGallery() {
    const container = document.getElementById('gallery-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    contentData.images.forEach(image => {
        const imageElement = document.createElement('div');
        imageElement.className = 'card';
        imageElement.innerHTML = `
            <img src="${image.url}" alt="${image.title}" class="card-img">
            <div class="card-body">
                <h3 class="card-title">${image.title}</h3>
                <div style="display:flex; justify-content:space-between; margin-top:15px;">
                    <span class="badge">${image.category}</span>
                    <span class="card-date">${image.date}</span>
                </div>
                <button class="btn" style="margin-top:10px; width:100%;" 
                        onclick="viewDetail('image', ${image.id})">查看详情</button>
            </div>
        `;
        container.appendChild(imageElement);
    });
}

// 渲染文章列表（管理后台）
function renderArticlesList() {
    const container = document.getElementById('articles-list-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    contentData.articles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'list-item';
        articleElement.innerHTML = `
            <div class="list-item-title">${article.title}</div>
            <div class="list-actions">
                <i class="fas fa-edit action-icon" title="编辑" onclick="editArticle(${article.id})"></i>
                <i class="fas fa-trash action-icon delete" title="删除" onclick="deleteArticle(${article.id})"></i>
            </div>
        `;
        container.appendChild(articleElement);
    });
}

// 渲染图片列表（管理后台）
function renderImagesList() {
    const container = document.getElementById('images-list-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    contentData.images.forEach(image => {
        const imageElement = document.createElement('div');
        imageElement.className = 'list-item';
        imageElement.innerHTML = `
            <div class="list-item-title">${image.title}</div>
            <div class="list-actions">
                <i class="fas fa-edit action-icon" title="编辑" onclick="editImage(${image.id})"></i>
                <i class="fas fa-trash action-icon delete" title="删除" onclick="deleteImage(${image.id})"></i>
            </div>
        `;
        container.appendChild(imageElement);
    });
}

// 设置表单事件
function setupFormEvents() {
    const articleImageInput = document.getElementById('article-image');
    if (articleImageInput) {
        articleImageInput.addEventListener('input', updateArticlePreview);
    }
    
    const imageUrlInput = document.getElementById('image-url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', updateImagePreview);
    }
}

// 更新文章图片预览
function updateArticlePreview() {
    const url = document.getElementById('article-image').value;
    const preview = document.getElementById('article-image-preview');
    
    if (url && preview) {
        preview.innerHTML = `<img src="${url}" alt="预览">`;
    } else if (preview) {
        preview.innerHTML = '<span>图片预览</span>';
    }
}

// 更新图片预览
function updateImagePreview() {
    const url = document.getElementById('image-url').value;
    const preview = document.getElementById('image-preview');
    
    if (url && preview) {
        preview.innerHTML = `<img src="${url}" alt="预览">`;
    } else if (preview) {
        preview.innerHTML = '<span>图片预览</span>';
    }
}

// 保存文章
function saveArticle() {
    const title = document.getElementById('article-title').value;
    const category = document.getElementById('article-category').value;
    const content = document.getElementById('article-content').value;
    const image = document.getElementById('article-image').value;
    
    if (!title || !content) {
        showNotification('标题和内容不能为空', false);
        return;
    }
    
    const newArticle = {
        id: Date.now(),
        title,
        content,
        category,
        image,
        date: new Date().toISOString().split('T')[0]
    };
    
    contentData.articles.push(newArticle);
    
    // 在实际应用中，这里会通过GitHub API保存到仓库
    renderArticles();
    renderArticlesList();
    clearArticleForm();
    
    showNotification('文章保存成功！', true);
}

// 保存图片
function saveImage() {
    const title = document.getElementById('image-title').value;
    const category = document.getElementById('image-category').value;
    const url = document.getElementById('image-url').value;
    const description = document.getElementById('image-description').value;
    
    if (!title || !url) {
        showNotification('标题和图片URL不能为空', false);
        return;
    }
    
    const newImage = {
        id: Date.now(),
        title,
        category,
        url,
        description,
        date: new Date().toISOString().split('T')[0]
    };
    
    contentData.images.push(newImage);
    
    // 在实际应用中，这里会通过GitHub API保存到仓库
    renderGallery();
    renderImagesList();
    clearImageForm();
    
    showNotification('图片保存成功！', true);
}

// 清空文章表单
function clearArticleForm() {
    document.getElementById('article-title').value = '';
    document.getElementById('article-category').value = '';
    document.getElementById('article-content').value = '';
    document.getElementById('article-image').value = '';
    const preview = document.getElementById('article-image-preview');
    if (preview) preview.innerHTML = '<span>图片预览</span>';
}

// 清空图片表单
function clearImageForm() {
    document.getElementById('image-title').value = '';
    document.getElementById('image-category').value = '';
    document.getElementById('image-url').value = '';
    document.getElementById('image-description').value = '';
    const preview = document.getElementById('image-preview');
    if (preview) preview.innerHTML = '<span>图片预览</span>';
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
function editArticle(id) {
    const article = contentData.articles.find(a => a.id === id);
    if (article) {
        document.getElementById('article-title').value = article.title;
        document.getElementById('article-category').value = article.category;
        document.getElementById('article-content').value = article.content;
        document.getElementById('article-image').value = article.image;
        updateArticlePreview();
        showNotification('正在编辑文章: ' + article.title, true);
    }
}

// 删除文章
function deleteArticle(id) {
    if (confirm('确定要删除这篇文章吗？')) {
        contentData.articles = contentData.articles.filter(a => a.id !== id);
        renderArticles();
        renderArticlesList();
        showNotification('文章已删除', true);
    }
}

// 编辑图片
function editImage(id) {
    const image = contentData.images.find(i => i.id === id);
    if (image) {
        document.getElementById('image-title').value = image.title;
        document.getElementById('image-category').value = image.category;
        document.getElementById('image-url').value = image.url;
        document.getElementById('image-description').value = image.description || '';
        updateImagePreview();
        showNotification('正在编辑图片: ' + image.title, true);
    }
}

// 删除图片
function deleteImage(id) {
    if (confirm('确定要删除这张图片吗？')) {
        contentData.images = contentData.images.filter(i => i.id !== id);
        renderGallery();
        renderImagesList();
        showNotification('图片已删除', true);
    }
}

// 查看详情
function viewDetail(type, id) {
    localStorage.setItem('currentDetail', JSON.stringify({ type, id }));
    window.location.href = 'detail.html';
}

// 加载详情内容
function loadDetailContent() {
    const detailData = JSON.parse(localStorage.getItem('currentDetail'));
    if (!detailData) {
        document.getElementById('detail-container').innerHTML = '<p>内容不存在</p>';
        return;
    }
    
    const { type, id } = detailData;
    
    if (type === 'article') {
        const article = contentData.articles.find(a => a.id === id);
        if (article) {
            renderArticleDetail(article);
            return;
        }
    } else if (type === 'image') {
        const image = contentData.images.find(i => i.id === id);
        if (image) {
            renderImageDetail(image);
            return;
        }
    }
    
    document.getElementById('detail-container').innerHTML = '<p>内容不存在</p>';
}

// 渲染文章详情
function renderArticleDetail(article) {
    const container = document.getElementById('detail-container');
    container.innerHTML = `
        <div class="detail-header">
            <h1 class="detail-title">${article.title}</h1>
            <div class="detail-meta">
                <span>分类: ${article.category}</span>
                <span>发布日期: ${article.date}</span>
            </div>
        </div>
        <img src="${article.image}" alt="${article.title}" class="detail-image">
        <div class="detail-content">${article.content}</div>
        <button class="btn back-btn" onclick="window.history.back()">返回</button>
    `;
}

// 渲染图片详情
function renderImageDetail(image) {
    const container = document.getElementById('detail-container');
    container.innerHTML = `
        <div class="detail-header">
            <h1 class="detail-title">${image.title}</h1>
            <div class="detail-meta">
                <span>分类: ${image.category}</span>
                <span>发布日期: ${image.date}</span>
            </div>
        </div>
        <img src="${image.url}" alt="${image.title}" class="detail-image">
        <div class="detail-content">
            <p>${image.description || ''}</p>
        </div>
        <button class="btn back-btn" onclick="window.history.back()">返回</button>
    `;
}

// 初始化页面
document.addEventListener('DOMContentLoaded', initPage);
