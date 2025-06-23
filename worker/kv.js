// 初始化KV命名空间
const CONTENT_STORE = new KVNamespace('CONTENT_STORE');
const AUTH_CONFIG = new KVNamespace('AUTH_CONFIG');
const AUTH_TOKENS = new KVNamespace('AUTH_TOKENS');

// 获取认证配置
export async function getAuthConfig() {
    const config = await AUTH_CONFIG.get('admin', 'json');
    return config || { username: 'admin', password: 'password' };
}

// 获取内容数据
export async function getContent() {
    const content = await CONTENT_STORE.get('content', 'json');
    return content || { articles: [], images: [] };
}

// 保存内容数据
export async function saveContent(data) {
    await CONTENT_STORE.put('content', JSON.stringify(data));
}
