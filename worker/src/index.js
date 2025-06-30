import {handleAuth} from './auth.js';
import {handleContent} from './content.js';
import {handleCors, addCorsHeaders} from './cors.js';

export default {
    async fetch(request, env) {

        const url = new URL(request.url);

        // 1. 首先应用 CORS 中间件
        const corsResponse = handleCors(request, env);
        if (corsResponse) return corsResponse;

        let response;

        try {
            // 2. 处理认证请求
            if (url.pathname.startsWith('/auth')) {
                response = await handleAuth(request, env);
            }
            // 3. 处理内容请求
            else if (url.pathname.startsWith('/content')) {
                response = await handleContent(request, env);
            }
            // 4. 其他请求代理到 GitHub Pages
            else {
                let githubResponse = await fetch(`https://misakasister.github.io${url.pathname}`, request);
                // 创建可修改的响应副本
                response = new Response(githubResponse.body, githubResponse);

                // 删除 GitHub 设置的 CORS 头
                response.headers.delete("Access-Control-Allow-Origin");
                response.headers.delete("Vary");

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
            // 错误处理
            response = new Response(JSON.stringify({
                error: error.message || 'Internal Server Error'
            }), {
                status: error.status || 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 4. 添加 CORS 头到响应
        return addCorsHeaders(request, response, env);
    }
};
