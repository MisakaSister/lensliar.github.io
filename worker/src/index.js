import { handleCors, addCorsHeaders } from './cors.js';
import { handleAuth } from './auth.js';
import { handleContent } from './content.js';
import { handlePublicAPI } from './public.js';
import { handleUpload } from './upload.js';
import { handleImages } from './images.js';

export default {
    async fetch(request, env, ctx) {
        // 处理预检请求
        if (request.method === 'OPTIONS') {
            return handleCors(request, env);
        }

        try {
            const url = new URL(request.url);
            const pathname = url.pathname;
            
            // 管理员认证API
            if (pathname.startsWith('/auth')) {
                const response = await handleAuth(request, env);
                return addCorsHeaders(request, response, env);
            }

            // 内容管理API (需要认证)
            if (pathname.startsWith('/content')) {
                const response = await handleContent(request, env);
                return addCorsHeaders(request, response, env);
            }

            // 文件上传API (需要认证)
            if (pathname.startsWith('/upload')) {
                const response = await handleUpload(request, env);
                return addCorsHeaders(request, response, env);
            }

            // 图片管理API (需要认证)
            if (pathname.startsWith('/images')) {
                const response = await handleImages(request, env);
                return addCorsHeaders(request, response, env);
            }

            // 公开API (无需认证)
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
                error: 'Internal server error'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }), env);
        }
    }
};
