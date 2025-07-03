// worker/src/content.js
export async function handleContent(request, env) {
    try {
        // 🔒 严格的HTTP方法验证
        if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) {
            return new Response(JSON.stringify({
                error: "Method not allowed"
            }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Allow': 'GET, POST, PUT, DELETE'
                }
            });
        }

        // 验证权限（除了公开API）
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

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(part => part);
        
        if (request.method === 'GET') {
            // GET /content - 获取所有内容（用于管理后台）
            return await getAllContent(env);
            
        } else if (request.method === 'POST') {
            // POST /content - 批量保存内容（兼容旧API）
            const contentData = await request.json();
            return await saveBatchContent(contentData, env);
            
        } else if (request.method === 'PUT') {
            // PUT /content/articles/{id} - 保存单篇文章
            // PUT /content/images/{id} - 保存单张图片
            if (pathParts[1] === 'articles' && pathParts[2]) {
                const articleData = await request.json();
                return await saveArticle(pathParts[2], articleData, env);
            } else if (pathParts[1] === 'images' && pathParts[2]) {
                const imageData = await request.json();
                return await saveImage(pathParts[2], imageData, env);
            }
            
        } else if (request.method === 'DELETE') {
            // DELETE /content/articles/{id} - 删除单篇文章
            // DELETE /content/images/{id} - 删除单张图片
            if (pathParts[1] === 'articles' && pathParts[2]) {
                return await deleteArticle(pathParts[2], env);
            } else if (pathParts[1] === 'images' && pathParts[2]) {
                return await deleteImage(pathParts[2], env);
            }
        }

        return new Response(JSON.stringify({
            error: "Invalid endpoint"
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Content API error:', error);
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

// 获取所有内容
async function getAllContent(env) {
    try {
        // 获取文章索引
        const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];
        const imageIndex = await env.CONTENT_KV.get("images:index", "json") || [];

        // 并行获取所有文章
        const articlePromises = articleIndex.map(id => 
            env.CONTENT_KV.get(`article:${id}`, "json")
        );
        const imagePromises = imageIndex.map(id => 
            env.CONTENT_KV.get(`image:${id}`, "json")
        );

        const [articles, images] = await Promise.all([
            Promise.all(articlePromises),
            Promise.all(imagePromises)
        ]);

        // 过滤掉null值（已删除的项目）
        const validArticles = articles.filter(article => article !== null);
        const validImages = images.filter(image => image !== null);

        return new Response(JSON.stringify({
            articles: validArticles,
            images: validImages
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to get content: ${error.message}`);
    }
}

// 批量保存内容（兼容旧API）
async function saveBatchContent(contentData, env) {
    try {
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

        const { articles, images } = validationResult.data;

        // 保存所有文章
        const articlePromises = articles.map(article => 
            saveArticleData(article.id, article, env)
        );
        
        // 保存所有图片
        const imagePromises = images.map(image => 
            saveImageData(image.id, image, env)
        );

        await Promise.all([...articlePromises, ...imagePromises]);

        // 更新索引
        const articleIds = articles.map(a => a.id);
        const imageIds = images.map(i => i.id);
        
        await Promise.all([
            env.CONTENT_KV.put("articles:index", JSON.stringify(articleIds)),
            env.CONTENT_KV.put("images:index", JSON.stringify(imageIds))
        ]);

        return new Response(JSON.stringify({
            success: true,
            message: "Content saved successfully"
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to save batch content: ${error.message}`);
    }
}

// 保存单篇文章
async function saveArticle(id, articleData, env) {
    try {
        // 验证文章数据
        if (!articleData.title || !articleData.content) {
            return new Response(JSON.stringify({
                error: 'Article missing required fields'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const sanitizedArticle = {
            id: id,
            title: sanitizeInput(articleData.title),
            content: sanitizeInput(articleData.content),
            category: sanitizeInput(articleData.category || ''),
            image: sanitizeInput(articleData.image || '', true),
            date: articleData.date || new Date().toISOString().split('T')[0],
            createdAt: articleData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveArticleData(id, sanitizedArticle, env);

        // 更新文章索引
        await updateArticleIndex(id, env);

        return new Response(JSON.stringify({
            success: true,
            article: sanitizedArticle
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to save article: ${error.message}`);
    }
}

// 保存单张图片
async function saveImage(id, imageData, env) {
    try {
        // 验证图片数据
        if (!imageData.title || !imageData.url) {
            return new Response(JSON.stringify({
                error: 'Image missing required fields'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const sanitizedImage = {
            id: id,
            title: sanitizeInput(imageData.title),
            url: sanitizeInput(imageData.url, true),
            description: sanitizeInput(imageData.description || ''),
            category: sanitizeInput(imageData.category || ''),
            date: imageData.date || new Date().toISOString().split('T')[0],
            createdAt: imageData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveImageData(id, sanitizedImage, env);

        // 更新图片索引
        await updateImageIndex(id, env);

        return new Response(JSON.stringify({
            success: true,
            image: sanitizedImage
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to save image: ${error.message}`);
    }
}

// 删除单篇文章
async function deleteArticle(id, env) {
    try {
        // 删除文章数据
        await env.CONTENT_KV.delete(`article:${id}`);

        // 从索引中移除
        const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];
        const updatedIndex = articleIndex.filter(articleId => articleId !== id);
        await env.CONTENT_KV.put("articles:index", JSON.stringify(updatedIndex));

        return new Response(JSON.stringify({
            success: true,
            message: "Article deleted successfully"
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to delete article: ${error.message}`);
    }
}

// 删除单张图片
async function deleteImage(id, env) {
    try {
        // 删除图片数据
        await env.CONTENT_KV.delete(`image:${id}`);

        // 从索引中移除
        const imageIndex = await env.CONTENT_KV.get("images:index", "json") || [];
        const updatedIndex = imageIndex.filter(imageId => imageId !== id);
        await env.CONTENT_KV.put("images:index", JSON.stringify(updatedIndex));

        return new Response(JSON.stringify({
            success: true,
            message: "Image deleted successfully"
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to delete image: ${error.message}`);
    }
}

// 辅助函数：保存文章数据
async function saveArticleData(id, articleData, env) {
    await env.CONTENT_KV.put(`article:${id}`, JSON.stringify(articleData));
}

// 辅助函数：保存图片数据
async function saveImageData(id, imageData, env) {
    await env.CONTENT_KV.put(`image:${id}`, JSON.stringify(imageData));
}

// 辅助函数：更新文章索引
async function updateArticleIndex(id, env) {
    const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];
    if (!articleIndex.includes(id)) {
        articleIndex.push(id);
        await env.CONTENT_KV.put("articles:index", JSON.stringify(articleIndex));
    }
}

// 辅助函数：更新图片索引
async function updateImageIndex(id, env) {
    const imageIndex = await env.CONTENT_KV.get("images:index", "json") || [];
    if (!imageIndex.includes(id)) {
        imageIndex.push(id);
        await env.CONTENT_KV.put("images:index", JSON.stringify(imageIndex));
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

    // 🔒 验证会话指纹（防止会话劫持）- 暂时禁用用于调试
    if (tokenData.sessionFingerprint && false) { // 暂时禁用
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
                image: sanitizeInput(article.image || '', true),
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
                url: sanitizeInput(image.url, true),
                description: sanitizeInput(image.description || ''),
                category: sanitizeInput(image.category || ''),
                date: image.date || new Date().toISOString().split('T')[0],
                uploadTime: image.uploadTime || null,
                fileName: sanitizeInput(image.fileName || ''),
                fileSize: parseInt(image.fileSize) || null,
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
function sanitizeInput(input, isUrl = false) {
    if (typeof input !== 'string') return input;
    
    // 如果是URL，只做基本的脚本清理，不做HTML实体编码
    if (isUrl) {
        return input
            // 移除危险脚本模式
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
            .replace(/expression\s*\(/gi, '')
            .trim();
    }
    
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
