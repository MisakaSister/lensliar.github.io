// worker/src/public.js - 公开内容API
export async function handlePublicContent(request, env) {
    try {
        if (request.method === 'GET') {
            // 🌟 公开API - 无需认证
            const content = await env.CONTENT_KV.get("homepage", "json");
            
            if (!content) {
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

            // 🔒 只返回公开字段，过滤敏感信息
            const publicContent = {
                articles: content.articles ? content.articles.map(article => ({
                    id: article.id,
                    title: article.title,
                    content: article.content,
                    category: article.category || '',
                    image: article.image || '',
                    date: article.date
                    // 不包含内部字段或敏感信息
                })) : [],
                images: content.images ? content.images.map(image => ({
                    id: image.id,
                    title: image.title,
                    url: image.url,
                    description: image.description || '',
                    category: image.category || '',
                    date: image.date
                    // 不包含上传者信息等敏感数据
                })) : []
            };

            return new Response(JSON.stringify(publicContent), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=300' // 5分钟缓存
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
        console.error('Public content error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to load content'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}