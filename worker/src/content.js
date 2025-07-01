// worker/src/content.js
export async function handleContent(request, env) {
    try {
        // 🔒 严格的HTTP方法验证
        if (!['GET', 'POST'].includes(request.method)) {
            return new Response(JSON.stringify({
                error: "Method not allowed"
            }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Allow': 'GET, POST' // 明确指示允许的方法
                }
            });
        }

        if (request.method === 'GET') {
            // 🔒 添加认证检查 - 管理员专用API
            const authResult = await verifyAuth(request, env);
            if (!authResult.success) {
                return new Response(JSON.stringify({
                    error: authResult.error
                }), {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            // 从 KV 获取内容
            const content = await env.CONTENT_KV.get("homepage", "json");

            if (!content) {
                // 如果没有内容，返回默认结构
                return {
                    articles: [],
                    images: []
                };
            }

            return content;

        } else if (request.method === 'POST') {
            // 验证权限
            const authResult = await verifyAuth(request, env);
            if (!authResult.success) {
                return new Response(JSON.stringify({
                    error: authResult.error
                }), {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            // 获取要保存的内容
            const contentData = await request.json();
            
            // 🔒 验证和清理输入数据
            const validationResult = validateAndSanitizeContent(contentData);
            if (!validationResult.valid) {
                return new Response(JSON.stringify({
                    error: validationResult.error
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            // 保存到 KV
            await env.CONTENT_KV.put("homepage", JSON.stringify(validationResult.data));

            return new Response(JSON.stringify({
                success: true,
                message: "Content saved successfully"
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        return new Response(JSON.stringify({
            error: "Method not allowed"
        }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 验证认证token
async function verifyAuth(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    const tokenData = await env.AUTH_KV.get(token, "json");

    if (!tokenData) {
        return { success: false, error: 'Invalid or expired token' };
    }

    if (tokenData.expires < Date.now()) {
        await env.AUTH_KV.delete(token);
        return { success: false, error: 'Token expired' };
    }

    // 🔒 验证会话指纹（防止会话劫持）
    if (tokenData.sessionFingerprint) {
        const currentFingerprint = await generateSessionFingerprint(request);
        if (tokenData.sessionFingerprint !== currentFingerprint) {
            await env.AUTH_KV.delete(token);
            return { success: false, error: 'Session security validation failed' };
        }
    }

    return { success: true, user: tokenData.user };
}

// 🔒 生成会话指纹（与auth.js保持一致）
async function generateSessionFingerprint(request) {
    const components = [
        request.headers.get('User-Agent') || '',
        request.headers.get('Accept-Language') || '',
        request.headers.get('CF-Connecting-IP') || ''
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
}

// 🔒 验证和清理内容数据
function validateAndSanitizeContent(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid data format' };
    }

    if (!Array.isArray(data.articles) || !Array.isArray(data.images)) {
        return { valid: false, error: 'Invalid content structure' };
    }

    try {
        // 验证和清理文章数据
        const sanitizedArticles = data.articles.map(article => {
            if (!article.title || !article.content) {
                throw new Error('Article missing required fields');
            }
            
            // 限制内容长度
            if (article.title.length > 200) {
                throw new Error('Article title too long (max 200 characters)');
            }
            if (article.content.length > 10000) {
                throw new Error('Article content too long (max 10000 characters)');
            }

            return {
                id: parseInt(article.id) || Date.now(),
                title: sanitizeInput(article.title),
                content: sanitizeInput(article.content),
                category: sanitizeInput(article.category || ''),
                image: sanitizeInput(article.image || ''),
                date: article.date || new Date().toISOString().split('T')[0]
            };
        });

        // 验证和清理图片数据
        const sanitizedImages = data.images.map(image => {
            if (!image.title || !image.url) {
                throw new Error('Image missing required fields');
            }

            // 限制内容长度
            if (image.title.length > 200) {
                throw new Error('Image title too long (max 200 characters)');
            }
            if (image.description && image.description.length > 1000) {
                throw new Error('Image description too long (max 1000 characters)');
            }

            // 🔒 验证图片URL安全性
            if (!validateUrl(image.url)) {
                throw new Error('Invalid or unsafe image URL');
            }

            return {
                id: parseInt(image.id) || Date.now(),
                title: sanitizeInput(image.title),
                url: sanitizeInput(image.url),
                description: sanitizeInput(image.description || ''),
                category: sanitizeInput(image.category || ''),
                date: image.date || new Date().toISOString().split('T')[0],
                source: image.source || 'url'
            };
        });

        return {
            valid: true,
            data: {
                articles: sanitizedArticles,
                images: sanitizedImages
            }
        };

    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// 🔒 增强XSS防护 - 清理用户输入
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        // HTML实体编码
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        // 移除危险脚本模式
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/expression\s*\(/gi, '')
        .trim();
}

// 🔒 验证URL安全性
function validateUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
        const parsedUrl = new URL(url);
        
        // 只允许HTTP/HTTPS协议
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
        }
        
        // 防止本地网络访问
        const hostname = parsedUrl.hostname.toLowerCase();
        const forbiddenHosts = [
            'localhost', '127.0.0.1', '0.0.0.0',
            '10.', '172.16.', '172.17.', '172.18.',
            '172.19.', '172.20.', '172.21.', '172.22.',
            '172.23.', '172.24.', '172.25.', '172.26.',
            '172.27.', '172.28.', '172.29.', '172.30.',
            '172.31.', '192.168.'
        ];
        
        const isDangerous = forbiddenHosts.some(host => 
            hostname === host || hostname.startsWith(host)
        );
        
        if (isDangerous) return false;
        
        return true;
    } catch {
        return false;
    }
}
