// worker/src/public.js - 公开内容API

export async function handlePublicAPI(request, env) {
    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(part => part);

        // 移除 'api' 前缀
        if (pathParts[0] === 'api') {
            pathParts.shift();
        }

        // 只允许 GET 请求
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({
                error: "Method not allowed"
            }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Allow': 'GET'
                }
            });
        }

        // 路由处理
        if (pathParts.length === 0 || pathParts[0] === 'content') {
            return await getPublicContent(request, env);
        }

        return new Response(JSON.stringify({
            error: "Endpoint not found"
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Public API error:', error);
        return new Response(JSON.stringify({
            error: "Internal server error"
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

        // 获取文章 - 分步处理以避免资源超限
        let articles = [];
        let images = [];
        
        try {
            // 步骤1: 获取文章索引，限制数量
            const articleIndex = (await env.CONTENT_KV.get("articles:index", "json") || []).slice(0, 20);
            
            // 步骤2: 只获取当前页需要的文章
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const articleIdsToFetch = articleIndex.slice(startIndex, endIndex);
            
            // 步骤3: 一次只获取5个文章
            const fetchedArticles = [];
            for (let i = 0; i < articleIdsToFetch.length; i += 5) {
                const batch = articleIdsToFetch.slice(i, i + 5);
                const batchPromises = batch.map(id => 
                    env.CONTENT_KV.get(`article:${id}`, "json").catch(() => null)
                );
                const batchResults = await Promise.all(batchPromises);
                fetchedArticles.push(...batchResults);
            }
            
            // 步骤4: 过滤和格式化文章
            articles = fetchedArticles
                .filter(article => article && article.status === 'published' && article.visibility === 'public')
                .map(article => ({
                    id: article.id,
                    title: article.title,
                    summary: article.summary,
                    content: article.content,
                    category: article.category,
                    tags: article.tags || [],
                    coverImage: article.coverImage,
                    images: article.images || [],
                    author: article.author,
                    publishedAt: article.publishedAt,
                    createdAt: article.createdAt,
                    stats: article.stats || { views: 0, likes: 0 }
                }));
        } catch (error) {
            console.error('Error fetching articles:', error);
            articles = [];
        }

        try {
            // 步骤5: 获取相册 - 限制数量
            const albumKeys = await env.IMAGES_KV.list({
                prefix: 'album_',
                limit: 10
            });
            
            // 步骤6: 获取相册数据
            const albumPromises = albumKeys.keys.slice(0, 5).map(key => 
                env.IMAGES_KV.get(key.name, 'json').catch(() => null)
            );
            const albums = await Promise.all(albumPromises);
            
            // 步骤7: 过滤和格式化相册
            images = albums
                .filter(album => album && album.images && album.images.length > 0)
                .map(album => ({
                    id: album.id,
                    title: album.title,
                    description: album.description,
                    imageCount: album.imageCount,
                    createdAt: album.createdAt,
                    coverImage: album.coverImage,
                    images: album.images || [] // 确保返回完整的images字段
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
        console.error('getPublicContent error:', error);
        return new Response(JSON.stringify({
            error: "Failed to get content"
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}