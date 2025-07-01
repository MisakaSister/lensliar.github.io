// worker/src/content.js
export async function handleContent(request, env) {
    try {
        if (request.method === 'GET') {
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
            
            // 验证数据结构
            if (!contentData.articles || !contentData.images) {
                return new Response(JSON.stringify({
                    error: "Invalid content structure"
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            // 保存到 KV
            await env.CONTENT_KV.put("homepage", JSON.stringify(contentData));

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
