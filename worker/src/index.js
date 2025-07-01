import {handleAuth} from './auth.js';
import {handleContent} from './content.js';
import {handleUpload} from './upload.js';
import {handlePublicContent} from './public.js';
import {handleCors, addCorsHeaders} from './cors.js';

export default {
    async fetch(request, env) {

        const url = new URL(request.url);

        // 1. 首先应用 CORS 中间件
        const corsResponse = handleCors(request, env);
        if (corsResponse) return corsResponse;

        let response;

        try {
            // 🔒 严格的路由匹配和安全验证
            const pathname = url.pathname.toLowerCase();
            
            // 2. 处理认证请求
            if (pathname.startsWith('/auth/') && pathname.length > 6) {
                response = await handleAuth(request, env);
            }
            // 3. 处理公开内容请求（精确匹配）
            else if (pathname === '/public/content') {
                response = await handlePublicContent(request, env);
            }
            // 4. 处理管理员内容请求（精确匹配）
            else if (pathname === '/content') {
                response = await handleContent(request, env);
            }
            // 5. 处理图片上传请求（精确匹配）
            else if (pathname === '/upload') {
                response = await handleUpload(request, env);
            }
            // 🔒 6. 限制代理范围 - 只代理安全的静态文件
            else {
                // 验证请求路径安全性
                const securityCheck = validateProxyPath(url.pathname);
                if (!securityCheck.safe) {
                    return new Response(JSON.stringify({
                        error: "Path not allowed"
                    }), {
                        status: 403,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                }

                // 🔒 安全的代理请求 - 不转发敏感头信息
                const safeHeaders = new Headers();
                safeHeaders.set('User-Agent', 'Cloudflare-Worker');
                safeHeaders.set('Accept', request.headers.get('Accept') || '*/*');
                
                const proxyRequest = new Request(`https://misakasister.github.io${url.pathname}`, {
                    method: 'GET', // 强制只使用GET方法
                    headers: safeHeaders
                });

                response = await fetch(proxyRequest);
            }

            // 3. 确保响应是 Response 对象
            if (!(response instanceof Response)) {
                response = new Response(JSON.stringify(response), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            // 🔒 错误处理 - 不泄露敏感信息
            console.error('Worker error:', error.message);
            response = new Response(JSON.stringify({
                error: 'Internal Server Error'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 4. 添加 CORS 头到响应
        return addCorsHeaders(request, response,env);
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
