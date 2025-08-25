// worker/src/upload.js
import { verifyAuth } from './content.js';

export async function handleUpload(request, env) {
    try {
        // 严格的HTTP方法验证
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({
                error: "Method not allowed"
            }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Allow': 'POST'
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

        // 基础文件验证
        if (!file.type.startsWith('image/')) {
            return new Response(JSON.stringify({
                error: "Only image files are allowed"
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB限制
            return new Response(JSON.stringify({
                error: "File size too large (max 5MB)"
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 生成安全的文件名
        const fileName = generateSafeFilename(file.name);

        // 上传到R2存储
        await env.IMAGES_BUCKET.put(fileName, file.stream(), {
            httpMetadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000' // 1年缓存
            },
            customMetadata: {
                uploadedBy: authResult.user,
                uploadedAt: new Date().toISOString(),
                originalName: sanitizeFileName(file.name || 'unknown'),
                clientIP: request.headers.get('CF-Connecting-IP') || 'unknown'
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
            error: 'Upload failed'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 生成安全的文件名
function generateSafeFilename(originalName) {
    const timestamp = Date.now();
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const randomString = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const extension = originalName ? originalName.split('.').pop() : 'jpg';
    return `images/${timestamp}-${randomString}.${extension}`;
}

// 清理文件名
function sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
}