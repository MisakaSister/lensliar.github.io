// worker/src/content.js
export async function handleContent(request, env) {
    try {
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

    return { success: true, user: tokenData.user };
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

// 🔒 基本XSS防护 - 清理用户输入
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}
