// worker/src/images.js - 图片管理模块
import { verifyAuth } from './content.js';

export async function handleImages(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // 验证认证
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

        // 路由处理
        if (pathname === '/images' && method === 'GET') {
            return await getImages(request, env);
        }
        
        if (pathname === '/images' && method === 'POST') {
            return await saveImageMetadata(request, env);
        }

        if (pathname.startsWith('/images/') && method === 'DELETE') {
            const imageId = pathname.split('/')[2];
            return await deleteImage(imageId, env);
        }

        if (pathname === '/images/sync' && method === 'POST') {
            return await syncImagesFromR2(request, env);
        }

        return new Response(JSON.stringify({
            error: 'Not Found'
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Images API error:', error);
        return new Response(JSON.stringify({
            error: 'Internal Server Error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 获取图片列表
async function getImages(request, env) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const search = url.searchParams.get('search') || '';

        // 从KV存储获取图片索引
        const imagesIndex = await env.CONTENT_KV.get('images_index', 'json') || {
            images: [],
            total: 0,
            lastSync: null
        };

        let filteredImages = imagesIndex.images;

        // 搜索过滤
        if (search) {
            const searchLower = search.toLowerCase();
            filteredImages = filteredImages.filter(image => 
                image.title?.toLowerCase().includes(searchLower) ||
                image.description?.toLowerCase().includes(searchLower) ||
                image.category?.toLowerCase().includes(searchLower) ||
                image.tags?.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        // 分页
        const total = filteredImages.length;
        const offset = (page - 1) * limit;
        const paginatedImages = filteredImages.slice(offset, offset + limit);

        return new Response(JSON.stringify({
            success: true,
            images: paginatedImages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            lastSync: imagesIndex.lastSync
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Get images error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to get images'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 保存图片元数据
async function saveImageMetadata(request, env) {
    try {
        const imageData = await request.json();
        
        // 验证必需字段
        if (!imageData.url || !imageData.fileName) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: url, fileName'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 生成图片ID
        const imageId = generateImageId();
        
        // 构造图片对象
        const image = {
            id: imageId,
            url: imageData.url,
            fileName: imageData.fileName,
            title: imageData.title || imageData.fileName,
            description: imageData.description || '',
            category: imageData.category || '',
            tags: imageData.tags || [],
            size: imageData.size || 0,
            type: imageData.type || 'image/jpeg',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 获取现有图片索引
        const imagesIndex = await env.CONTENT_KV.get('images_index', 'json') || {
            images: [],
            total: 0,
            lastSync: null
        };

        // 检查是否已存在相同URL的图片
        const existingIndex = imagesIndex.images.findIndex(img => img.url === image.url);
        if (existingIndex !== -1) {
            // 更新现有图片
            imagesIndex.images[existingIndex] = { ...imagesIndex.images[existingIndex], ...image };
        } else {
            // 添加新图片
            imagesIndex.images.unshift(image);
        }

        imagesIndex.total = imagesIndex.images.length;
        imagesIndex.lastSync = new Date().toISOString();

        // 保存更新后的索引
        await env.CONTENT_KV.put('images_index', JSON.stringify(imagesIndex));

        return new Response(JSON.stringify({
            success: true,
            image: image
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Save image metadata error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to save image metadata'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 删除图片
async function deleteImage(imageId, env) {
    try {
        // 获取图片索引
        const imagesIndex = await env.CONTENT_KV.get('images_index', 'json') || {
            images: [],
            total: 0,
            lastSync: null
        };

        // 找到要删除的图片
        const imageIndex = imagesIndex.images.findIndex(img => img.id === imageId);
        if (imageIndex === -1) {
            return new Response(JSON.stringify({
                error: 'Image not found'
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const image = imagesIndex.images[imageIndex];

        // 从R2删除图片文件
        try {
            await env.IMAGES_BUCKET.delete(image.fileName);
        } catch (r2Error) {
            console.error('Failed to delete from R2:', r2Error);
            // 继续删除元数据，即使R2删除失败
        }

        // 从索引中删除
        imagesIndex.images.splice(imageIndex, 1);
        imagesIndex.total = imagesIndex.images.length;
        imagesIndex.lastSync = new Date().toISOString();

        // 保存更新后的索引
        await env.CONTENT_KV.put('images_index', JSON.stringify(imagesIndex));

        return new Response(JSON.stringify({
            success: true,
            message: 'Image deleted successfully'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Delete image error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete image'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 从R2同步图片列表
async function syncImagesFromR2(request, env) {
    try {
        // 列出R2中的所有图片
        const r2Objects = await env.IMAGES_BUCKET.list({
            prefix: 'images/',
            include: ['customMetadata', 'httpMetadata']
        });

        const images = [];
        for (const obj of r2Objects.objects) {
            const image = {
                id: generateImageId(),
                url: `https://images.wengguodong.com/${obj.key}`,
                fileName: obj.key,
                title: obj.customMetadata?.originalName || obj.key.split('/').pop(),
                description: '',
                category: '',
                tags: [],
                size: obj.size,
                type: obj.httpMetadata?.contentType || 'image/jpeg',
                createdAt: obj.customMetadata?.uploadedAt || obj.uploaded.toISOString(),
                updatedAt: obj.uploaded.toISOString()
            };
            images.push(image);
        }

        // 按创建时间排序（最新的在前）
        images.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 保存图片索引
        const imagesIndex = {
            images: images,
            total: images.length,
            lastSync: new Date().toISOString()
        };

        await env.CONTENT_KV.put('images_index', JSON.stringify(imagesIndex));

        return new Response(JSON.stringify({
            success: true,
            message: `Synced ${images.length} images from R2`,
            total: images.length
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Sync images error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to sync images from R2'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 生成图片ID
function generateImageId() {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
} 