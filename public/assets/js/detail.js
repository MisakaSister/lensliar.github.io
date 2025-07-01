// detail.js - 详情页面功能

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    loadDetailContent();
});

// 加载详情内容
async function loadDetailContent() {
    const detailData = JSON.parse(localStorage.getItem('currentDetail'));
    if (!detailData) {
        document.getElementById('detail-container').innerHTML = `
                <div class="detail-header">
                    <h1 class="detail-title">内容不存在</h1>
                    <p>请从首页选择内容查看</p>
                    <button class="btn back-btn" onclick="window.location.href='index.html'">返回首页</button>
                </div>
            `;
        return;
    }

    const { type, id } = detailData;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/content`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (response.ok) {
            const content = await response.json();

            if (type === 'article') {
                const article = content.articles.find(a => a.id === id);
                if (article) {
                    renderArticleDetail(article);
                    return;
                }
            } else if (type === 'image') {
                const image = content.images.find(i => i.id === id);
                if (image) {
                    renderImageDetail(image);
                    return;
                }
            }

            document.getElementById('detail-container').innerHTML = `
                    <div class="detail-header">
                        <h1 class="detail-title">内容不存在</h1>
                        <p>请求的内容可能已被删除</p>
                        <button class="btn back-btn" onclick="window.location.href='index.html'">返回首页</button>
                    </div>
                `;
        } else {
            showError();
        }
    } catch (error) {
        console.error('加载详情错误:', error);
        showError();
    }
}

// 渲染文章详情
function renderArticleDetail(article) {
    const container = document.getElementById('detail-container');
    container.innerHTML = `
            <div class="detail-header">
                <h1 class="detail-title">${article.title}</h1>
                <div class="detail-meta">
                    <span>分类: ${article.category || '未分类'}</span>
                    <span>发布日期: ${article.date || '未知日期'}</span>
                </div>
            </div>
            ${article.image ? `<img src="${article.image}" alt="${article.title}" class="detail-image">` : ''}
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
                    <span>分类: ${image.category || '未分类'}</span>
                    <span>发布日期: ${image.date || '未知日期'}</span>
                </div>
            </div>
            <img src="${image.url}" alt="${image.title}" class="detail-image">
            <div class="detail-content">
                <p>${image.description || ''}</p>
            </div>
            <button class="btn back-btn" onclick="window.history.back()">返回</button>
        `;
}

// 显示错误
function showError() {
    document.getElementById('detail-container').innerHTML = `
            <div class="detail-header">
                <h1 class="detail-title">加载失败</h1>
                <p>无法加载内容，请稍后再试</p>
                <button class="btn back-btn" onclick="window.location.href='index.html'">返回首页</button>
            </div>
        `;
} 