export async function handleContent(request, env) {
    const token = request.headers.get('Authorization')?.split(' ')[1];

    // 验证令牌
    if (!token || !(await validateToken(token, env))) {
        return new Response("Unauthorized", {
            status: 401,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }

    const { pathname } = new URL(request.url);

    // 获取内容
    if (pathname === '/content' && request.method === 'GET') {
        const content = await env.CONTENT_KV.get("content", "json") || {
            articles: [],
            images: []
        };
        return new Response(JSON.stringify(content), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    // 更新内容
    if (pathname === '/content' && request.method === 'POST') {
        try {
            const newContent = await request.json();
            await env.CONTENT_KV.put("content", JSON.stringify(newContent));
            return new Response("Content updated", {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        } catch (error) {
            return new Response("Error saving content", {
                status: 500,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }
    }

    return new Response("Not found", {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' }
    });
}

async function validateToken(token, env) {
    try {
        const tokenData = await env.AUTH_KV.get(token, "json");
        return tokenData && tokenData.expires > Date.now();
    } catch (e) {
        return false;
    }
}
