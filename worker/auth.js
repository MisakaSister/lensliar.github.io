import { getAuthConfig } from './kv.js';

// 处理认证请求
export async function handleAuth(event) {
    const { pathname } = new URL(event.request.url);

    // 登录请求
    if (pathname === '/auth/login' && event.request.method === 'POST') {
        const { username, password } = await event.request.json();
        const authConfig = await getAuthConfig();

        // 验证凭证
        if (username === authConfig.username && password === authConfig.password) {
            // 生成访问令牌 (实际应用中应使用JWT)
            const token = crypto.randomUUID();

            // 保存令牌到KV
            await AUTH_TOKENS.put(token, JSON.stringify({
                username,
                expires: Date.now() + 3600000 // 1小时有效期
            }));

            return new Response(JSON.stringify({ token }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('Invalid credentials', { status: 401 });
    }

    // 验证令牌请求
    if (pathname === '/auth/verify' && event.request.method === 'POST') {
        const { token } = await event.request.json();
        const tokenData = await AUTH_TOKENS.get(token, 'json');

        if (tokenData && tokenData.expires > Date.now()) {
            return new Response('Valid token', { status: 200 });
        }

        return new Response('Invalid token', { status: 401 });
    }

    return new Response('Not found', { status: 404 });
}
