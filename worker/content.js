import { getContent, saveContent } from './kv.js';

// 处理内容请求
export async function handleContent(event) {
    const { pathname } = new URL(event.request.url);

    // 验证令牌
    const token = event.request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
        return new Response('Unauthorized', { status: 401 });
    }

    const tokenData = await AUTH_TOKENS.get(token, 'json');
    if (!tokenData || tokenData.expires < Date.now()) {
        return new Response('Unauthorized', { status: 401 });
    }

    // 获取内容列表
    if (pathname === '/content' && event.request.method === 'GET') {
        const content = await getContent();
        return new Response(JSON.stringify(content), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    }

    // 保存内容
    if (pathname === '/content' && event.request.method === 'POST') {
        try {
            const content = await event.request.json();
            await saveContent(content);
            return new Response('Content saved', { status: 200 });
        } catch (error) {
            return new Response('Error saving content', { status: 500 });
        }
    }

    return new Response('Not found', { status: 404 });
}
