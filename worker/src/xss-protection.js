// worker/src/xss-protection.js - XSS防护模块

// 危险HTML标签
const DANGEROUS_TAGS = [
    'script', 'object', 'embed', 'link', 'meta', 'style', 'iframe', 'frame',
    'frameset', 'applet', 'base', 'form', 'input', 'button', 'select', 'textarea',
    'option', 'optgroup', 'keygen', 'datalist', 'output'
];

// 危险属性
const DANGEROUS_ATTRIBUTES = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onmousemove',
    'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus',
    'onblur', 'onchange', 'onselect', 'onsubmit', 'onreset', 'onresize',
    'onscroll', 'onunload', 'onbeforeunload', 'oncontextmenu', 'ondblclick',
    'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover',
    'ondragstart', 'ondrop', 'onabort', 'oncanplay', 'oncanplaythrough',
    'oncuechange', 'ondurationchange', 'onemptied', 'onended', 'oninput',
    'oninvalid', 'onloadeddata', 'onloadedmetadata', 'onloadstart',
    'onpause', 'onplay', 'onplaying', 'onprogress', 'onratechange',
    'onseeked', 'onseeking', 'onstalled', 'onsuspend', 'ontimeupdate',
    'onvolumechange', 'onwaiting', 'onwheel', 'oncut', 'oncopy', 'onpaste'
];

// 危险URL协议
const DANGEROUS_PROTOCOLS = [
    'javascript:', 'vbscript:', 'data:', 'file:', 'ftp:', 'jar:', 'mailto:',
    'tel:', 'sms:', 'mms:', 'skype:', 'chrome:', 'chrome-extension:',
    'moz-extension:', 'ms-browser-extension:'
];

// 1. 基础HTML实体编码
export function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    
    return text.replace(/[&<>"'\/`=]/g, function(char) {
        return entityMap[char];
    });
}

// 2. 深度清理HTML内容
export function sanitizeHtml(html) {
    if (typeof html !== 'string') return html;
    
    let cleaned = html;
    
    // 移除危险标签
    DANGEROUS_TAGS.forEach(tag => {
        const regex = new RegExp(`<\\s*${tag}[^>]*>.*?<\\s*\\/\\s*${tag}\\s*>`, 'gi');
        cleaned = cleaned.replace(regex, '');
        
        // 移除自闭合标签
        const selfClosingRegex = new RegExp(`<\\s*${tag}[^>]*\\/?>`, 'gi');
        cleaned = cleaned.replace(selfClosingRegex, '');
    });
    
    // 移除危险属性
    DANGEROUS_ATTRIBUTES.forEach(attr => {
        const regex = new RegExp(`\\s+${attr}\\s*=\\s*['"]*[^'"]*['"]*`, 'gi');
        cleaned = cleaned.replace(regex, '');
    });
    
    // 移除危险协议
    DANGEROUS_PROTOCOLS.forEach(protocol => {
        const regex = new RegExp(`(href|src|action|formaction|cite|background|poster|longdesc|usemap|classid|codebase|data|profile)\\s*=\\s*['"]?\\s*${protocol.replace(':', '\\s*:\\s*')}`, 'gi');
        cleaned = cleaned.replace(regex, '');
    });
    
    // 移除内联样式中的危险内容
    cleaned = cleaned.replace(/style\s*=\s*['"][^'"]*expression\s*\([^'"]*['"]/, '');
    cleaned = cleaned.replace(/style\s*=\s*['"][^'"]*javascript\s*:[^'"]*['"]/, '');
    cleaned = cleaned.replace(/style\s*=\s*['"][^'"]*vbscript\s*:[^'"]*['"]/, '');
    
    // 移除HTML注释中的脚本
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // 移除CDATA
    cleaned = cleaned.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
    
    return cleaned.trim();
}

// 3. 清理用户输入文本
export function sanitizeText(text) {
    if (typeof text !== 'string') return text;
    
    // 基础HTML编码
    let cleaned = escapeHtml(text);
    
    // 移除零宽字符
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    // 移除控制字符
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // 限制连续空白
    cleaned = cleaned.replace(/\s{10,}/g, ' ');
    
    return cleaned.trim();
}

// 4. URL安全验证
export function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    // 移除危险协议
    let cleaned = url.trim();
    
    DANGEROUS_PROTOCOLS.forEach(protocol => {
        const regex = new RegExp(`^\\s*${protocol.replace(':', '\\s*:\\s*')}`, 'i');
        if (regex.test(cleaned)) {
            cleaned = '';
        }
    });
    
    // 验证URL格式
    try {
        const parsedUrl = new URL(cleaned);
        
        // 只允许HTTP/HTTPS
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return '';
        }
        
        // 防止本地网络访问
        const hostname = parsedUrl.hostname.toLowerCase();
        const forbiddenHosts = [
            'localhost', '127.0.0.1', '0.0.0.0', '[::]',
            '10.', '172.16.', '172.17.', '172.18.', '172.19.',
            '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
            '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
            '172.30.', '172.31.', '192.168.'
        ];
        
        const isDangerous = forbiddenHosts.some(host => 
            hostname === host || hostname.startsWith(host)
        );
        
        if (isDangerous) return '';
        
        return parsedUrl.toString();
    } catch {
        return '';
    }
}

// 5. 深度清理对象
export function sanitizeObject(obj, options = {}) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const {
        allowHtml = false,
        allowUrls = true,
        maxDepth = 5,
        currentDepth = 0
    } = options;
    
    // 防止深度递归
    if (currentDepth >= maxDepth) return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, { ...options, currentDepth: currentDepth + 1 }));
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        // 清理键名
        const cleanKey = sanitizeText(key);
        
        if (typeof value === 'string') {
            if (key.toLowerCase().includes('url') || key.toLowerCase().includes('href')) {
                sanitized[cleanKey] = allowUrls ? sanitizeUrl(value) : sanitizeText(value);
            } else if (key.toLowerCase().includes('html') || key.toLowerCase().includes('content')) {
                sanitized[cleanKey] = allowHtml ? sanitizeHtml(value) : sanitizeText(value);
            } else {
                sanitized[cleanKey] = sanitizeText(value);
            }
        } else if (typeof value === 'object') {
            sanitized[cleanKey] = sanitizeObject(value, { ...options, currentDepth: currentDepth + 1 });
        } else {
            sanitized[cleanKey] = value;
        }
    }
    
    return sanitized;
}

// 6. 验证JSON数据
export function validateJsonData(data) {
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return sanitizeObject(parsed);
    } catch (error) {
        throw new Error('Invalid JSON data');
    }
}

// 7. 内容安全策略助手
export function generateCSPHeader(options = {}) {
    const {
        allowInlineScripts = false,
        allowInlineStyles = false,
        allowEval = false,
        allowedDomains = [],
        allowedImageSources = ['*'],
        allowedFontSources = ['self'],
        reportUri = null
    } = options;
    
    const directives = [
        `default-src 'self'`,
        `script-src 'self'${allowInlineScripts ? " 'unsafe-inline'" : ''}${allowEval ? " 'unsafe-eval'" : ''}`,
        `style-src 'self'${allowInlineStyles ? " 'unsafe-inline'" : ''}`,
        `img-src ${allowedImageSources.join(' ')}`,
        `font-src ${allowedFontSources.join(' ')}`,
        `connect-src 'self' ${allowedDomains.join(' ')}`,
        `frame-ancestors 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
        `object-src 'none'`,
        `media-src 'self'`,
        `child-src 'none'`,
        `worker-src 'self'`,
        `manifest-src 'self'`
    ];
    
    if (reportUri) {
        directives.push(`report-uri ${reportUri}`);
    }
    
    return directives.join('; ');
}

// 8. 请求头安全验证
export function validateRequestHeaders(request) {
    const headers = request.headers;
    
    // 检查可疑的User-Agent
    const userAgent = headers.get('User-Agent') || '';
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /expression\s*\(/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        return { valid: false, reason: 'Suspicious User-Agent' };
    }
    
    // 检查Referer
    const referer = headers.get('Referer');
    if (referer) {
        const cleanReferer = sanitizeUrl(referer);
        if (!cleanReferer) {
            return { valid: false, reason: 'Invalid Referer' };
        }
    }
    
    // 检查其他可能包含用户输入的头
    const headersToCheck = ['Accept', 'Accept-Language', 'Accept-Encoding'];
    for (const headerName of headersToCheck) {
        const headerValue = headers.get(headerName);
        if (headerValue && suspiciousPatterns.some(pattern => pattern.test(headerValue))) {
            return { valid: false, reason: `Suspicious ${headerName}` };
        }
    }
    
    return { valid: true };
}

// 9. 中间件：XSS防护
export function xssProtectionMiddleware(options = {}) {
    return async (request, env, ctx, next) => {
        // 验证请求头
        const headerValidation = validateRequestHeaders(request);
        if (!headerValidation.valid) {
            return new Response(JSON.stringify({
                error: 'Request blocked for security reasons'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        
        // 如果是POST/PUT请求，验证请求体
        if (['POST', 'PUT'].includes(request.method)) {
            const contentType = request.headers.get('Content-Type');
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    const data = await request.json();
                    const sanitizedData = sanitizeObject(data, options);
                    
                    // 创建新的请求对象，包含清理后的数据
                    const newRequest = new Request(request.url, {
                        method: request.method,
                        headers: request.headers,
                        body: JSON.stringify(sanitizedData)
                    });
                    
                    return await next(newRequest, env, ctx);
                } catch (error) {
                    return new Response(JSON.stringify({
                        error: 'Invalid request data'
                    }), {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                }
            }
        }
        
        return await next(request, env, ctx);
    };
}

// 10. 响应头安全增强
export function addSecurityHeaders(response) {
    const secureResponse = new Response(response.body, response);
    
    // XSS防护
    secureResponse.headers.set('X-XSS-Protection', '1; mode=block');
    
    // 防止MIME嗅探
    secureResponse.headers.set('X-Content-Type-Options', 'nosniff');
    
    // 防止点击劫持
    secureResponse.headers.set('X-Frame-Options', 'DENY');
    
    // 严格传输安全
    secureResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // 引用策略
    secureResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 权限策略
    secureResponse.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    return secureResponse;
} 