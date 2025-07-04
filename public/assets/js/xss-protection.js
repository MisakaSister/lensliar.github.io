// public/assets/js/xss-protection.js - 前端XSS防护

class XSSProtection {
    constructor() {
        this.init();
    }

    init() {
        this.setupGlobalProtection();
        this.protectTokenStorage();
        this.setupFormProtection();
        this.protectDynamicContent();
    }

    // 1. 全局防护设置
    setupGlobalProtection() {
        // 禁用eval
        window.eval = function() {
            throw new Error('eval is disabled for security reasons');
        };

        // 保护全局函数
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(fn, delay) {
            if (typeof fn === 'string') {
                throw new Error('String-based setTimeout is disabled for security reasons');
            }
            return originalSetTimeout.call(this, fn, delay);
        };

        const originalSetInterval = window.setInterval;
        window.setInterval = function(fn, delay) {
            if (typeof fn === 'string') {
                throw new Error('String-based setInterval is disabled for security reasons');
            }
            return originalSetInterval.call(this, fn, delay);
        };
    }

    // 2. Token存储保护
    protectTokenStorage() {
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;

        // 监控localStorage访问
        localStorage.setItem = function(key, value) {
            if (key === 'adminToken') {
                // 验证token格式
                if (!this.isValidToken(value)) {
                    console.warn('Attempted to store invalid token');
                    return;
                }
                
                // 添加时间戳
                const tokenData = {
                    token: value,
                    timestamp: Date.now(),
                    expires: Date.now() + 3600000 // 1小时
                };
                
                return originalSetItem.call(this, key, JSON.stringify(tokenData));
            }
            return originalSetItem.call(this, key, value);
        }.bind(this);

        localStorage.getItem = function(key) {
            if (key === 'adminToken') {
                const data = originalGetItem.call(this, key);
                if (!data) return null;

                try {
                    const tokenData = JSON.parse(data);
                    
                    // 检查过期
                    if (Date.now() > tokenData.expires) {
                        localStorage.removeItem(key);
                        return null;
                    }
                    
                    return tokenData.token;
                } catch {
                    localStorage.removeItem(key);
                    return null;
                }
            }
            return originalGetItem.call(this, key);
        };
    }

    // 3. 表单输入防护
    setupFormProtection() {
        // 监听所有表单提交
        document.addEventListener('submit', (e) => {
            this.validateForm(e.target);
        });

        // 监听输入事件
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                this.validateInput(e.target);
            }
        });
    }

    // 4. 动态内容保护
    protectDynamicContent() {
        // 保护innerHTML
        const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function(value) {
                const sanitized = this.sanitizeHtml(value);
                originalInnerHTML.set.call(this, sanitized);
            }.bind(this),
            get: originalInnerHTML.get
        });

        // 监控DOM变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanElement(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 验证Token格式
    isValidToken(token) {
        if (!token || typeof token !== 'string') return false;
        
        // Token应该是64字符的十六进制字符串
        return /^[a-f0-9]{64}$/i.test(token);
    }

    // 验证表单
    validateForm(form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            this.validateInput(input);
        });
    }

    // 验证输入
    validateInput(input) {
        const value = input.value;
        const type = input.type || 'text';

        // 检查危险内容
        if (this.containsXSS(value)) {
            input.value = this.sanitizeText(value);
            this.showWarning('输入内容已被清理，检测到潜在的安全风险');
        }

        // 特殊验证
        if (type === 'url' && value) {
            const sanitizedUrl = this.sanitizeUrl(value);
            if (sanitizedUrl !== value) {
                input.value = sanitizedUrl;
                this.showWarning('URL已被清理');
            }
        }
    }

    // 检测XSS
    containsXSS(text) {
        if (!text || typeof text !== 'string') return false;

        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /on\w+\s*=/gi,
            /<img[^>]*onerror[^>]*>/gi,
            /<svg[^>]*onload[^>]*>/gi,
            /expression\s*\(/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi
        ];

        return xssPatterns.some(pattern => pattern.test(text));
    }

    // HTML清理
    sanitizeHtml(html) {
        if (!html || typeof html !== 'string') return html;

        // 创建临时DOM元素
        const temp = document.createElement('div');
        temp.textContent = html; // 这会自动转义HTML
        
        return temp.innerHTML;
    }

    // 文本清理
    sanitizeText(text) {
        if (!text || typeof text !== 'string') return text;

        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    }

    // URL清理
    sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '';

        // 移除危险协议
        const dangerousProtocols = [
            'javascript:', 'vbscript:', 'data:', 'file:', 'ftp:'
        ];

        let cleaned = url.trim();
        
        dangerousProtocols.forEach(protocol => {
            if (cleaned.toLowerCase().startsWith(protocol)) {
                cleaned = '';
            }
        });

        // 验证URL格式
        try {
            const parsed = new URL(cleaned);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return '';
            }
            return parsed.toString();
        } catch {
            return '';
        }
    }

    // 扫描元素
    scanElement(element) {
        // 检查属性
        const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
        
        dangerousAttrs.forEach(attr => {
            if (element.hasAttribute(attr)) {
                element.removeAttribute(attr);
                this.showWarning(`移除了危险属性: ${attr}`);
            }
        });

        // 检查子元素
        const children = element.querySelectorAll('*');
        children.forEach(child => {
            dangerousAttrs.forEach(attr => {
                if (child.hasAttribute(attr)) {
                    child.removeAttribute(attr);
                }
            });
        });
    }

    // 显示警告
    showWarning(message) {
        console.warn('[XSS Protection]', message);
        
        // 可以添加UI提示
        if (window.showToast) {
            window.showToast(message, 'warning');
        }
    }

    // 安全的AJAX请求
    safeAjax(options) {
        const defaults = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        };

        const config = { ...defaults, ...options };

        // 验证URL
        if (!this.sanitizeUrl(config.url)) {
            throw new Error('Invalid URL');
        }

        // 添加CSRF防护
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // 清理请求数据
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(this.sanitizeObject(config.body));
        }

        return fetch(config.url, config);
    }

    // 对象清理
    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanKey = this.sanitizeText(key);
            
            if (typeof value === 'string') {
                sanitized[cleanKey] = this.sanitizeText(value);
            } else if (typeof value === 'object') {
                sanitized[cleanKey] = this.sanitizeObject(value);
            } else {
                sanitized[cleanKey] = value;
            }
        }

        return sanitized;
    }

    // 安全的元素创建
    createElement(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        // 设置属性
        for (const [key, value] of Object.entries(attributes)) {
            const cleanKey = this.sanitizeText(key);
            const cleanValue = this.sanitizeText(value);
            
            // 跳过危险属性
            if (cleanKey.startsWith('on')) continue;
            
            element.setAttribute(cleanKey, cleanValue);
        }

        // 设置文本内容
        if (textContent) {
            element.textContent = this.sanitizeText(textContent);
        }

        return element;
    }
}

// 初始化XSS防护
const xssProtection = new XSSProtection();

// 导出供其他模块使用
window.XSSProtection = XSSProtection;
window.xssProtection = xssProtection; 