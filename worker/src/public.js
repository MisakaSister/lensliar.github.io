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
            // GET /api/content 或 GET /api/ - 获取所有内容
            return await getPublicContent(request, env);
        } else if (pathParts[0] === 'article' && pathParts[1]) {
            // GET /api/article/{id} - 获取单篇文章
            return await getPublicArticle(pathParts[1], request, env);
        } else if (pathParts[0] === 'search') {
            // GET /api/search?q=keyword - 搜索文章
            return await searchPublicContent(request, env);
        } else if (pathParts[0] === 'stats') {
            // GET /api/stats - 获取统计信息
            return await getPublicStats(request, env);
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
        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 10, 50); // 最大50条
        const category = url.searchParams.get('category');
        const tag = url.searchParams.get('tag');
        const status = url.searchParams.get('status') || 'published';
        const visibility = url.searchParams.get('visibility') || 'public';

        // 获取文章索引
        const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];

        // 并行获取所有文章
        const articlePromises = articleIndex.map(id => 
            env.CONTENT_KV.get(`article:${id}`, "json")
        );

        const articles = await Promise.all(articlePromises);

        // 过滤文章
        let filteredArticles = articles
            .filter(article => {
                if (!article) return false;
                
                // 只显示已发布的公开文章
                if (article.status !== status) return false;
                if (article.visibility !== visibility) return false;
                
                // 按分类过滤
                if (category && article.category !== category) return false;
                
                // 按标签过滤
                if (tag && (!article.tags || !article.tags.includes(tag))) return false;
                
                return true;
            })
            .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));

        // 分页
        const total = filteredArticles.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

        // 构造公开的文章数据（移除敏感信息）
        const publicArticles = paginatedArticles.map(article => ({
            id: article.id,
            title: article.title,
            summary: article.summary,
            content: article.content,
            category: article.category,
            tags: article.tags,
            coverImage: article.coverImage,
            images: article.images,
            attachments: article.attachments,
            author: article.author,
            publishedAt: article.publishedAt,
            createdAt: article.createdAt,
            seo: article.seo,
            stats: article.stats
        }));

        // 获取相册数据
        console.log('🔍 Getting albums from IMAGES_KV for public API');
        const albumKeys = await env.IMAGES_KV.list({
            prefix: 'album_'
        });

        console.log('📋 Found album keys for public API:', albumKeys.keys.map(k => k.name));

        const albumPromises = albumKeys.keys.map(key => 
            env.IMAGES_KV.get(key.name, 'json')
        );

        const albums = await Promise.all(albumPromises);

        console.log('📊 Albums loaded for public API:', albums.length);
        console.log('📷 Albums data:', albums.map(a => a ? {
            id: a.id, 
            title: a.title, 
            imageCount: a.imageCount 
        } : null));

        // 过滤和排序相册
        const filteredAlbums = albums
            .filter(album => album && album.images && album.images.length > 0)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20); // 最多返回20个相册

        console.log('✅ Filtered albums for public API:', filteredAlbums.length);

        // 构造公开的相册数据
        const publicAlbums = filteredAlbums.map(album => ({
            id: album.id,
            title: album.title,
            description: album.description,
            category: album.category,
            tags: album.tags,
            imageCount: album.imageCount,
            coverImage: album.coverImage,
            images: album.images,
            createdAt: album.createdAt,
            url: album.coverImage?.url // 为了兼容旧的image结构
        }));

        return new Response(JSON.stringify({
            articles: publicArticles,
            images: publicAlbums, // 返回相册数据作为images
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                category,
                tag,
                status,
                visibility
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // 缓存5分钟
            }
        });

    } catch (error) {
        throw new Error(`Failed to get public content: ${error.message}`);
    }
}

// 获取单篇公开文章
async function getPublicArticle(id, request, env) {
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

        // 检查文章是否公开
        if (article.status !== 'published' || article.visibility !== 'public') {
            return new Response(JSON.stringify({
                error: "Article not found"
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 更新浏览量
        article.stats.views = (article.stats.views || 0) + 1;
        await env.CONTENT_KV.put(`article:${id}`, JSON.stringify(article));

        // 构造公开的文章数据
        const publicArticle = {
            id: article.id,
            title: article.title,
            summary: article.summary,
            content: article.content,
            category: article.category,
            tags: article.tags,
            coverImage: article.coverImage,
            images: article.images,
            attachments: article.attachments,
            author: article.author,
            publishedAt: article.publishedAt,
            createdAt: article.createdAt,
            seo: article.seo,
            stats: article.stats
        };

        return new Response(JSON.stringify(publicArticle), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // 缓存5分钟
            }
        });

    } catch (error) {
        throw new Error(`Failed to get public article: ${error.message}`);
    }
}

// 搜索公开内容
async function searchPublicContent(request, env) {
    try {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = Math.min(parseInt(url.searchParams.get('limit')) || 10, 20); // 搜索结果最大20条

        if (!query || query.trim().length < 2) {
            return new Response(JSON.stringify({
                error: "Search query must be at least 2 characters long"
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 获取文章索引
        const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];

        // 并行获取所有文章
        const articlePromises = articleIndex.map(id => 
            env.CONTENT_KV.get(`article:${id}`, "json")
        );

        const articles = await Promise.all(articlePromises);

        // 搜索逻辑
        const searchQuery = query.toLowerCase().trim();
        const searchResults = articles
            .filter(article => {
                if (!article) return false;
                
                // 只搜索已发布的公开文章
                if (article.status !== 'published' || article.visibility !== 'public') return false;
                
                // 搜索标题、摘要、内容、分类、标签
                const searchableText = [
                    article.title,
                    article.summary,
                    article.content,
                    article.category,
                    ...(article.tags || [])
                ].join(' ').toLowerCase();
                
                return searchableText.includes(searchQuery);
            })
            .map(article => {
                // 计算相关性分数
                let score = 0;
                const title = article.title.toLowerCase();
                const summary = article.summary.toLowerCase();
                const content = article.content.toLowerCase();
                
                // 标题匹配权重最高
                if (title.includes(searchQuery)) score += 10;
                if (summary.includes(searchQuery)) score += 5;
                if (content.includes(searchQuery)) score += 1;
                
                // 标签和分类匹配
                if (article.tags && article.tags.some(tag => tag.toLowerCase().includes(searchQuery))) score += 8;
                if (article.category && article.category.toLowerCase().includes(searchQuery)) score += 6;
                
                return { ...article, searchScore: score };
            })
            .sort((a, b) => b.searchScore - a.searchScore); // 按相关性排序

        // 分页
        const total = searchResults.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults = searchResults.slice(startIndex, endIndex);

        // 构造公开的搜索结果
        const publicResults = paginatedResults.map(article => ({
            id: article.id,
            title: article.title,
            summary: article.summary,
            category: article.category,
            tags: article.tags,
            coverImage: article.coverImage,
            author: article.author,
            publishedAt: article.publishedAt,
            createdAt: article.createdAt,
            seo: article.seo,
            stats: article.stats
        }));

        return new Response(JSON.stringify({
            query,
            results: publicResults,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // 缓存5分钟
            }
        });

    } catch (error) {
        throw new Error(`Failed to search public content: ${error.message}`);
    }
}

// 获取公开统计信息
async function getPublicStats(request, env) {
    try {
        // 获取文章索引
        const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];

        // 并行获取所有文章
        const articlePromises = articleIndex.map(id => 
            env.CONTENT_KV.get(`article:${id}`, "json")
        );

        const articles = await Promise.all(articlePromises);

        // 过滤已发布的公开文章
        const publicArticles = articles.filter(article => 
            article && article.status === 'published' && article.visibility === 'public'
        );

        // 计算统计信息
        const stats = {
            totalArticles: publicArticles.length,
            totalViews: publicArticles.reduce((sum, article) => sum + (article.stats?.views || 0), 0),
            totalLikes: publicArticles.reduce((sum, article) => sum + (article.stats?.likes || 0), 0),
            totalImages: publicArticles.reduce((sum, article) => sum + (article.images?.length || 0), 0),
            
            // 分类统计
            categories: {},
            
            // 标签统计
            tags: {},
            
            // 最近更新
            lastUpdated: publicArticles.length > 0 ? 
                Math.max(...publicArticles.map(article => new Date(article.updatedAt || article.createdAt).getTime())) : null
        };

        // 统计分类
        publicArticles.forEach(article => {
            if (article.category) {
                stats.categories[article.category] = (stats.categories[article.category] || 0) + 1;
            }
        });

        // 统计标签
        publicArticles.forEach(article => {
            if (article.tags) {
                article.tags.forEach(tag => {
                    stats.tags[tag] = (stats.tags[tag] || 0) + 1;
                });
            }
        });

        // 转换为数组格式并排序
        stats.categories = Object.entries(stats.categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10); // 最多10个分类

        stats.tags = Object.entries(stats.tags)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20); // 最多20个标签

        return new Response(JSON.stringify(stats), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=600' // 缓存10分钟
            }
        });

    } catch (error) {
        throw new Error(`Failed to get public stats: ${error.message}`);
    }
}