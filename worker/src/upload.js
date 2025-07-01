// worker/src/upload.js
export async function handleUpload(request, env) {
    try {
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({
                error: "Method not allowed"
            }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 验证权限
        const authResult = await verifyAuth(request, env);
        if (!authResult.success) {
            return new Response(JSON.stringify({
                error: authResult.error
            }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 解析上传的文件
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({
                error: "No file provided"
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({
                error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 验证文件大小 (5MB限制)
        if (file.size > 5 * 1024 * 1024) {
            return new Response(JSON.stringify({
                error: "File size exceeds 5MB limit"
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 生成唯一的文件名
        const timestamp = Date.now();
        const randomString = crypto.randomUUID().split('-')[0];
        const fileExtension = getFileExtension(file.type);
        const fileName = `images/${timestamp}-${randomString}.${fileExtension}`;

        // 上传到R2存储
        await env.IMAGES_BUCKET.put(fileName, file.stream(), {
            httpMetadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000' // 1年缓存
            },
            customMetadata: {
                uploadedBy: authResult.user,
                uploadedAt: new Date().toISOString(),
                originalName: file.name || 'unknown'
            }
        });

        // 构造公开访问URL
        const imageUrl = `https://images.wengguodong.com/${fileName}`;

        return new Response(JSON.stringify({
            success: true,
            url: imageUrl,
            fileName: fileName,
            size: file.size,
            type: file.type
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Upload failed'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 验证认证token (复用content.js中的逻辑)
async function verifyAuth(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    const tokenData = await env.AUTH_KV.get(token, "json");

    if (!tokenData) {
        return { success: false, error: 'Invalid or expired token' };
    }

    if (tokenData.expires < Date.now()) {
        await env.AUTH_KV.delete(token);
        return { success: false, error: 'Token expired' };
    }

    return { success: true, user: tokenData.user };
}

// 根据MIME类型获取文件扩展名
function getFileExtension(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
    };
    return extensions[mimeType] || 'jpg';
} 