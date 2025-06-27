// worker/src/content.js
export async function handleContent(request, env) {
    try {
        // 从 KV 获取内容
        const content = await env.CONTENT_KV.get("homepage", "json");

        if (!content) {
            return {
                error: "Content not found",
                status: 404
            };
        }

        return content;

    } catch (error) {
        return {
            error: error.message,
            status: 500
        };
    }
}
