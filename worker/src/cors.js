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
        "https://misakasister.github.io"
    ];
}

// 处理 OPTIONS 预检请求的中间件
export function handleCors(request) {
    const allowedOrigins = getAllowedOrigins(env);
    const origin = request.headers.get("Origin");

    // 检查请求来源是否在允许列表中
    const isAllowed = allowedOrigins.some(allowedOrigin =>
        origin === allowedOrigin || origin?.endsWith(allowedOrigin)
    );

    // 如果是预检请求，直接返回 CORS 响应
    if (request.method === "OPTIONS") {
        const headers = {
            "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400", // 24小时缓存
            "Vary": "Origin"
        };

        return new Response(null, {
            status: 204, // No Content
            headers
        });
    }

    // 如果不是预检请求，返回 null 继续处理后续逻辑
    return null;
}

// 为响应添加 CORS 头的中间件
export function addCorsHeaders(request, response) {
    const allowedOrigins = getAllowedOrigins(env);
    const origin = request.headers.get("Origin");

    // 检查请求来源是否在允许列表中
    const isAllowed = allowedOrigins.some(allowedOrigin =>
        origin === allowedOrigin || origin?.endsWith(allowedOrigin)
    );

    // 克隆响应以便修改头
    const newResponse = new Response(response.body, response);

    // 添加 CORS 头
    if (isAllowed) {
        newResponse.headers.set("Access-Control-Allow-Origin", origin);
        newResponse.headers.set("Access-Control-Allow-Credentials", "true");
        newResponse.headers.set("Vary", "Origin");
    }

    // 添加安全头
    newResponse.headers.set("X-Content-Type-Options", "nosniff");
    newResponse.headers.set("X-Frame-Options", "DENY");

    return newResponse;
}
