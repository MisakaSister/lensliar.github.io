// worker/src/xss-protection.js

// 基本的XSS防护函数
export function sanitizeText(text, options = {}) {
    if (typeof text !== 'string') return text;
    
    const { allowHtml = false } = options;
    
    if (!allowHtml) {
        // 移除HTML标签
        text = text.replace(/<[^>]*>/g, '');
    }
    
    // 转义特殊字符
    text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    return text;
}

// 验证和清理URL
export function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    // 允许的协议
    const allowedProtocols = ['http:', 'https:', 'data:'];
    
    try {
        const urlObj = new URL(url);
        if (allowedProtocols.includes(urlObj.protocol)) {
            return url;
        }
    } catch (e) {
        // 无效URL
    }
    
    return '';
}

// 清理整个对象
export function sanitizeObject(obj, options = {}) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            if (key === 'url' || key.includes('Url') || key.includes('url')) {
                sanitized[key] = sanitizeUrl(value);
            } else {
                sanitized[key] = sanitizeText(value, options);
            }
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => sanitizeObject(item, options));
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, options);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
} 