// worker/src/public.js - 公开内容API
export async function handlePublicContent(request, env) {
    try {
        // 🔒 严格的HTTP方法验证
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({
                error: "Method not allowed"
            }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Allow': 'GET' // 明确指示只允许GET
                }
            });
        }

        // 🌟 公开API - 无需认证
        // 获取文章和图片索引
        const articleIndex = await env.CONTENT_KV.get("articles:index", "json") || [];
        const imageIndex = await env.CONTENT_KV.get("images:index", "json") || [];

        // 并行获取所有文章和图片
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

        // 🔒 只返回公开字段，过滤敏感信息
        const publicContent = {
            articles: validArticles.map(article => ({
                id: article.id,
                title: article.title,
                content: article.content,
                category: article.category || '',
                image: article.image || '',
                date: article.date
                // 不包含内部字段或敏感信息
            })),
            images: validImages.map(image => ({
                id: image.id,
                title: image.title,
                url: image.url,
                description: image.description || '',
                category: image.category || '',
                date: image.date
                // 不包含上传者信息等敏感数据
            }))
        };

        return new Response(JSON.stringify(publicContent), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // 5分钟缓存
            }
        });

    } catch (error) {
        console.error('Public content error:', error);
        return new Response(JSON.stringify({
            articles: [],
            images: []
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}