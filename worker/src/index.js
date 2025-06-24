import { handleAuth } from './auth.js';
import { handleContent } from './content.js';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 处理认证请求
        if (url.pathname.startsWith('/auth')) {
            return handleAuth(request, env);
        }

        // 处理内容请求
        if (url.pathname.startsWith('/content')) {
            return handleContent(request, env);
        }

        // 其他请求代理到GitHub Pages
        return fetch(`https://misakasister.github.io${url.pathname}`, request);
    }
};
