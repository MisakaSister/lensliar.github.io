// worker/src/upload.js

import { handleError, createError } from './error-handler.js';
import { checkRateLimit } from './rate-limiter.js';
import { validateImageFile, validateFileContent, validateFilename, generateSafeFilename } from './file-validator.js';

export async function handleUpload(request, env) {
    try {
        // 🔒 严格的HTTP方法验证
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({
                error: "Method not allowed"
            }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Allow': 'POST' // 明确指示允许的方法
                }
            });
        }

        // 🔒 基础速率限制
        await checkRateLimit(request, env, 'upload');

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

        // 🔒 增强文件验证
        validateFilename(file.name);
        validateImageFile(file, file.type);
        await validateFileContent(file, file.type);

        // 🔒 生成安全的文件名
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

        // 注意：这里只上传图片到R2，不自动创建相册
        // 相册创建由前端明确调用 /images API 完成
        // 文章中的图片索引由文章系统自己管理

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
        return handleError(error, request);
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

    // 🔒 会话指纹验证已临时完全禁用
    if (false && tokenData.sessionFingerprint) {
        // 验证逻辑已临时禁用，直到问题解决
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

// 🔒 增强文件验证
function validateUploadFile(file) {
    // 检查文件存在
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // 检查文件名
    if (file.name && file.name.length > 255) {
        return { valid: false, error: 'Filename too long' };
    }

    // 检查MIME类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        return { 
            valid: false, 
            error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." 
        };
    }

    // 检查文件大小 (5MB限制)
    if (file.size > 5 * 1024 * 1024) {
        return { 
            valid: false, 
            error: "File size exceeds 5MB limit" 
        };
    }

    // 检查最小文件大小 (避免空文件)
    if (file.size < 100) {
        return { 
            valid: false, 
            error: "File too small" 
        };
    }

    return { valid: true };
}

// 🔒 生成安全的文件名
async function generateSecureFileName(mimeType) {
    const timestamp = Date.now();
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const randomString = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const fileExtension = getFileExtension(mimeType);
    return `images/${timestamp}-${randomString}.${fileExtension}`;
}

// 🔒 清理文件名
function sanitizeFileName(filename) {
    if (typeof filename !== 'string') return 'unknown';
    
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')  // 只保留安全字符
        .substring(0, 100)  // 限制长度
        .trim();
}

// 🔒 上传速率限制
async function checkUploadRateLimit(request, env) {
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For') || 
                     'unknown';
    
    const key = `upload_attempts:${clientIP}`;
    const current = await env.AUTH_KV.get(key);
    
    if (current && parseInt(current) > 10) { // 每小时10次上传
        return { 
            allowed: false, 
            error: 'Too many upload attempts. Please try again later.' 
        };
    }
    
    const count = current ? parseInt(current) + 1 : 1;
    await env.AUTH_KV.put(key, count.toString(), { expirationTtl: 3600 });
    
    return { allowed: true };
}

// 🔒 生成会话指纹（与auth.js保持一致）
async function generateSessionFingerprint(request) {
    // 只使用相对稳定的User-Agent前缀，忽略版本号
    const userAgent = request.headers.get('User-Agent') || '';
    const stableUserAgent = userAgent.split('/')[0] || userAgent.substring(0, 50);
    
    const components = [
        stableUserAgent,
        request.headers.get('Accept-Language') || '',
        // 暂时移除IP检查，因为CDN可能导致IP变化
        // request.headers.get('CF-Connecting-IP') || ''
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
}

// 上传功能现在只负责将图片上传到R2存储
// 图片的索引管理由各自的系统（文章或相册）负责