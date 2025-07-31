// 文章编辑页面专用文件

// 确保API_BASE可用
if (typeof API_BASE === 'undefined') {
    console.error('API_BASE 未定义，请确保 app.js 已正确加载');
    window.API_BASE = 'https://worker.wengguodong.com';
}

let tinyMCEEditor;
let editingArticle = null;
let selectedFiles = [];

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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('页面开始加载...');
        
        // 检查登录状态
        await checkAuthStatus();
        
        // 获取URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');
        
        console.log('文章ID:', articleId);
        
        // 初始化页面
        await initPage(articleId);
        
        console.log('页面初始化完成');
        
        // 强制隐藏加载遮罩
        setTimeout(() => {
            hideLoading();
            console.log('强制隐藏加载遮罩');
            
            // 延迟检查编辑器状态
            setTimeout(() => {
                checkEditorStatus();
            }, 2000);
        }, 1000);
        
    } catch (error) {
        console.error('页面初始化失败:', error);
        showNotification('页面加载失败: ' + error.message, false);
    } finally {
        // 确保隐藏加载遮罩
        hideLoading();
    }
});

// 检查认证状态
async function checkAuthStatus() {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            sessionStorage.removeItem('authToken');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('验证token失败:', error);
        sessionStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}

// 初始化页面
async function initPage(articleId) {
    try {
        console.log('开始初始化页面...');
        
        // 加载分类列表
        console.log('加载分类列表...');
        await loadArticleCategories();
        
        // 初始化TinyMCE编辑器
        console.log('初始化TinyMCE编辑器...');
        await initTinyMCEEditor();
        
        // 如果是编辑模式，加载文章数据
        if (articleId) {
            console.log('加载文章数据...');
            await loadArticleData(articleId);
            document.getElementById('page-title').innerHTML = '<i class="fas fa-edit"></i> 编辑文章';
        }
        
        // 设置事件监听器
        console.log('设置事件监听器...');
        setupEventListeners();
        
        console.log('页面初始化完成');
        
        // 强制隐藏加载遮罩
        setTimeout(() => {
            hideLoading();
            console.log('强制隐藏加载遮罩');
            
            // 延迟检查编辑器状态
            setTimeout(() => {
                checkEditorStatus();
            }, 2000);
        }, 1000);
        
    } catch (error) {
        console.error('初始化页面失败:', error);
        throw error;
    }
}

// 初始化TinyMCE编辑器
async function initTinyMCEEditor() {
    try {
        console.log('开始初始化TinyMCE...');
        
        // 检查TinyMCE是否可用
        if (typeof tinymce === 'undefined') {
            console.error('TinyMCE未加载');
            showNotification('TinyMCE库未加载，请刷新页面重试', false);
            return;
        }
        
        if (tinyMCEEditor && tinyMCEEditor.destroy) {
            tinyMCEEditor.destroy();
        }

        // 检查目标元素
        const editorContainer = document.getElementById('article-content-editor');
        if (!editorContainer) {
            console.error('找不到编辑器容器元素');
            return;
        }
        console.log('找到编辑器容器:', editorContainer);
        
        // 清空任何多余内容
        editorContainer.value = '';
        editorContainer.innerHTML = '';

        // 添加超时处理
        const initPromise = new Promise((resolve, reject) => {
            tinymce.init({
                selector: '#article-content-editor',
                height: 1000,
                // 只保留最核心的插件：列表和图片
                plugins: [
                    'lists image'
                ],
                // 简化工具栏，只保留最常用功能
                toolbar: 'undo redo | bold italic | bullist numlist | image',
                menubar: false,
                content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 16px; line-height: 1.6; }',
                images_upload_url: `${API_BASE}/upload`,
                images_upload_credentials: true,
                images_upload_handler: function (blobInfo, success, failure) {
                    const formData = new FormData();
                    formData.append('file', blobInfo.blob(), blobInfo.filename());
                    
                    const token = sessionStorage.getItem('authToken');
                    if (!token) {
                        failure('未找到认证token');
                        return;
                    }
                    
                    fetch(`${API_BASE}/upload`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    })
                    .then(response => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    })
                    .then(result => {
                        if (result && result.url) {
                            success(result.url);
                            showNotification('图片上传成功');
                        } else {
                            failure('服务器返回的数据格式错误');
                        }
                    })
                    .catch(error => {
                        console.error('图片上传错误:', error);
                        failure(`上传失败: ${error.message}`);
                    });
                },
                branding: false,
                elementpath: false,
                statusbar: false,
                resize: true,
                cache_suffix: '?v=1.0.25',
                browser_spellcheck: false,
                // 确保编辑器可编辑
                readonly: false,
                // 简化粘贴设置
                paste_data_images: true,
                paste_as_text: false,
                paste_enable_default_filters: true,
                // 强制设置编辑器为可编辑
                forced_root_block: 'p',
                force_br_newlines: false,
                force_p_newlines: true,
                remove_linebreaks: false,
                convert_newlines_to_brs: false,
                remove_redundant_brs: false,
                setup: function(editor) {
                    console.log('TinyMCE setup函数被调用');
                    
                    // 确保编辑器可编辑
                    editor.on('init', function() {
                        console.log('TinyMCE编辑器UI初始化完成');
                        
                        // 强制设置编辑器为可编辑状态
                        editor.setMode('design');
                        editor.setContent('<p>请在此输入文章内容...</p>');
                        
                        // 确保编辑器内容区域可编辑
                        const editorBody = editor.getBody();
                        if (editorBody) {
                            editorBody.contentEditable = 'true';
                            editorBody.style.pointerEvents = 'auto';
                            editorBody.style.userSelect = 'text';
                            console.log('编辑器body已设置为可编辑');
                        }
                        
                        // 聚焦到编辑器
                        setTimeout(() => {
                            editor.focus();
                            console.log('编辑器已聚焦');
                            
                            // 再次确保编辑器可编辑
                            editor.setMode('design');
                            console.log('编辑器模式设置为design');
                            
                            // 测试输入
                            const testContent = editor.getContent();
                            console.log('当前编辑器内容:', testContent);
                            
                        }, 200);
                        
                        // 强制隐藏加载遮罩
                        hideLoading();
                        
                        // 保存编辑器实例
                        tinyMCEEditor = editor;
                        console.log('编辑器实例已保存:', tinyMCEEditor);
                    });
                    
                    editor.on('change', function() {
                        const hiddenField = document.getElementById('article-content');
                        if (hiddenField) {
                            hiddenField.value = editor.getContent();
                        }
                        console.log('编辑器内容变化:', editor.getContent());
                    });
                    
                    // 添加点击事件确保编辑器可交互
                    editor.on('click', function() {
                        console.log('编辑器被点击');
                        editor.focus();
                        editor.setMode('design');
                    });
                    
                    // 添加键盘事件监听
                    editor.on('keydown', function(e) {
                        console.log('键盘事件:', e.key, '编辑器模式:', editor.getMode());
                    });
                    
                    // 确保编辑器内容可编辑
                    editor.on('focus', function() {
                        console.log('编辑器获得焦点');
                        editor.setMode('design');
                    });
                    
                    editor.on('blur', function() {
                        console.log('编辑器失去焦点');
                    });
                    
                    // 添加更多调试事件
                    editor.on('NodeChange', function() {
                        console.log('编辑器节点变化');
                    });
                    
                    editor.on('KeyUp', function() {
                        console.log('键盘抬起事件');
                    });
                }
            }).then(function(editors) {
                console.log('TinyMCE初始化成功，返回的编辑器:', editors);
                if (editors && editors.length > 0) {
                    tinyMCEEditor = editors[0];
                    console.log('设置编辑器实例:', tinyMCEEditor);
                    resolve(tinyMCEEditor);
                } else {
                    reject(new Error('没有返回有效的编辑器实例'));
                }
            }).catch(function(error) {
                console.error('TinyMCE初始化失败:', error);
                reject(error);
            });
        });

        // 设置超时
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TinyMCE初始化超时')), 10000);
        });

        tinyMCEEditor = await Promise.race([initPromise, timeoutPromise]);
        console.log('TinyMCE初始化成功');
        
        // 强制显示编辑器
        setTimeout(() => {
            const editorElement = document.querySelector('.tox.tox-tinymce');
            if (editorElement) {
                editorElement.style.display = 'block';
                editorElement.style.visibility = 'visible';
                editorElement.style.opacity = '1';
                console.log('强制显示TinyMCE编辑器');
            } else {
                console.error('找不到TinyMCE编辑器元素');
            }
            
            // 强制设置编辑器可编辑
            forceEditorEditable();
        }, 100);
        
    } catch (error) {
        console.error('TinyMCE初始化失败:', error);
        console.error('错误详情:', error.message, error.stack);
        showNotification('富文本编辑器加载失败，请刷新页面重试', false);
    }
}

// 强制设置编辑器可编辑
function forceEditorEditable() {
    if (tinyMCEEditor) {
        try {
            // 确保编辑器内容区域可编辑
            const editorBody = tinyMCEEditor.getBody();
            if (editorBody) {
                editorBody.contentEditable = 'true';
                editorBody.style.pointerEvents = 'auto';
                editorBody.style.userSelect = 'text';
                console.log('强制设置body为可编辑');
            }
        } catch (error) {
            console.error('强制设置编辑器可编辑失败:', error);
        }
    }
}

// 检查编辑器状态
function checkEditorStatus() {
    console.log('=== 检查编辑器状态 ===');
    
    if (!tinyMCEEditor) {
        console.error('TinyMCE编辑器未初始化');
        return;
    }
    
    console.log('编辑器实例:', tinyMCEEditor);
    
    // 检查编辑器是否有有效的方法
    if (typeof tinyMCEEditor.getMode !== 'function') {
        console.error('编辑器实例无效，缺少getMode方法');
        console.log('编辑器类型:', typeof tinyMCEEditor);
        console.log('编辑器构造函数:', tinyMCEEditor.constructor);
        return;
    }
    
    console.log('编辑器模式:', tinyMCEEditor.getMode());
    console.log('编辑器内容:', tinyMCEEditor.getContent());
    
    // 检查编辑器DOM元素
    const editorElement = document.querySelector('.tox.tox-tinymce');
    if (editorElement) {
        console.log('编辑器DOM元素:', editorElement);
        console.log('编辑器显示状态:', window.getComputedStyle(editorElement).display);
        console.log('编辑器可见性:', window.getComputedStyle(editorElement).visibility);
        console.log('编辑器透明度:', window.getComputedStyle(editorElement).opacity);
        console.log('编辑器指针事件:', window.getComputedStyle(editorElement).pointerEvents);
    }
    
    // 检查编辑器内容区域
    const editorBody = tinyMCEEditor.getBody();
    if (editorBody) {
        console.log('编辑器body:', editorBody);
        console.log('body contentEditable:', editorBody.contentEditable);
        console.log('body pointerEvents:', editorBody.style.pointerEvents);
        console.log('body userSelect:', editorBody.style.userSelect);
    }
    
    // 尝试强制设置编辑器为可编辑
    try {
        tinyMCEEditor.setMode('design');
        console.log('设置编辑器为design模式');
        
        if (editorBody) {
            editorBody.contentEditable = 'true';
            editorBody.style.pointerEvents = 'auto';
            editorBody.style.userSelect = 'text';
            console.log('设置body为可编辑');
        }
        
        tinyMCEEditor.focus();
        console.log('聚焦编辑器');
        
    } catch (error) {
        console.error('设置编辑器状态时出错:', error);
    }
}

// 加载文章分类
async function loadArticleCategories() {
    try {
        const token = sessionStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/content/categories`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const categories = await response.json();
            console.log('API返回的分类数据:', categories);
            
            // 验证返回的数据是否为数组
            if (Array.isArray(categories)) {
                renderCategorySelect(categories);
            } else if (categories && categories.categories && Array.isArray(categories.categories)) {
                // 如果数据包装在categories属性中
                console.log('使用categories.categories:', categories.categories);
                renderCategorySelect(categories.categories);
            } else {
                console.error('分类数据格式错误:', categories);
                // 使用默认分类
                renderCategorySelect([
                    { id: 'cat_article_1', name: '技术分享' },
                    { id: 'cat_article_2', name: '生活随笔' },
                    { id: 'cat_article_3', name: '学习笔记' },
                    { id: 'cat_article_4', name: '项目展示' }
                ]);
            }
        } else {
            console.error('加载分类失败');
            // 使用默认分类
            renderCategorySelect([
                { id: 'cat_article_1', name: '技术分享' },
                { id: 'cat_article_2', name: '生活随笔' },
                { id: 'cat_article_3', name: '学习笔记' },
                { id: 'cat_article_4', name: '项目展示' }
            ]);
        }
    } catch (error) {
        console.error('加载分类错误:', error);
        // 使用默认分类
        renderCategorySelect([
            { id: 'cat_article_1', name: '技术分享' },
            { id: 'cat_article_2', name: '生活随笔' },
            { id: 'cat_article_3', name: '学习笔记' },
            { id: 'cat_article_4', name: '项目展示' }
        ]);
    }
}

// 渲染分类选择器
function renderCategorySelect(categories) {
    const select = document.getElementById('article-category');
    if (!select) {
        console.error('找不到分类选择器元素');
        return;
    }
    
    console.log('渲染分类选择器，数据:', categories);
    
    select.innerHTML = '<option value="">请选择分类</option>';
    
    if (!Array.isArray(categories)) {
        console.error('categories不是数组:', categories);
        return;
    }
    
    categories.forEach((category, index) => {
        console.log(`处理分类 ${index}:`, category);
        const option = document.createElement('option');
        option.value = category.id || category;
        option.textContent = category.name || getFriendlyCategoryName(category.id || category);
        select.appendChild(option);
    });
    
    console.log('分类选择器渲染完成');
}

// 加载文章数据（编辑模式）
async function loadArticleData(articleId) {
    try {
        showLoading();
        const token = sessionStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/content/articles/${articleId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            editingArticle = await response.json();
            fillArticleForm(editingArticle);
        } else {
            showNotification('加载文章失败', false);
        }
    } catch (error) {
        console.error('加载文章错误:', error);
        showNotification('加载文章失败', false);
    } finally {
        hideLoading();
    }
}

// 填充文章表单
function fillArticleForm(article) {
    document.getElementById('article-title').value = article.title || '';
    document.getElementById('article-category').value = article.category || '';
    
    if (tinyMCEEditor) {
        tinyMCEEditor.setContent(article.content || '');
    }
    
    if (article.cover_image) {
        showArticleImagePreview(article.cover_image);
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 退出登录
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // 页面离开前提示
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = '您有未保存的更改，确定要离开吗？';
        }
    });
}

// 检查是否有未保存的更改
function hasUnsavedChanges() {
    const title = document.getElementById('article-title').value;
    const content = tinyMCEEditor ? tinyMCEEditor.getContent() : '';
    const category = document.getElementById('article-category').value;
    
    return title.trim() !== '' || content.trim() !== '' || category !== '';
}

// 保存文章
async function saveArticle() {
    try {
        showLoading();
        
        const title = document.getElementById('article-title').value.trim();
        const category = document.getElementById('article-category').value;
        const content = tinyMCEEditor ? tinyMCEEditor.getContent() : '';
        const coverImage = document.getElementById('article-cover-image').value;
        
        console.log('保存文章数据:', {
            title,
            category,
            contentLength: content.length,
            coverImage: coverImage ? '已设置' : '未设置',
            isEdit: !!editingArticle
        });
        
        if (!title) {
            showNotification('请输入文章标题', false);
            return;
        }
        
        if (!content.trim()) {
            showNotification('请输入文章内容', false);
            return;
        }
        
        const articleData = {
            title: title,
            category: category,
            content: content,
            cover_image: coverImage
        };
        
        const token = sessionStorage.getItem('authToken');
        const url = editingArticle 
            ? `${API_BASE}/content/articles/${editingArticle.id}`
            : `${API_BASE}/content/articles`;
        
        const method = editingArticle ? 'PUT' : 'POST';
        
        console.log('发送请求:', {
            url,
            method,
            token: token ? '已设置' : '未设置'
        });
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(articleData)
        });
        
        console.log('响应状态:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('保存成功:', result);
            showNotification(editingArticle ? '文章更新成功' : '文章创建成功');
            
            // 延迟跳转，让用户看到成功提示
            setTimeout(() => {
                window.location.href = 'article-admin.html';
            }, 1500);
        } else {
            const errorText = await response.text();
            console.error('保存失败 - 状态码:', response.status);
            console.error('保存失败 - 错误信息:', errorText);
            showNotification(`保存失败: ${response.status} - ${errorText}`, false);
        }
    } catch (error) {
        console.error('保存文章错误:', error);
        console.error('错误详情:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        showNotification(`保存失败: ${error.message}`, false);
    } finally {
        hideLoading();
    }
}

// 处理图片选择
async function handleArticleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('图片大小不能超过5MB', false);
        return;
    }
    
    try {
        showNotification('正在上传图片...', true);
        const imageData = await uploadFile(file);
        showArticleImagePreview(imageData);
        showNotification('图片上传成功');
    } catch (error) {
        console.error('图片上传错误:', error);
        showNotification('图片上传失败', false);
    }
}

// 显示图片预览
function showArticleImagePreview(imageData) {
    const previewContainer = document.getElementById('article-image-preview');
    const hiddenInput = document.getElementById('article-cover-image');
    
    previewContainer.innerHTML = `
        <div class="preview-item">
            <img src="${imageData}" alt="封面图片">
            <button class="preview-remove" onclick="removeArticleImage()">×</button>
        </div>
    `;
    
    previewContainer.style.display = 'grid';
    hiddenInput.value = imageData;
}

// 移除图片
function removeArticleImage() {
    document.getElementById('article-image-preview').style.display = 'none';
    document.getElementById('article-cover-image').value = '';
    document.getElementById('article-image-file').value = '';
}

// 上传文件
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = sessionStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.url) {
        throw new Error('服务器返回的数据格式错误');
    }
    
    return result.url;
}

// 返回上一页
function goBack() {
    if (hasUnsavedChanges()) {
        if (confirm('您有未保存的更改，确定要离开吗？')) {
            window.location.href = 'article-admin.html';
        }
    } else {
        window.location.href = 'article-admin.html';
    }
}

// 显示加载遮罩
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

// 隐藏加载遮罩
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
        loadingOverlay.style.visibility = 'hidden';
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.pointerEvents = 'none';
        console.log('加载遮罩已隐藏');
    } else {
        console.error('找不到加载遮罩元素');
    }
}

// 显示通知
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// 退出登录
function logout() {
    sessionStorage.removeItem('authToken');
    window.location.href = 'login.html';
}

// 测试编辑器状态
function testEditor() {
    console.log('=== 编辑器状态测试 ===');
    
    if (!tinyMCEEditor) {
        console.error('TinyMCE编辑器未初始化');
        alert('TinyMCE编辑器未初始化');
        return;
    }
    
    console.log('编辑器实例:', tinyMCEEditor);
    
    // 检查编辑器是否有有效的方法
    if (typeof tinyMCEEditor.getMode !== 'function') {
        console.error('编辑器实例无效，缺少getMode方法');
        console.log('编辑器类型:', typeof tinyMCEEditor);
        console.log('编辑器构造函数:', tinyMCEEditor.constructor);
        alert('编辑器实例无效，请刷新页面重试');
        return;
    }
    
    console.log('编辑器模式:', tinyMCEEditor.getMode());
    console.log('编辑器内容:', tinyMCEEditor.getContent());
    console.log('编辑器是否只读:', tinyMCEEditor.getMode() === 'readonly');
    
    // 检查编辑器DOM元素
    const editorElement = document.querySelector('.tox.tox-tinymce');
    if (editorElement) {
        console.log('编辑器DOM元素:', editorElement);
        console.log('编辑器显示状态:', window.getComputedStyle(editorElement).display);
        console.log('编辑器可见性:', window.getComputedStyle(editorElement).visibility);
        console.log('编辑器透明度:', window.getComputedStyle(editorElement).opacity);
        console.log('编辑器指针事件:', window.getComputedStyle(editorElement).pointerEvents);
    } else {
        console.error('找不到编辑器DOM元素');
    }
    
    // 检查编辑器内容区域
    const editorBody = tinyMCEEditor.getBody();
    if (editorBody) {
        console.log('编辑器body:', editorBody);
        console.log('body contentEditable:', editorBody.contentEditable);
        console.log('body pointerEvents:', editorBody.style.pointerEvents);
        console.log('body userSelect:', editorBody.style.userSelect);
    } else {
        console.error('找不到编辑器body');
    }
    
    // 尝试强制设置编辑器为可编辑
    try {
        tinyMCEEditor.setMode('design');
        console.log('强制设置编辑器为design模式');
        
        if (editorBody) {
            editorBody.contentEditable = 'true';
            editorBody.style.pointerEvents = 'auto';
            editorBody.style.userSelect = 'text';
            console.log('强制设置body为可编辑');
        }
        
        tinyMCEEditor.focus();
        console.log('强制聚焦编辑器');
        
        alert('编辑器状态已检查，请查看控制台输出');
    } catch (error) {
        console.error('设置编辑器状态时出错:', error);
        alert('设置编辑器状态时出错: ' + error.message);
    }
}