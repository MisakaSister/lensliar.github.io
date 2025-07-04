// worker/src/error-handler.js

// 定义错误类型
export class APIError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

// 定义常见错误类型
export const ErrorTypes = {
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        message: 'Invalid input data'
    },
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        statusCode: 401,
        message: 'Authentication required'
    },
    FORBIDDEN: {
        code: 'FORBIDDEN',
        statusCode: 403,
        message: 'Access denied'
    },
    NOT_FOUND: {
        code: 'NOT_FOUND',
        statusCode: 404,
        message: 'Resource not found'
    },
    RATE_LIMITED: {
        code: 'RATE_LIMITED',
        statusCode: 429,
        message: 'Too many requests'
    },
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        message: 'Internal server error'
    },
    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        message: 'Service temporarily unavailable'
    }
};

// 创建标准错误
export function createError(errorType, customMessage = null) {
    const type = ErrorTypes[errorType] || ErrorTypes.INTERNAL_ERROR;
    return new APIError(
        customMessage || type.message,
        type.code,
        type.statusCode
    );
}

// 格式化错误响应
export function formatErrorResponse(error, includeStack = false) {
    const isAPIError = error instanceof APIError;
    
    const errorResponse = {
        success: false,
        error: {
            code: isAPIError ? error.code : 'UNKNOWN_ERROR',
            message: isAPIError ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        }
    };

    // 只在开发环境中包含堆栈信息
    if (includeStack && error.stack) {
        errorResponse.error.stack = error.stack;
    }

    return errorResponse;
}

// 统一错误处理器
export function handleError(error, request = null) {
    const isAPIError = error instanceof APIError;
    const statusCode = isAPIError ? error.statusCode : 500;
    
    // 记录错误（但不输出到控制台）
    const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
            name: error.name,
            message: error.message,
            code: isAPIError ? error.code : 'UNKNOWN_ERROR',
            statusCode: statusCode
        },
        request: request ? {
            method: request.method,
            url: request.url,
            userAgent: request.headers.get('User-Agent'),
            ip: request.headers.get('CF-Connecting-IP')
        } : null
    };

    // 在生产环境中，可以发送到日志服务
    // await logError(errorLog);

    return new Response(
        JSON.stringify(formatErrorResponse(error, false)),
        {
            status: statusCode,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

// 验证请求数据
export function validateRequest(data, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];

        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} is required`);
            continue;
        }

        if (value !== undefined && value !== null) {
            // 类型检查
            if (rules.type && typeof value !== rules.type) {
                errors.push(`${field} must be of type ${rules.type}`);
            }

            // 字符串长度检查
            if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
                errors.push(`${field} must be at least ${rules.minLength} characters long`);
            }

            if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                errors.push(`${field} must not exceed ${rules.maxLength} characters`);
            }

            // 数字范围检查
            if (rules.min && typeof value === 'number' && value < rules.min) {
                errors.push(`${field} must be at least ${rules.min}`);
            }

            if (rules.max && typeof value === 'number' && value > rules.max) {
                errors.push(`${field} must not exceed ${rules.max}`);
            }

            // 正则表达式检查
            if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
                errors.push(`${field} has invalid format`);
            }
        }
    }

    if (errors.length > 0) {
        throw createError('VALIDATION_ERROR', errors.join(', '));
    }

    return true;
}

// 异步错误处理包装器
export function asyncErrorHandler(fn) {
    return async (request, env, ctx) => {
        try {
            return await fn(request, env, ctx);
        } catch (error) {
            return handleError(error, request);
        }
    };
}

// 中间件：请求验证
export function validateRequestMiddleware(schema) {
    return async (request, env, ctx, next) => {
        try {
            const contentType = request.headers.get('Content-Type');
            
            if (contentType && contentType.includes('application/json')) {
                const data = await request.json();
                validateRequest(data, schema);
                // 将验证后的数据附加到请求对象
                request.validatedData = data;
            }
            
            return await next(request, env, ctx);
        } catch (error) {
            return handleError(error, request);
        }
    };
}

// 中间件：速率限制
export function rateLimitMiddleware(limit = 100, windowMs = 60000) {
    return async (request, env, ctx, next) => {
        try {
            const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
            const key = `rate_limit:${ip}`;
            
            const current = await env.AUTH_KV.get(key);
            const count = current ? parseInt(current) : 0;
            
            if (count >= limit) {
                throw createError('RATE_LIMITED');
            }
            
            // 增加计数
            await env.AUTH_KV.put(key, (count + 1).toString(), {
                expirationTtl: Math.ceil(windowMs / 1000)
            });
            
            return await next(request, env, ctx);
        } catch (error) {
            return handleError(error, request);
        }
    };
}

// 中间件：认证检查
export function authMiddleware() {
    return async (request, env, ctx, next) => {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw createError('UNAUTHORIZED');
            }

            const token = authHeader.substring(7);
            const tokenData = await env.AUTH_KV.get(token, "json");

            if (!tokenData) {
                throw createError('UNAUTHORIZED', 'Invalid token');
            }

            if (tokenData.expires < Date.now()) {
                await env.AUTH_KV.delete(token);
                throw createError('UNAUTHORIZED', 'Token expired');
            }

            // 验证会话指纹
            if (tokenData.sessionFingerprint) {
                const currentFingerprint = await generateSessionFingerprint(request);
                if (tokenData.sessionFingerprint !== currentFingerprint) {
                    await env.AUTH_KV.delete(token);
                    throw createError('FORBIDDEN', 'Session security validation failed');
                }
            }

            // 将用户信息附加到请求对象
            request.user = tokenData.user;
            
            return await next(request, env, ctx);
        } catch (error) {
            return handleError(error, request);
        }
    };
}

// 生成会话指纹（与其他文件保持一致）
async function generateSessionFingerprint(request) {
    const components = [
        request.headers.get('User-Agent') || '',
        request.headers.get('Accept-Language') || '',
        request.headers.get('CF-Connecting-IP') || ''
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
} 