import { handleCors, addCorsHeaders } from './cors.js';
import { handleAuth } from './auth.js';
import { handleContent } from './content.js';
import { handlePublicAPI } from './public.js';
import { handleUpload } from './upload.js';

export default {
    async fetch(request, env, ctx) {
        // 处理预检请求
        if (request.method === 'OPTIONS') {
            return handleCors(request, env);
        }

        try {
            const url = new URL(request.url);
            const pathname = url.pathname;
            
            // 🔒 管理员认证API
            if (pathname.startsWith('/auth')) {
                const response = await handleAuth(request, env);
                return addCorsHeaders(request, response, env);
            }

            // 🔒 内容管理API (需要认证)
            if (pathname.startsWith('/content')) {
                const response = await handleContent(request, env);
                return addCorsHeaders(request, response, env);
            }

            // 🔒 文件上传API (需要认证)
            if (pathname.startsWith('/upload')) {
                const response = await handleUpload(request, env);
                return addCorsHeaders(request, response, env);
            }

            // 🌟 公开API (无需认证)
            if (pathname.startsWith('/api') || pathname === '/') {
                const response = await handlePublicAPI(request, env);
                return addCorsHeaders(request, response, env);
            }

            // 404 处理
            return addCorsHeaders(request, new Response(JSON.stringify({
                error: 'Not Found'
                    }), {
                status: 404,
                        headers: {
                            'Content-Type': 'application/json'
                        }
            }), env);

        } catch (error) {
            console.error('Worker error:', error);
            return addCorsHeaders(request, new Response(JSON.stringify({
                error: 'Internal Server Error'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }), env);
        }
    }
};

// 🔒 验证代理路径的安全性
function validateProxyPath(pathname) {
    // 归一化路径
    const normalizedPath = pathname.toLowerCase().replace(/\/+/g, '/');
    
    // 禁止的路径模式
    const forbiddenPatterns = [
        /\.\./,           // 路径遍历
        /\/\./,           // 隐藏文件
        /api\//,          // API路径
        /admin/,          // 管理路径
        /config/,         // 配置文件
        /\.env/,          // 环境变量
        /\/auth/,         // 认证路径
        /\/content/,      // 内容管理
        /\/upload/,       // 上传路径
        /\/public\/content/, // 公开API
    ];

    // 检查是否匹配禁止模式
    const isForbidden = forbiddenPatterns.some(pattern => 
        pattern.test(normalizedPath)
    );

    if (isForbidden) {
        return { safe: false, reason: 'Forbidden path pattern' };
    }

    // 允许的文件类型
    const allowedExtensions = [
        '.html', '.css', '.js', '.png', '.jpg', '.jpeg', 
        '.gif', '.svg', '.ico', '.txt', '.json', '.xml'
    ];

    // 如果有扩展名，检查是否在允许列表中
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(normalizedPath);
    if (hasExtension) {
        const ext = normalizedPath.match(/\.[a-zA-Z0-9]+$/)[0];
        if (!allowedExtensions.includes(ext)) {
            return { safe: false, reason: 'File type not allowed' };
        }
    }

    return { safe: true };
}
