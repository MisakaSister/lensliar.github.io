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
            } else if (pathParts.length === 2 && pathParts[1] === 'categories') {
                return await getArticleCategories(env);
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
            error: "Not Found"
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Content handler error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error'
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
        console.log('[文章] 开始获取所有文章');
        
        const { results } = await env.d1_sql.prepare(`
            SELECT * FROM articles 
            ORDER BY created_at DESC 
            LIMIT 100
        `).all();
        
        console.log(`[文章] 查询结果数量: ${results?.length || 0}`);
        
        // 转换字段名称以匹配前端期望的格式（并兼容历史字符串形式的封面）
        const articles = (results || []).map(article => {
            const parsed = article.cover_image ? JSON.parse(article.cover_image) : null;
            const coverImage = typeof parsed === 'string' ? { url: parsed } : parsed;
            return {
                ...article,
                coverImage,
                createdAt: article.created_at,
                updatedAt: article.updated_at,
                publishedAt: article.published_at
            };
        });
        
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
        console.error('[文章] 获取文章列表时出错:', error);
        console.error('[文章] 错误堆栈:', error.stack);
        throw new Error(`Failed to get articles: ${error.message}`);
    }
}

// 获取单篇文章
async function getArticle(id, env) {
    try {
        const { results } = await env.d1_sql.prepare(`
            SELECT * FROM articles WHERE id = ?
        `).bind(id).all();
        
        if (!results || results.length === 0) {
            return new Response(JSON.stringify({
                error: "Article not found"
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 转换字段名称以匹配前端期望的格式（并兼容历史字符串形式的封面）
        const parsed = results[0].cover_image ? JSON.parse(results[0].cover_image) : null;
        const coverImage = typeof parsed === 'string' ? { url: parsed } : parsed;
        const article = {
            ...results[0],
            coverImage,
            createdAt: results[0].created_at,
            updatedAt: results[0].updated_at,
            publishedAt: results[0].published_at
        };

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
        console.log('开始创建文章，数据:', JSON.stringify(articleData, null, 2));
        console.log('内容长度:', articleData.content.length);
        
        // 检查内容长度限制
        if (articleData.content.length > 500000) {
            return new Response(JSON.stringify({
                error: '内容过大，无法保存（请减少图片数量或压缩图片）'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        
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
        const currentTime = new Date().toISOString();
        
        const { success } = await env.d1_sql.prepare(`
            INSERT INTO articles (
                id, title, content, summary, category, tags, cover_image, 
                images, attachments, author, status, visibility, 
                created_at, updated_at, published_at, seo_meta_title, 
                seo_meta_description, seo_keywords, seo_slug, views, likes, comments, shares
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            articleId,
            articleData.title,
            articleData.content,
            articleData.summary || articleData.content.substring(0, 200),
            articleData.category || '',
            JSON.stringify(Array.isArray(articleData.tags) ? articleData.tags : []),
            JSON.stringify(articleData.coverImage || articleData.cover_image || null),
            JSON.stringify(Array.isArray(articleData.images) ? articleData.images : []),
            JSON.stringify(Array.isArray(articleData.attachments) ? articleData.attachments : []),
            articleData.author || 'Admin',
            articleData.status || 'published',
            articleData.visibility || 'public',
            currentTime,
            currentTime,
            articleData.status === 'published' ? currentTime : null,
            articleData.seo?.metaTitle || articleData.title,
            articleData.seo?.metaDescription || articleData.summary || '',
            JSON.stringify(Array.isArray(articleData.seo?.keywords) ? articleData.seo.keywords : []),
            articleData.seo?.slug || generateSlug(articleData.title),
            0, // views
            0, // likes
            0, // comments
            0  // shares
        ).run();

        if (!success) {
            throw new Error('Failed to insert article');
        }

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
            createdAt: currentTime,
            updatedAt: currentTime,
            publishedAt: articleData.status === 'published' ? currentTime : null,
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
        console.error('Error creating article:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        throw new Error(`Failed to create article: ${error.message}`);
    }
}

// 更新文章
async function updateArticle(id, articleData, env) {
    try {
        const { results } = await env.d1_sql.prepare(`
            SELECT * FROM articles WHERE id = ?
        `).bind(id).all();
        
        if (!results || results.length === 0) {
            return new Response(JSON.stringify({
                error: "Article not found"
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const currentTime = new Date().toISOString();
        
        const { success } = await env.d1_sql.prepare(`
            UPDATE articles SET 
                title = ?, content = ?, summary = ?, category = ?, tags = ?, 
                cover_image = ?, images = ?, attachments = ?, author = ?, 
                status = ?, visibility = ?, updated_at = ?, published_at = ?,
                seo_meta_title = ?, seo_meta_description = ?, seo_keywords = ?, seo_slug = ?
            WHERE id = ?
        `).bind(
            articleData.title || results[0].title,
            articleData.content || results[0].content,
            articleData.summary || results[0].summary,
            articleData.category || results[0].category,
            JSON.stringify(Array.isArray(articleData.tags) ? articleData.tags : results[0].tags || []),
            JSON.stringify(articleData.coverImage || articleData.cover_image || results[0].cover_image),
            JSON.stringify(Array.isArray(articleData.images) ? articleData.images : results[0].images || []),
            JSON.stringify(Array.isArray(articleData.attachments) ? articleData.attachments : results[0].attachments || []),
            articleData.author || results[0].author,
            articleData.status || results[0].status,
            articleData.visibility || results[0].visibility,
            currentTime,
            articleData.status === 'published' ? currentTime : results[0].published_at,
            articleData.seo?.metaTitle || results[0].seo_meta_title,
            articleData.seo?.metaDescription || results[0].seo_meta_description,
            JSON.stringify(Array.isArray(articleData.seo?.keywords) ? articleData.seo.keywords : results[0].seo_keywords || []),
            articleData.seo?.slug || results[0].seo_slug,
            id
        ).run();

        if (!success) {
            throw new Error('Failed to update article');
        }

        const updatedArticle = {
            ...results[0],
            ...articleData,
            id: id,
            updatedAt: currentTime
        };

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
        const { results } = await env.d1_sql.prepare(`
            SELECT * FROM articles WHERE id = ?
        `).bind(id).all();
        
        if (!results || results.length === 0) {
            return new Response(JSON.stringify({
                error: "Article not found"
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const { success } = await env.d1_sql.prepare(`
            DELETE FROM articles WHERE id = ?
        `).bind(id).run();

        if (!success) {
            throw new Error('Failed to delete article');
        }

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

// 生成URL友好的slug
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

// 获取所有文章分类
async function getArticleCategories(env) {
    try {
        const { results } = await env.d1_sql.prepare(`
            SELECT id, name, description, color, sort_order FROM article_categories ORDER BY sort_order ASC, created_at ASC
        `).all();
        return new Response(JSON.stringify({
            categories: results || []
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('[分类] 获取文章分类出错:', error);
        return new Response(JSON.stringify({
            error: 'Failed to get article categories',
            details: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
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
