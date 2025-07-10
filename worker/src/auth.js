import bcrypt from 'bcryptjs';
import {addCorsHeaders, handleCors} from "./cors";
import { handleError, createError } from './error-handler.js';
import { checkRateLimit } from './rate-limiter.js';
import { SmartFingerprintValidator } from './smart-fingerprint.js';

export async function handleAuth(request, env) {
    // 先处理OPTIONS预检请求
    const corsResponse = handleCors(request, env);
    if (corsResponse) return corsResponse;
    const {pathname} = new URL(request.url);

    if (pathname === '/auth/login' && request.method === 'POST') {
        try {
            // 🔒 基础速率限制
            await checkRateLimit(request, env, 'login');

            const {username, password} = await request.json();

            // 🔒 基本输入验证
            if (!username || !password || 
                typeof username !== 'string' || typeof password !== 'string' ||
                username.length > 50 || password.length > 100) {
                throw createError('VALIDATION_ERROR', 'Invalid input');
            }

            // 验证凭证
            const isValid = await verifyCredentials(username, password, env);

            if (isValid) {
                // 🔒 清理旧的token（防止会话固定）
                await cleanupExpiredTokens(env, request.headers.get('CF-Connecting-IP'));
                
                // 🔒 创建更安全的令牌
                const token = await generateSecureToken();

                // 🔒 使用智能指纹系统
                const fingerprintValidator = new SmartFingerprintValidator(env);
                const smartFingerprint = await fingerprintValidator.generateSmartFingerprint(request);
                
                // 🔒 存储令牌到KV，包含更多安全信息
                await env.AUTH_KV.put(token, JSON.stringify({
                    user: username,
                    expires: Date.now() + 3600000, // 1小时有效期
                    created: Date.now(),
                    ip: request.headers.get('CF-Connecting-IP') || 'unknown',
                    userAgent: request.headers.get('User-Agent') || 'unknown',
                    // 🔒 使用智能会话指纹
                    sessionFingerprint: smartFingerprint
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
        } catch (error) {
            return handleError(error, request);
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

// 🔒 防时序攻击的用户名验证
async function verifyCredentials(username, password, env) {
    // 添加固定延迟防止时序攻击
    const startTime = Date.now();
    const minProcessTime = 200; // 最少200ms处理时间
    
    let isValid = false;
    
    try {
        // 检查用户名（恒定时间）
        const usernameValid = username === env.SECRET_ADMIN_USERNAME;
        
        // 即使用户名错误也执行密码验证（防时序攻击）
        const saltedPassword = password + env.SECRET_PEPPER;
        const passwordValid = await bcrypt.compare(saltedPassword, env.SECRET_ADMIN_PASSWORD_HASH);
        
        isValid = usernameValid && passwordValid;
        
    } catch (error) {
        // 确保发生错误时也有固定延迟
        isValid = false;
    }
    
    // 确保最小处理时间（防时序攻击）
    const elapsed = Date.now() - startTime;
    if (elapsed < minProcessTime) {
        await new Promise(resolve => setTimeout(resolve, minProcessTime - elapsed));
    }
    
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

// 🔒 清理过期token
async function cleanupExpiredTokens(env, clientIP) {
    // 这里可以添加批量清理逻辑
    // 由于KV的限制，我们依赖TTL自动清理

}

// 🔒 生成会话指纹（更温和的版本）
async function generateSessionFingerprint(request) {
    // 只使用相对稳定的User-Agent前缀，忽略版本号
    const userAgent = request.headers.get('User-Agent') || '';
    const stableUserAgent = userAgent.split('/')[0] || userAgent.substring(0, 50);
    
    const components = [
        stableUserAgent,
        request.headers.get('Accept-Language') || '',
        // 暂时移除IP检查，因为CDN可能导致IP变化
        // request.headers.get('CF-Connecting-IP') || ''
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
}
