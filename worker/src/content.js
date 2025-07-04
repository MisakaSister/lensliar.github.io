// worker/src/content.js

import { handleError } from './error-handler.js';
import { checkRateLimit } from './rate-limiter.js';

export async function handleContent(request, env) {
    try {
        // 内容API速率限制
        await checkRateLimit(request, env, 'content');
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

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(part => part);

        if (request.method === 'GET') {
            if (pathParts.length === 1) {
                // GET /content - 获取所有文章列表
                return await getAllArticles(env);
            } else if (pathParts.length === 2) {
                // GET /content/{id} - 获取单篇文章
                return await getArticle(pathParts[1], env);
            }

        } else if (request.method === 'POST') {
            // POST /content - 创建新文章
            const articleData = await request.json();
            return await createArticle(articleData, env);
            
        } else if (request.method === 'PUT') {
            // PUT /content/{id} - 更新文章
            if (pathParts.length === 2) {
                const articleData = await request.json();
                return await updateArticle(pathParts[1], articleData, env);
            }
            
        } else if (request.method === 'DELETE') {
            // DELETE /content/{id} - 删除文章
            if (pathParts.length === 2) {
                return await deleteArticle(pathParts[1], env);
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
        return handleError(error, request);
    }
}

// 获取所有文章列表
async function getAllArticles(env) {
    try {
        // 获取文章索引
        const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];

        // 并行获取所有文章
        const articlePromises = articleIndex.map(id => 
            env.CONTENT_KV.get(`article:${id}`, "json")
        );

        const articles = await Promise.all(articlePromises);

        // 过滤掉null值（已删除的文章）并按日期排序
        const validArticles = articles
            .filter(article => article !== null)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return new Response(JSON.stringify({
            articles: validArticles,
            total: validArticles.length
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to get articles: ${error.message}`);
    }
}

// 获取单篇文章
async function getArticle(id, env) {
    try {
        const article = await env.CONTENT_KV.get(`article:${id}`, "json");

        if (!article) {
                return new Response(JSON.stringify({
                error: "Article not found"
                }), {
                status: 404,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

        return new Response(JSON.stringify(article), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to get article: ${error.message}`);
    }
}

// 创建新文章
async function createArticle(articleData, env) {
    try {
        // 验证必需字段
        if (!articleData.title || !articleData.content) {
            return new Response(JSON.stringify({
                error: 'Article title and content are required'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 清理输入数据
        const cleanTitle = sanitizeInput(articleData.title);
        const cleanContent = sanitizeInput(articleData.content);
        
        // 再次验证清理后的数据
        if (!cleanTitle.trim() || !cleanContent.trim()) {
            return new Response(JSON.stringify({
                error: 'Article title and content cannot be empty'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 生成文章ID
        const articleId = articleData.id || `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 构造完整的文章对象
        const article = {
            id: articleId,
            title: cleanTitle,
            content: cleanContent,
            summary: sanitizeInput(articleData.summary || articleData.content.substring(0, 200)),
            category: sanitizeInput(articleData.category || ''),
            tags: Array.isArray(articleData.tags) ? articleData.tags.map(tag => sanitizeInput(tag)) : [],
            
            // 封面图片
            coverImage: articleData.coverImage ? {
                url: sanitizeInput(articleData.coverImage.url, true),
                alt: sanitizeInput(articleData.coverImage.alt || ''),
                caption: sanitizeInput(articleData.coverImage.caption || '')
            } : null,
            
            // 文章中的图片集合
            images: Array.isArray(articleData.images) ? articleData.images.map(img => ({
                id: img.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                url: sanitizeInput(img.url, true),
                fileName: sanitizeInput(img.fileName || ''),
                title: sanitizeInput(img.title || img.fileName || ''),
                alt: sanitizeInput(img.alt || ''),
                caption: sanitizeInput(img.caption || ''),
                width: parseInt(img.width) || null,
                height: parseInt(img.height) || null,
                size: parseInt(img.size) || null,
                type: sanitizeInput(img.type || 'image/jpeg')
            })) : [],
            
            // 文章中的附件
            attachments: Array.isArray(articleData.attachments) ? articleData.attachments.map(att => ({
                id: att.id || `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: sanitizeInput(att.name),
                url: sanitizeInput(att.url, true),
                type: sanitizeInput(att.type || ''),
                size: parseInt(att.size) || null
            })) : [],
            
            // 元数据
            author: sanitizeInput(articleData.author || 'Admin'),
            status: articleData.status || 'published', // draft, published, archived
            visibility: articleData.visibility || 'public', // public, private, unlisted
            
            // 时间戳
            createdAt: articleData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: articleData.status === 'published' ? (articleData.publishedAt || new Date().toISOString()) : null,
            
            // SEO信息
            seo: {
                metaTitle: sanitizeInput(articleData.seo?.metaTitle || articleData.title),
                metaDescription: sanitizeInput(articleData.seo?.metaDescription || articleData.summary || ''),
                keywords: Array.isArray(articleData.seo?.keywords) ? articleData.seo.keywords.map(k => sanitizeInput(k)) : [],
                slug: sanitizeInput(articleData.seo?.slug || generateSlug(articleData.title))
            },
            
            // 统计信息
            stats: {
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0
            }
        };

        // 保存文章
        await env.CONTENT_KV.put(`article:${articleId}`, JSON.stringify(article));

        // 更新文章索引
        await updateArticleIndex(articleId, env);

        return new Response(JSON.stringify({
            success: true,
            article: article
        }), {
            status: 201,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to create article: ${error.message}`);
    }
}

// 更新文章
async function updateArticle(id, articleData, env) {
    try {
        // 获取现有文章
        const existingArticle = await env.CONTENT_KV.get(`article:${id}`, "json");

        if (!existingArticle) {
            return new Response(JSON.stringify({
                error: "Article not found"
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 验证必需字段 - 确保更新后的文章仍然有title和content
        const finalTitle = articleData.title || existingArticle.title;
        const finalContent = articleData.content || existingArticle.content;
        
        if (!finalTitle || !finalContent) {
            return new Response(JSON.stringify({
                error: 'Article title and content are required'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 清理输入数据
        const cleanTitle = sanitizeInput(finalTitle);
        const cleanContent = sanitizeInput(finalContent);
        
        // 再次验证清理后的数据
        if (!cleanTitle.trim() || !cleanContent.trim()) {
            return new Response(JSON.stringify({
                error: 'Article title and content cannot be empty'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 更新文章数据（保留原有数据，只更新提供的字段）
        const updatedArticle = {
            ...existingArticle,
            title: cleanTitle,
            content: cleanContent,
            summary: articleData.summary ? sanitizeInput(articleData.summary) : existingArticle.summary,
            category: articleData.category !== undefined ? sanitizeInput(articleData.category) : existingArticle.category,
            tags: Array.isArray(articleData.tags) ? articleData.tags.map(tag => sanitizeInput(tag)) : existingArticle.tags,
            
            // 更新封面图片
            coverImage: articleData.coverImage !== undefined ? (articleData.coverImage ? {
                url: sanitizeInput(articleData.coverImage.url, true),
                alt: sanitizeInput(articleData.coverImage.alt || ''),
                caption: sanitizeInput(articleData.coverImage.caption || '')
            } : null) : existingArticle.coverImage,
            
            // 更新图片集合
            images: Array.isArray(articleData.images) ? articleData.images.map(img => ({
                id: img.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                url: sanitizeInput(img.url, true),
                fileName: sanitizeInput(img.fileName || ''),
                title: sanitizeInput(img.title || img.fileName || ''),
                alt: sanitizeInput(img.alt || ''),
                caption: sanitizeInput(img.caption || ''),
                width: parseInt(img.width) || null,
                height: parseInt(img.height) || null,
                size: parseInt(img.size) || null,
                type: sanitizeInput(img.type || 'image/jpeg')
            })) : existingArticle.images,
            
            // 更新附件
            attachments: Array.isArray(articleData.attachments) ? articleData.attachments.map(att => ({
                id: att.id || `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: sanitizeInput(att.name),
                url: sanitizeInput(att.url, true),
                type: sanitizeInput(att.type || ''),
                size: parseInt(att.size) || null
            })) : existingArticle.attachments,
            
            // 更新元数据
            author: articleData.author ? sanitizeInput(articleData.author) : existingArticle.author,
            status: articleData.status || existingArticle.status,
            visibility: articleData.visibility || existingArticle.visibility,
            
            // 更新时间戳
            updatedAt: new Date().toISOString(),
            publishedAt: (articleData.status === 'published' && !existingArticle.publishedAt) ? 
                new Date().toISOString() : existingArticle.publishedAt,
            
            // 更新SEO信息
            seo: {
                metaTitle: sanitizeInput(articleData.seo?.metaTitle || articleData.title || existingArticle.seo.metaTitle),
                metaDescription: sanitizeInput(articleData.seo?.metaDescription || articleData.summary || existingArticle.seo.metaDescription),
                keywords: Array.isArray(articleData.seo?.keywords) ? 
                    articleData.seo.keywords.map(k => sanitizeInput(k)) : existingArticle.seo.keywords,
                slug: sanitizeInput(articleData.seo?.slug || existingArticle.seo.slug)
            },
            
            // 保留统计信息
            stats: existingArticle.stats
        };

        // 保存更新后的文章
        await env.CONTENT_KV.put(`article:${id}`, JSON.stringify(updatedArticle));

        return new Response(JSON.stringify({
            success: true,
            article: updatedArticle
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        throw new Error(`Failed to update article: ${error.message}`);
    }
}

// 删除文章
async function deleteArticle(id, env) {
    try {
        // 检查文章是否存在
        const existingArticle = await env.CONTENT_KV.get(`article:${id}`, "json");

        if (!existingArticle) {
            return new Response(JSON.stringify({
                error: "Article not found"
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

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

// 辅助函数：更新文章索引
async function updateArticleIndex(id, env) {
    const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];
    if (!articleIndex.includes(id)) {
        articleIndex.push(id);
        await env.CONTENT_KV.put("articles:index", JSON.stringify(articleIndex));
    }
}

// 辅助函数：生成URL友好的slug
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // 移除特殊字符
        .replace(/\s+/g, '-') // 空格替换为连字符
        .replace(/-+/g, '-') // 多个连字符合并为一个
        .trim('-'); // 移除首尾连字符
}

// 验证认证token
export async function verifyAuth(request, env) {
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
