// public/assets/js/xss-protection.js - 前端XSS防护

class XSSProtection {
    constructor(options = {}) {
        this.options = {
            enableGlobalProtection: false,  // 默认关闭全局保护
            enableTokenProtection: true,    // 保持token保护
            enableFormProtection: false,    // 默认关闭表单保护 
            enableDOMProtection: false,     // 默认关闭DOM保护
            logWarnings: true,              // 保留日志
            ...options
        };
        this.init();
    }

    init() {
        if (this.options.enableGlobalProtection) {
            this.setupGlobalProtection();
        }
        if (this.options.enableTokenProtection) {
            this.protectTokenStorage();
        }
        if (this.options.enableFormProtection) {
            this.setupFormProtection();
        }
        if (this.options.enableDOMProtection) {
            this.protectDynamicContent();
        }
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

    // 2. Token存储保护（温和版本）
    protectTokenStorage() {
        const xssInstance = this;
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;

        // 监控localStorage访问，但不改变存储格式
        localStorage.setItem = function(key, value) {
            if (key === 'authToken' || key === 'adminToken') {
                // 验证token格式
                if (!xssInstance.isValidToken(value)) {
                    if (xssInstance.options.logWarnings) {
                        console.warn('[XSS Protection] Attempted to store invalid token format');
                    }
                    // 不阻止存储，只是警告
                }
            }
            return originalSetItem.call(this, key, value);
        };

        // 保持原有的获取逻辑，不修改存储格式
        localStorage.getItem = function(key) {
            const result = originalGetItem.call(this, key);
            
            if ((key === 'authToken' || key === 'adminToken') && result) {
                // 检查token是否有效，但不强制删除
                if (!xssInstance.isValidToken(result)) {
                    if (xssInstance.options.logWarnings) {
                        console.warn('[XSS Protection] Invalid token format detected');
                    }
                }
            }
            
            return result;
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

    // 4. 动态内容保护（非侵入式版本）
    protectDynamicContent() {
        // 不再重写innerHTML，改为提供安全的设置方法
        const xssInstance = this;
        
        // 只监控用户输入的内容
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // 检查但不修改内容
                const value = e.target.value;
                if (xssInstance.containsXSS(value)) {
                    e.target.setAttribute('data-xss-warning', 'true');
                    e.target.style.borderColor = '#ff6b6b';
                    e.target.title = '检测到可能的XSS内容';
                } else {
                    e.target.removeAttribute('data-xss-warning');
                    e.target.style.borderColor = '';
                    e.target.title = '';
                }
            }
        });
    }

    // 提供安全的HTML设置方法
    safeSetHTML(element, html) {
        if (!element || !html) return;
        
        // 只在用户输入或不信任的内容时使用
        const sanitized = this.sanitizeHtml(html);
        element.innerHTML = sanitized;
        
        if (this.options.logWarnings && sanitized !== html) {
            console.warn('[XSS Protection] HTML content was sanitized');
        }
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

    // 验证输入（温和版本）
    validateInput(input) {
        const value = input.value;
        const type = input.type || 'text';

        // 检查危险内容但不直接修改
        if (this.containsXSS(value)) {
            // 添加视觉提示
            input.style.borderColor = '#ff6b6b';
            input.title = '检测到潜在的安全风险内容';
            
            if (this.options.logWarnings) {
                this.showWarning('检测到潜在的XSS内容，请检查输入');
            }
        } else {
            // 移除警告样式
            input.style.borderColor = '';
            input.title = '';
        }

        // URL验证也改为非侵入式
        if (type === 'url' && value) {
            const sanitizedUrl = this.sanitizeUrl(value);
            if (sanitizedUrl !== value && sanitizedUrl === '') {
                input.style.borderColor = '#ff6b6b';
                input.title = 'URL格式或协议不安全';
                
                if (this.options.logWarnings) {
                    this.showWarning('检测到不安全的URL');
                }
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

    // HTML清理（改进版本）
    sanitizeHtml(html) {
        if (!html || typeof html !== 'string') return html;

        // 如果不包含HTML标签，直接返回
        if (!/<[^>]*>/g.test(html)) {
            return html;
        }

        // 创建临时DOM元素进行清理
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // 移除危险脚本
        const scripts = temp.querySelectorAll('script');
        scripts.forEach(script => script.remove());

        // 移除危险属性
        const allElements = temp.querySelectorAll('*');
        allElements.forEach(element => {
            // 移除事件处理属性
            Array.from(element.attributes).forEach(attr => {
                if (attr.name.startsWith('on')) {
                    element.removeAttribute(attr.name);
                }
            });

            // 清理href和src属性
            if (element.hasAttribute('href')) {
                const href = element.getAttribute('href');
                if (this.containsXSS(href)) {
                    element.removeAttribute('href');
                }
            }

            if (element.hasAttribute('src')) {
                const src = element.getAttribute('src');
                if (this.containsXSS(src)) {
                    element.removeAttribute('src');
                }
            }
        });

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
        const token = localStorage.getItem('authToken');
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

// 初始化XSS防护（保守配置）
document.addEventListener('DOMContentLoaded', function() {
    window.xssProtection = new XSSProtection({
        enableGlobalProtection: false,  // 关闭全局函数保护
        enableTokenProtection: true,    // 保持token监控
        enableFormProtection: false,    // 关闭实时表单验证
        enableDOMProtection: true,      // 启用非侵入式DOM保护
        logWarnings: true              // 保留警告日志
    });
    
    // 添加全局错误处理
    window.addEventListener('error', function(event) {
        if (event.error && event.error.message && event.error.message.includes('XSS')) {
            console.warn('[XSS Protection] Security warning:', event.error.message);
        }
    });
    
    // 提供手动启用更严格保护的方法
    window.enableStrictXSSProtection = function() {
        window.xssProtection = new XSSProtection({
            enableGlobalProtection: true,
            enableTokenProtection: true,
            enableFormProtection: true,
            enableDOMProtection: true,
            logWarnings: true
        });
        console.log('[XSS Protection] Strict mode enabled');
    };
});

// 导出供其他模块使用
window.XSSProtection = XSSProtection; 