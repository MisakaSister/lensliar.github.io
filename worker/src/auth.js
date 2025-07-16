import bcrypt from 'bcryptjs';
import { addCorsHeaders, handleCors } from "./cors.js";

export async function handleAuth(request, env) {
    const corsResponse = handleCors(request, env);
    if (corsResponse) return corsResponse;
    
    const { pathname } = new URL(request.url);

    if (pathname === '/auth/login' && request.method === 'POST') {
        try {
            console.log('[认证] 开始处理登录请求');
            
            const { username, password } = await request.json();

            if (!username || !password || 
                typeof username !== 'string' || typeof password !== 'string' ||
                username.length > 50 || password.length > 100) {
                console.warn('[认证] 输入验证失败');
                throw new Error('Invalid input');
            }

            console.log('[认证] 验证用户凭证');
            const isValid = await verifyCredentials(username, password, env);

            if (isValid) {
                console.log('[认证] 登录成功，生成token');
                const token = await generateToken(username, env);

                return new Response(JSON.stringify({ token }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            console.warn('[认证] 登录失败，记录失败尝试');
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
        } catch (error) {
            console.error('[认证] 登录处理异常:', error);
            return new Response(JSON.stringify({
                error: error.message || '登录失败'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
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

// 验证用户凭证
async function verifyCredentials(username, password, env) {
    try {
        const userData = await env.AUTH_KV.get(`user:${username}`, "json");
        if (!userData) {
            console.warn(`[认证] 用户不存在: ${username}`);
            return false;
        }

        const isValid = await bcrypt.compare(password, userData.password);
        console.log(`[认证] 密码验证结果: ${isValid}`);
        return isValid;
    } catch (error) {
        console.error('[认证] 验证凭证时出错:', error);
        return false;
    }
}

// 生成认证token
async function generateToken(username, env) {
    const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 24小时

    const tokenData = {
        user: username,
        expires: expires,
        createdAt: new Date().toISOString()
    };

    await env.AUTH_KV.put(token, JSON.stringify(tokenData), {
        expirationTtl: 24 * 60 * 60 // 24小时
    });

    return token;
}

// 记录失败的登录尝试
async function recordFailedLogin(request, env) {
    try {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const key = `failed_login:${ip}`;
        
        const failedAttempts = await env.AUTH_KV.get(key, "json") || { count: 0, lastAttempt: 0 };
        failedAttempts.count += 1;
        failedAttempts.lastAttempt = Date.now();
        
        await env.AUTH_KV.put(key, JSON.stringify(failedAttempts), {
            expirationTtl: 300 // 5分钟
        });
        
        console.warn(`[认证] IP ${ip} 登录失败次数: ${failedAttempts.count}`);
    } catch (error) {
        console.error('[认证] 记录失败登录时出错:', error);
    }
}
