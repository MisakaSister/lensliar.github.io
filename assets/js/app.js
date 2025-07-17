// app.js - 全局应用配置和工具函数

// API配置
const API_BASE = 'https://lensliar.github.io.workers.dev';

// 全局配置
const CONFIG = {
    // 缓存配置
    CACHE_DURATION: 5 * 60 * 1000, // 5分钟缓存
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    
    // 分页配置
    ITEMS_PER_PAGE: 6,
    MAX_ITEMS: 100,
    
    // 性能配置
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    
    // 主题配置
    THEME_KEY: 'theme',
    AUTH_TOKEN_KEY: 'authToken',
    USER_INFO_KEY: 'userInfo'
};

// 缓存管理
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.timestamps = new Map();
    }
    
    set(key, value, duration = CONFIG.CACHE_DURATION) {
        this.cache.set(key, value);
        this.timestamps.set(key, Date.now() + duration);
    }
    
    get(key) {
        const timestamp = this.timestamps.get(key);
        if (timestamp && Date.now() < timestamp) {
            return this.cache.get(key);
        }
        this.delete(key);
        return null;
    }
    
    delete(key) {
        this.cache.delete(key);
        this.timestamps.delete(key);
    }
    
    clear() {
        this.cache.clear();
        this.timestamps.clear();
    }
    
    has(key) {
        return this.cache.has(key) && Date.now() < this.timestamps.get(key);
    }
}

// API客户端
class APIClient {
    constructor() {
        this.cache = new CacheManager();
        this.retryCount = 0;
    }
    
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
        
        // 检查缓存
        if (options.method === 'GET' && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            ...options
        };
        
        // 添加认证token
        const token = localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        try {
            const response = await this.makeRequest(url, config);
            
            // 缓存GET请求的响应
            if (options.method === 'GET' && response.ok) {
                const data = await response.json();
                this.cache.set(cacheKey, data);
                return data;
            }
            
            return response;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }
    
    async makeRequest(url, config, retryCount = 0) {
        try {
            const response = await fetch(url, config);
            
            if (response.ok) {
                return response;
            }
            
            // 处理特定错误
            if (response.status === 401) {
                this.handleAuthError();
                throw new Error('认证失败');
            }
            
            if (response.status === 429) {
                throw new Error('请求过于频繁，请稍后重试');
            }
            
            if (response.status >= 500) {
                throw new Error('服务器错误，请稍后重试');
            }
            
            throw new Error(`请求失败: ${response.status}`);
            
        } catch (error) {
            if (retryCount < CONFIG.MAX_RETRIES && this.shouldRetry(error)) {
                await this.delay(CONFIG.RETRY_DELAY * (retryCount + 1));
                return this.makeRequest(url, config, retryCount + 1);
            }
            throw error;
        }
    }
    
    shouldRetry(error) {
        return error.message.includes('网络') || 
               error.message.includes('服务器') ||
               error.name === 'TypeError';
    }
    
    handleAuthError() {
        localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_INFO_KEY);
        this.cache.clear();
        
        // 如果在管理页面，跳转到登录页
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'login.html';
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 便捷方法
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }
    
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// 全局API实例
const api = new APIClient();

// 性能优化工具
class PerformanceUtils {
    static debounce(func, wait = CONFIG.DEBOUNCE_DELAY) {
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
    
    static throttle(func, limit = CONFIG.THROTTLE_DELAY) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    static lazyLoad(selector, callback) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });
        
        document.querySelectorAll(selector).forEach(el => observer.observe(el));
    }
    
    static preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
}

// 主题管理
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme();
        this.init();
    }
    
    getStoredTheme() {
        return localStorage.getItem(CONFIG.THEME_KEY) || 'light';
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
    }
    
    applyTheme(theme) {
        document.body.classList.toggle('dark-theme', theme === 'dark');
        this.currentTheme = theme;
        localStorage.setItem(CONFIG.THEME_KEY, theme);
        
        // 更新主题图标
        const themeIcons = document.querySelectorAll('.quick-btn i');
        themeIcons.forEach(icon => {
            if (icon.classList.contains('fa-moon') || icon.classList.contains('fa-sun')) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        });
    }
    
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }
    
    setupThemeToggle() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.quick-btn') && 
                e.target.closest('.quick-btn').getAttribute('onclick')?.includes('toggleTheme')) {
                e.preventDefault();
                this.toggle();
            }
        });
    }
}

// 通知管理
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = this.createContainer();
    }
    
    createContainer() {
        let container = document.getElementById('notification');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification';
            container.className = 'notification';
            document.body.appendChild(container);
        }
        return container;
    }
    
    show(message, type = 'success', duration = 3000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            duration
        };
        
        this.notifications.push(notification);
        this.render(notification);
        
        setTimeout(() => {
            this.hide(notification.id);
        }, duration);
    }
    
    render(notification) {
        this.container.textContent = notification.message;
        this.container.className = `notification ${notification.type}`;
        this.container.style.display = 'block';
        
        // 添加动画
        this.container.style.animation = 'slideIn 0.3s ease-out';
    }
    
    hide(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index > -1) {
            this.notifications.splice(index, 1);
        }
        
        if (this.notifications.length === 0) {
            this.container.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                this.container.style.display = 'none';
            }, 300);
        }
    }
    
    success(message, duration) {
        this.show(message, 'success', duration);
    }
    
    error(message, duration) {
        this.show(message, 'error', duration);
    }
    
    warning(message, duration) {
        this.show(message, 'warning', duration);
    }
}

// 全局实例
const themeManager = new ThemeManager();
const notificationManager = new NotificationManager();

// 工具函数
const Utils = {
    // 日期格式化
    formatDate(dateString, options = {}) {
        if (!dateString) return '未知日期';
        
        const date = new Date(dateString);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return date.toLocaleDateString('zh-CN', { ...defaultOptions, ...options });
    },
    
    // HTML实体解码
    decodeHtmlEntities(text) {
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
    },
    
    // 内容图片解码
    decodeContentImages(content) {
        if (!content || typeof content !== 'string') return content;
        
        let decoded = Utils.decodeHtmlEntities(content);
        decoded = decoded.replace(/<img[^>]*>/g, '[图片]');
        decoded = decoded.replace(/<[^>]*>/g, '');
        
        return decoded;
    },
    
    // 数据排序
    sortData(data, sortType) {
        return [...data].sort((a, b) => {
            switch(sortType) {
                case 'date-desc':
                    return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
                case 'date-asc':
                    return new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
    },
    
    // 阅读时间估算
    estimateReadingTime(content) {
        if (!content) return 1;
        
        const textContent = content.replace(/<[^>]*>/g, '');
        const charCount = textContent.length;
        const minutes = Math.ceil(charCount / 300);
        
        return Math.max(1, minutes);
    },
    
    // 防抖
    debounce: PerformanceUtils.debounce,
    
    // 节流
    throttle: PerformanceUtils.throttle,
    
    // 滚动到顶部
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },
    
    // 复制到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            notificationManager.success('已复制到剪贴板');
        } catch (error) {
            console.error('复制失败:', error);
            notificationManager.error('复制失败');
        }
    },
    
    // 分享内容
    async shareContent(title, url) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    url
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    Utils.copyToClipboard(url);
                }
            }
        } else {
            Utils.copyToClipboard(url);
        }
    }
};

// 全局函数（向后兼容）
window.API_BASE = API_BASE;
window.api = api;
window.themeManager = themeManager;
window.notificationManager = notificationManager;
window.Utils = Utils;

// 便捷全局函数
window.toggleTheme = () => themeManager.toggle();
window.scrollToTop = () => Utils.scrollToTop();
window.showNotification = (message, isSuccess = true) => {
    notificationManager[isSuccess ? 'success' : 'error'](message);
};
