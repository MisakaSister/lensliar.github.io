// worker/src/rate-limiter.js

import { createError } from './error-handler.js';

// 速率限制配置
const RATE_LIMIT_CONFIG = {
    // 全局限制
    global: {
        limit: 1000,
        windowMs: 60000, // 1分钟
        message: 'Too many requests from this IP'
    },
    // 登录限制
    login: {
        limit: 5,
        windowMs: 300000, // 5分钟
        message: 'Too many login attempts'
    },
    // 上传限制
    upload: {
        limit: 10,
        windowMs: 60000, // 1分钟
        message: 'Too many upload requests'
    },
    // 内容创建限制
    content: {
        limit: 20,
        windowMs: 60000, // 1分钟
        message: 'Too many content creation requests'
    },
    // 公共API限制
    public: {
        limit: 100,
        windowMs: 60000, // 1分钟
        message: 'Too many public API requests'
    }
};

// 获取客户端标识符
function getClientId(request) {
    // 优先使用CF-Connecting-IP
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) return ip;
    
    // 备用方案
    const forwardedFor = request.headers.get('X-Forwarded-For');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    
    // 最后使用User-Agent的hash作为标识
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    return `ua:${btoa(userAgent).substring(0, 16)}`;
}

// 生成速率限制键
function getRateLimitKey(clientId, type) {
    return `rate_limit:${type}:${clientId}`;
}

// 检查速率限制
export async function checkRateLimit(request, env, type = 'global') {
    const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.global;
    const clientId = getClientId(request);
    const key = getRateLimitKey(clientId, type);
    
    try {
        // 获取当前计数
        const current = await env.AUTH_KV.get(key);
        const count = current ? parseInt(current) : 0;
        
        // 检查是否超过限制
        if (count >= config.limit) {
            throw createError('RATE_LIMITED', config.message);
        }
        
        // 增加计数
        const newCount = count + 1;
        await env.AUTH_KV.put(key, newCount.toString(), {
            expirationTtl: Math.ceil(config.windowMs / 1000)
        });
        
        return {
            success: true,
            count: newCount,
            limit: config.limit,
            windowMs: config.windowMs,
            remaining: config.limit - newCount,
            resetTime: Date.now() + config.windowMs
        };
        
    } catch (error) {
        if (error.code === 'RATE_LIMITED') {
            throw error;
        }
        
        // 如果KV操作失败，记录错误但不阻止请求
        return {
            success: true,
            count: 0,
            limit: config.limit,
            windowMs: config.windowMs,
            remaining: config.limit,
            resetTime: Date.now() + config.windowMs,
            warning: 'Rate limit check failed'
        };
    }
}

// 获取速率限制状态
export async function getRateLimitStatus(request, env, type = 'global') {
    const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.global;
    const clientId = getClientId(request);
    const key = getRateLimitKey(clientId, type);
    
    try {
        const current = await env.AUTH_KV.get(key);
        const count = current ? parseInt(current) : 0;
        
        return {
            count: count,
            limit: config.limit,
            remaining: Math.max(0, config.limit - count),
            windowMs: config.windowMs
        };
    } catch (error) {
        return {
            count: 0,
            limit: config.limit,
            remaining: config.limit,
            windowMs: config.windowMs,
            error: 'Failed to get rate limit status'
        };
    }
}

// 重置速率限制
export async function resetRateLimit(request, env, type = 'global') {
    const clientId = getClientId(request);
    const key = getRateLimitKey(clientId, type);
    
    try {
        await env.AUTH_KV.delete(key);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 速率限制中间件
export function rateLimitMiddleware(type = 'global', customConfig = null) {
    return async (request, env, ctx) => {
        try {
            // 如果提供了自定义配置，临时使用它
            if (customConfig) {
                const originalConfig = RATE_LIMIT_CONFIG[type];
                RATE_LIMIT_CONFIG[type] = { ...originalConfig, ...customConfig };
            }
            
            const result = await checkRateLimit(request, env, type);
            
            // 在响应头中添加速率限制信息
            const headers = {
                'X-RateLimit-Limit': result.limit.toString(),
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
            };
            
            return { headers, result };
            
        } catch (error) {
            if (error.code === 'RATE_LIMITED') {
                // 返回429状态码和重试信息
                const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.global;
                const retryAfter = Math.ceil(config.windowMs / 1000);
                
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: {
                            code: 'RATE_LIMITED',
                            message: error.message,
                            retryAfter: retryAfter
                        }
                    }),
                    {
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'Retry-After': retryAfter.toString(),
                            'X-RateLimit-Limit': config.limit.toString(),
                            'X-RateLimit-Remaining': '0',
                            'X-RateLimit-Reset': Math.ceil((Date.now() + config.windowMs) / 1000).toString()
                        }
                    }
                );
            }
            
            throw error;
        }
    };
}

// 为响应添加速率限制头
export function addRateLimitHeaders(response, rateLimitResult) {
    if (!rateLimitResult || !rateLimitResult.headers) return response;
    
    const newResponse = new Response(response.body, response);
    
    for (const [key, value] of Object.entries(rateLimitResult.headers)) {
        newResponse.headers.set(key, value);
    }
    
    return newResponse;
}

// 滑动窗口速率限制（更精确但占用更多存储）
export async function checkSlidingWindowRateLimit(request, env, type = 'global') {
    const config = RATE_LIMIT_CONFIG[type] || RATE_LIMIT_CONFIG.global;
    const clientId = getClientId(request);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // 使用时间戳作为键的后缀
    const keyPrefix = `sliding_rate_limit:${type}:${clientId}`;
    
    try {
        // 获取当前窗口内的所有请求
        const requests = [];
        
        // 由于KV不支持范围查询，我们使用一个简化的方法
        // 存储一个包含时间戳数组的单个键
        const requestsData = await env.AUTH_KV.get(keyPrefix, 'json');
        const existingRequests = requestsData ? requestsData.requests || [] : [];
        
        // 过滤出当前窗口内的请求
        const validRequests = existingRequests.filter(timestamp => timestamp > windowStart);
        
        // 检查是否超过限制
        if (validRequests.length >= config.limit) {
            throw createError('RATE_LIMITED', config.message);
        }
        
        // 添加当前请求
        validRequests.push(now);
        
        // 存储更新后的请求列表
        await env.AUTH_KV.put(keyPrefix, JSON.stringify({
            requests: validRequests,
            lastUpdate: now
        }), {
            expirationTtl: Math.ceil(config.windowMs / 1000) + 60 // 额外60秒缓冲
        });
        
        return {
            success: true,
            count: validRequests.length,
            limit: config.limit,
            windowMs: config.windowMs,
            remaining: config.limit - validRequests.length,
            resetTime: Math.min(...validRequests) + config.windowMs
        };
        
    } catch (error) {
        if (error.code === 'RATE_LIMITED') {
            throw error;
        }
        
        // 如果出错，回退到简单的固定窗口限制
        return await checkRateLimit(request, env, type);
    }
}

// 获取可用的速率限制类型
export function getRateLimitTypes() {
    return Object.keys(RATE_LIMIT_CONFIG);
}

// 更新速率限制配置
export function updateRateLimitConfig(type, config) {
    if (RATE_LIMIT_CONFIG[type]) {
        RATE_LIMIT_CONFIG[type] = { ...RATE_LIMIT_CONFIG[type], ...config };
        return true;
    }
    return false;
} 