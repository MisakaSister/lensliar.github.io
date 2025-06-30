import bcrypt from 'bcryptjs';
import {addCorsHeaders, handleCors} from "./cors";

export async function handleAuth(request, env) {
    // 先处理OPTIONS预检请求
    const corsResponse = handleCors(request, env);
    if (corsResponse) return corsResponse;
    const {pathname} = new URL(request.url);

    if (pathname === '/auth/login' && request.method === 'POST') {
        const {username, password} = await request.json();

        // 验证凭证
        const isValid = await verifyCredentials(username, password, env);

        if (isValid) {
            // 创建令牌
            const token = crypto.randomUUID();

            // 存储令牌到KV
            await env.AUTH_KV.put(token, JSON.stringify({
                user: username,
                expires: Date.now() + 3600000 // 1小时有效期
            }), {expirationTtl: 3600});

            return new Response(JSON.stringify({token}), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
            return addCorsHeaders(request, response, env);
        }

        return new Response("Invalid credentials", {
            status: 401,
            headers: {'Access-Control-Allow-Origin': '*'}
        });
    }

    return new Response("Not found", {
        status: 404,
        headers: {'Access-Control-Allow-Origin': '*'}
    });
}

async function verifyCredentials(username, password, env) {
    console.log('输入名称:',username);
    console.log('输出名称：',env.SECRET_ADMIN_USERNAME)
    // 检查用户名
    if (username !== env.SECRET_ADMIN_USERNAME) return false;

    // 加盐哈希验证
    const saltedPassword = password + env.SECRET_PEPPER ;
    console.log('加盐哈希验证:',saltedPassword);
    console.log('actions:',env.SECRET_ADMIN_PASSWORD_HASH);
    // 使用 await 等待比较结果
    const isValid = await bcrypt.compare(saltedPassword, env.SECRET_ADMIN_PASSWORD_HASH);
    console.log("Password comparison result:", isValid);
    return isValid;
}
