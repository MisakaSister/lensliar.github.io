import bcrypt from 'bcryptjs';
import {addCorsHeaders, handleCors} from "./cors";

export async function handleAuth(request, env) {
    // 先处理OPTIONS预检请求
    const corsResponse = handleCors(request, env);
    if (corsResponse) return corsResponse;
    const {pathname} = new URL(request.url);

    if (pathname === '/auth/login' && request.method === 'POST') {
        // 🔒 基础速率限制
        const rateLimitResult = await checkBasicRateLimit(request, env);
        if (!rateLimitResult.allowed) {
            return new Response(JSON.stringify({
                error: rateLimitResult.error
            }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        const {username, password} = await request.json();

        // 🔒 基本输入验证
        if (!username || !password || 
            typeof username !== 'string' || typeof password !== 'string' ||
            username.length > 50 || password.length > 100) {
            return new Response(JSON.stringify({
                error: "Invalid input"
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 验证凭证
        const isValid = await verifyCredentials(username, password, env);

        if (isValid) {
            // 🔒 创建更安全的令牌
            const token = await generateSecureToken();

            // 🔒 存储令牌到KV，包含更多安全信息
            await env.AUTH_KV.put(token, JSON.stringify({
                user: username,
                expires: Date.now() + 3600000, // 1小时有效期
                created: Date.now(),
                ip: request.headers.get('CF-Connecting-IP') || 'unknown',
                userAgent: request.headers.get('User-Agent') || 'unknown'
            }), {expirationTtl: 3600});

            return new Response(JSON.stringify({token}), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 🔒 记录失败的登录尝试
        await recordFailedLogin(request, env);

        return new Response(JSON.stringify({
            error: "账号密码错误"
        }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    return new Response(JSON.stringify({
        error: "Not found"
    }), {
        status: 404,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

async function verifyCredentials(username, password, env) {
    // 检查用户名
    if (username !== env.SECRET_ADMIN_USERNAME) return false;

    // 加盐哈希验证
    const saltedPassword = password + env.SECRET_PEPPER ;
    // 使用 await 等待比较结果
    const isValid = await bcrypt.compare(saltedPassword, env.SECRET_ADMIN_PASSWORD_HASH);
    return isValid;
}

// 🔒 生成更安全的token
async function generateSecureToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 🔒 基础速率限制
async function checkBasicRateLimit(request, env) {
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For') || 
                     'unknown';
    
    const key = `login_attempts:${clientIP}`;
    const current = await env.AUTH_KV.get(key);
    
    if (current && parseInt(current) > 5) { // 每小时5次登录尝试
        return { 
            allowed: false, 
            error: 'Too many login attempts. Please try again later.' 
        };
    }
    
    return { allowed: true };
}

// 🔒 记录失败的登录尝试
async function recordFailedLogin(request, env) {
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For') || 
                     'unknown';
    
    const key = `login_attempts:${clientIP}`;
    const current = await env.AUTH_KV.get(key);
    const count = current ? parseInt(current) + 1 : 1;
    
    await env.AUTH_KV.put(key, count.toString(), { expirationTtl: 3600 }); // 1小时TTL
}
