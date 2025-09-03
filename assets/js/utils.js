// 统一工具函数
const Utils = {
    // 显示通知
    showNotification(message, isSuccess = true) {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `notification ${isSuccess ? 'success' : 'error'} show`;
            setTimeout(() => notification.classList.remove('show'), 5000);
        }
    },

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // 格式化文件大小
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    },

    // 截断文本
    truncateText(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // HTML 转义
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 滚动到顶部
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // 切换主题
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const icon = document.querySelector('.quick-btn i.fa-moon');
        if (icon) {
            icon.className = document.body.classList.contains('dark-theme') ? 'fas fa-sun' : 'fas fa-moon';
        }
    },

    // 显示/隐藏加载动画
    showLoading(show = true) {
        const loading = document.getElementById('page-loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 生成唯一ID
    generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // 验证文件类型
    validateFile(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
        if (!file) return { valid: false, error: '没有选择文件' };
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: '不支持的文件类型' };
        }
        if (file.size > 5 * 1024 * 1024) {
            return { valid: false, error: '文件大小不能超过5MB' };
        }
        return { valid: true };
    },

    // 创建图片预览
    createImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        url: e.target.result,
                        width: img.width,
                        height: img.height,
                        size: file.size,
                        type: file.type,
                        name: file.name
                    });
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // 初始化主题
    initTheme() {
        try { 
            if (window.AppTheme) {
                window.AppTheme.init(); 
            }
        } catch(_){}
    },

    // 登出功能
    logout() {
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    },

    // HTML实体解码
    decodeHtmlEntities(text) {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        const result = textarea.value;
        textarea.remove();
        return result;
    },

    // 获取友好的分类名称
    getFriendlyCategoryName(category) {
        const categoryMap = {
            'cat_article_1': '技术分享', 'cat_article_2': '生活随笔', 'cat_article_3': '学习笔记', 'cat_article_4': '项目展示',
            'cat_album_1': '风景摄影', 'cat_album_2': '人像摄影', 'cat_album_3': '美食摄影', 'cat_album_4': '旅行记录', 'cat_album_5': '工作日常'
        };
        return categoryMap[category] || category;
    },

    // 通用的认证状态检查
    async checkAuthStatus() {
        const token = sessionStorage.getItem('authToken');
        if (!token) return false;
        
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Auth verification failed:', error);
            return false;
        }
    },

    // 创建统一导航栏
    createNavigation(currentPage = '') {
        return `
<header class="unified-header">
    <nav class="unified-nav">
        <a href="index.html" class="logo" aria-label="返回首页">
            <i class="fas fa-palette"></i>
            <span class="logo-text">创作空间</span>
        </a>
        <div class="nav-links">
            <a href="index.html" class="nav-item ${currentPage === 'home' ? 'active' : ''}">
                <i class="fas fa-home"></i>
                <span>首页</span>
            </a>
            <a href="articles.html" class="nav-item ${currentPage === 'articles' ? 'active' : ''}">
                <i class="fas fa-newspaper"></i>
                <span>文章</span>
            </a>
            <a href="albums.html" class="nav-item ${currentPage === 'albums' ? 'active' : ''}">
                <i class="fas fa-images"></i>
                <span>相册</span>
            </a>
            <a href="admin.html" id="admin-link" class="nav-item ${currentPage === 'admin' ? 'active' : ''}" style="display: none;">
                <i class="fas fa-cog"></i>
                <span>管理</span>
            </a>
            <a href="#" id="logout-link" class="nav-item" style="display: none;">
                <i class="fas fa-sign-out-alt"></i>
                <span>退出</span>
            </a>
        </div>
        
        <!-- 移动端菜单按钮 -->
        <button class="mobile-menu-toggle" id="mobile-menu-toggle">
            <i class="fas fa-bars"></i>
        </button>
    </nav>
</header>`;
    },

    // 初始化导航栏
    initNavigation(currentPage = '') {
        // 创建导航栏HTML
        const navHTML = this.createNavigation(currentPage);
        
        // 插入到页面顶部
        if (document.body.firstChild) {
            document.body.insertAdjacentHTML('afterbegin', navHTML);
        } else {
            document.body.innerHTML = navHTML + document.body.innerHTML;
        }

        // 绑定事件
        this.bindNavigationEvents();
    },

    // 绑定导航栏事件
    bindNavigationEvents() {
        // 移动端菜单切换
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileToggle && navLinks) {
            mobileToggle.addEventListener('click', () => {
                navLinks.classList.toggle('show');
                const icon = mobileToggle.querySelector('i');
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            });
        }

        // 退出登录事件
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // 检查认证状态并显示对应链接
        this.updateNavigationVisibility();
    },

    // 更新导航栏可见性
    async updateNavigationVisibility() {
        const isLoggedIn = sessionStorage.getItem('authToken');
        const adminLink = document.getElementById('admin-link');
        const logoutLink = document.getElementById('logout-link');
        
        if (isLoggedIn) {
            if (adminLink) adminLink.style.display = 'flex';
            if (logoutLink) logoutLink.style.display = 'flex';
        } else {
            if (adminLink) adminLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'none';
        }
    }
}; 