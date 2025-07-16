// 内容管理模块
export async function handleContent(request, env) {
    try {
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
                return await getAllArticles(env);
            } else if (pathParts.length === 2) {
                return await getArticle(pathParts[1], env);
            }
        } else if (request.method === 'POST') {
            const articleData = await request.json();
            return await createArticle(articleData, env);
        } else if (request.method === 'PUT') {
            if (pathParts.length === 2) {
                const articleData = await request.json();
                return await updateArticle(pathParts[1], articleData, env);
            }
        } else if (request.method === 'DELETE') {
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
        console.error('[Content API] Error:', error);
        return new Response(JSON.stringify({
            error: "Internal server error",
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 获取所有文章
async function getAllArticles(env) {
    try {
        const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];
        const articles = [];
        
        for (const id of articleIndex.slice(0, 100)) {
            const article = await env.CONTENT_KV.get(`article:${id}`, "json");
            if (article) articles.push(article);
        }
        
        articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return new Response(JSON.stringify({
            articles: articles,
            total: articles.length
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

// 创建文章
async function createArticle(articleData, env) {
    try {
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

        const articleId = articleData.id || `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const article = {
            id: articleId,
            title: articleData.title,
            content: articleData.content,
            summary: articleData.summary || articleData.content.substring(0, 200),
            category: articleData.category || '',
            tags: Array.isArray(articleData.tags) ? articleData.tags : [],
            coverImage: articleData.coverImage || null,
            images: Array.isArray(articleData.images) ? articleData.images : [],
            attachments: Array.isArray(articleData.attachments) ? articleData.attachments : [],
            author: articleData.author || 'Admin',
            status: articleData.status || 'published',
            visibility: articleData.visibility || 'public',
            createdAt: articleData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: articleData.status === 'published' ? (articleData.publishedAt || new Date().toISOString()) : null,
            seo: {
                metaTitle: articleData.seo?.metaTitle || articleData.title,
                metaDescription: articleData.seo?.metaDescription || articleData.summary || '',
                keywords: Array.isArray(articleData.seo?.keywords) ? articleData.seo.keywords : [],
                slug: articleData.seo?.slug || generateSlug(articleData.title)
            },
            stats: {
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0
            }
        };

        await env.CONTENT_KV.put(`article:${articleId}`, JSON.stringify(article));
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

        const updatedArticle = {
            ...existingArticle,
            ...articleData,
            id: id, // 保持原有ID
            updatedAt: new Date().toISOString()
        };

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

        await env.CONTENT_KV.delete(`article:${id}`);
        await removeFromArticleIndex(id, env);

        return new Response(JSON.stringify({
            success: true
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

// 更新文章索引
async function updateArticleIndex(id, env) {
    try {
        const index = await env.CONTENT_KV.get("articles:index", "json") || [];
        if (!index.includes(id)) {
            index.unshift(id);
            await env.CONTENT_KV.put("articles:index", JSON.stringify(index));
        }
    } catch (error) {
        console.error('Failed to update article index:', error);
    }
}

// 从索引中移除文章
async function removeFromArticleIndex(id, env) {
    try {
        const index = await env.CONTENT_KV.get("articles:index", "json") || [];
        const newIndex = index.filter(articleId => articleId !== id);
        await env.CONTENT_KV.put("articles:index", JSON.stringify(newIndex));
    } catch (error) {
        console.error('Failed to remove from article index:', error);
    }
}

// 生成 slug
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
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

    return { success: true, user: tokenData.user };
}
