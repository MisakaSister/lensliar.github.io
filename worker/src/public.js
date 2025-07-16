// 公开API模块
export async function handlePublicAPI(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
        // 公开内容API
        if (pathname === '/api/content' || pathname === '/') {
            return await getPublicContent(request, env);
        }

        // 获取单篇文章详情
        if (pathname.startsWith('/api/article/')) {
            const articleId = pathname.split('/')[3];
            return await getPublicArticle(articleId, env);
        }

        // 获取单个相册详情
        if (pathname.startsWith('/api/album/')) {
            const albumId = pathname.split('/')[3];
            return await getPublicAlbum(albumId, env);
        }

        return new Response(JSON.stringify({
            error: 'Not Found'
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Public API error:', error);
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

// 获取公开内容
async function getPublicContent(request, env) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 10, 10); // 限制为10

        // 获取文章
        let articles = [];
        try {
            const { results } = await env.d1_sql.prepare(`
                SELECT * FROM articles 
                WHERE status = 'published' AND visibility = 'public'
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `).bind(limit, (page - 1) * limit).all();
            
            articles = results || [];
        } catch (error) {
            console.error('Error fetching articles:', error);
            articles = [];
        }

        // 获取相册
        let images = [];
        try {
            const { results } = await env.d1_sql.prepare(`
                SELECT * FROM albums 
                ORDER BY created_at DESC 
                LIMIT 5
            `).all();
            
            images = (results || []).map(album => ({
                id: album.id,
                title: album.title,
                description: album.description,
                imageCount: album.image_count,
                createdAt: album.created_at,
                coverImage: JSON.parse(album.cover_image || 'null'),
                images: JSON.parse(album.images || '[]')
            }));
        } catch (error) {
            console.error('Error fetching albums:', error);
            images = [];
        }

        // 返回结果
        return new Response(JSON.stringify({
            articles,
            images,
            pagination: {
                page,
                limit,
                total: articles.length,
                totalPages: Math.ceil(articles.length / limit),
                hasNext: false,
                hasPrev: false
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300'
            }
        });

    } catch (error) {
        console.error('Error in getPublicContent:', error);
        return new Response(JSON.stringify({
            error: 'Failed to get public content'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 获取公开文章详情
async function getPublicArticle(articleId, env) {
    try {
        const { results } = await env.d1_sql.prepare(`
            SELECT * FROM articles 
            WHERE id = ? AND status = 'published' AND visibility = 'public'
        `).bind(articleId).all();
        
        if (!results || results.length === 0) {
            return new Response(JSON.stringify({
                error: 'Article not found'
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const article = results[0];
        
        // 格式化文章数据
        const formattedArticle = {
            id: article.id,
            title: article.title,
            content: article.content,
            summary: article.summary,
            category: article.category,
            tags: JSON.parse(article.tags || '[]'),
            coverImage: JSON.parse(article.cover_image || 'null'),
            images: JSON.parse(article.images || '[]'),
            attachments: JSON.parse(article.attachments || '[]'),
            author: article.author,
            status: article.status,
            visibility: article.visibility,
            createdAt: article.created_at,
            updatedAt: article.updated_at,
            publishedAt: article.published_at,
            seo: {
                metaTitle: article.seo_meta_title,
                metaDescription: article.seo_meta_description,
                keywords: JSON.parse(article.seo_keywords || '[]'),
                slug: article.seo_slug
            },
            stats: {
                views: article.views || 0,
                likes: article.likes || 0,
                comments: article.comments || 0,
                shares: article.shares || 0
            }
        };

        return new Response(JSON.stringify(formattedArticle), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300'
            }
        });

    } catch (error) {
        console.error('Error fetching article:', error);
        return new Response(JSON.stringify({
            error: 'Failed to get article'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 获取公开相册详情
async function getPublicAlbum(albumId, env) {
    try {
        const { results } = await env.d1_sql.prepare(`
            SELECT * FROM albums WHERE id = ?
        `).bind(albumId).all();
        
        if (!results || results.length === 0) {
            return new Response(JSON.stringify({
                error: 'Album not found'
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const album = results[0];
        
        // 格式化相册数据
        const formattedAlbum = {
            id: album.id,
            title: album.title,
            description: album.description,
            category: album.category,
            tags: JSON.parse(album.tags || '[]'),
            images: JSON.parse(album.images || '[]'),
            imageCount: album.image_count,
            coverImage: JSON.parse(album.cover_image || 'null'),
            uploadedBy: album.uploaded_by,
            createdAt: album.created_at,
            updatedAt: album.updated_at
        };

        return new Response(JSON.stringify(formattedAlbum), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300'
            }
        });

    } catch (error) {
        console.error('Error fetching album:', error);
        return new Response(JSON.stringify({
            error: 'Failed to get album'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}