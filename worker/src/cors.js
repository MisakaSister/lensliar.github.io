// worker/src/middleware/cors.js

// 允许的源列表（可从环境变量获取）
export function getAllowedOrigins(env) {
    if (env && env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.trim()!== '') {
        return env.ALLOWED_ORIGINS.split(',');
    }


    // 默认值
    return [
        "https://wengguodong.com",
        "https://www.wengguodong.com",
        "https://lensliar.github.io",
        "https://misakasister.github.io"
    ];
}

// 检查源是否匹配（支持通配符）
function isOriginAllowed(origin, allowedOrigins) {
    if (!origin) return false;

    return allowedOrigins.some(pattern => {
        // 处理通配符
        if (pattern.includes('*')) {
            const regex = new RegExp(
                `^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`
            );
            return regex.test(origin);
        }
        return origin === pattern;
    });
}

// 处理 OPTIONS 预检请求的中间件
export function handleCors(request,env) {
    const allowedOrigins = getAllowedOrigins(env);
    const origin = request.headers.get("Origin");
    const isAllowed = isOriginAllowed(origin, allowedOrigins);

    if (request.method === "OPTIONS") {
        if (!isAllowed) {
            // 如果域名不被允许，直接拒绝
            return new Response(null, { status: 403 });
        }
        
        const headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400", // 24小时缓存
            "Vary": "Origin"
        };

        return new Response(null, { status: 204, headers });
    }

    return null;
}

// 为响应添加 CORS 头的中间件
export function addCorsHeaders(request, response,env) {
    const allowedOrigins = getAllowedOrigins(env);
    const origin = request.headers.get("Origin");

    // 🔒 严格的域名验证 - 防止DNS劫持
    const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (!origin) return false;
        
        // 精确匹配
        if (origin === allowedOrigin) return true;
        
        // 子域名匹配（必须以.开头）
        if (allowedOrigin.startsWith('.')) {
            return origin.endsWith(allowedOrigin);
        }
        
        // 不允许其他模式匹配
        return false;
    });

    // 克隆响应以便修改头
    const newResponse = new Response(response.body, response);

    // 添加 CORS 头
    if (isAllowed) {
        newResponse.headers.set("Access-Control-Allow-Origin", origin);
        newResponse.headers.set("Access-Control-Allow-Credentials", "true");
        newResponse.headers.set("Vary", "Origin");
    }

    // 🔒 添加完整的安全头
    newResponse.headers.set("X-Content-Type-Options", "nosniff");
    newResponse.headers.set("X-Frame-Options", "DENY");
    newResponse.headers.set("X-XSS-Protection", "1; mode=block");
    newResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newResponse.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    
    // 🔒 强化的内容安全策略 - 防止XSS攻击
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // 移除了unsafe-eval以提高安全性
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https:",
        "connect-src 'self' https://worker.wengguodong.com https://images.wengguodong.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "media-src 'self' https:",
        "child-src 'none'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "upgrade-insecure-requests"
    ].join('; ');
    
    newResponse.headers.set("Content-Security-Policy", csp);
    newResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    return newResponse;
}
