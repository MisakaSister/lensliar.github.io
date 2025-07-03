// worker/src/images.js - 相册管理模块
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
            return await saveImageAlbum(request, env);
        }

        if (pathname.startsWith('/images/') && method === 'DELETE') {
            const imageId = pathname.split('/')[2];
            return await deleteImageAlbum(imageId, env);
        }

        if (pathname.startsWith('/images/') && method === 'PUT') {
            const imageId = pathname.split('/')[2];
            return await updateImageAlbum(imageId, request, env);
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

// 获取相册图片列表
async function getImages(request, env) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const search = url.searchParams.get('search') || '';
        const category = url.searchParams.get('category') || '';

        // 获取所有图片KV键
        const listResult = await env.IMAGES_KV.list({
            prefix: 'album_'
        });

        console.log('Found album keys:', listResult.keys.map(k => k.name));

        const images = [];
        
        // 批量获取图片数据
        for (const key of listResult.keys) {
            try {
                const imageData = await env.IMAGES_KV.get(key.name, 'json');
                if (imageData) {
                    images.push(imageData);
                    console.log(`Loaded album ${key.name}:`, imageData.title);
                } else {
                    console.log(`No data found for key ${key.name}`);
                }
            } catch (error) {
                console.error(`Failed to get image ${key.name}:`, error);
            }
        }

        // 按创建时间排序（最新的在前）
        images.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let filteredImages = images;

        // 分类过滤
        if (category) {
            filteredImages = filteredImages.filter(image => 
                image.category === category
            );
        }

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

        // 获取所有分类
        const categories = [...new Set(images.map(img => img.category).filter(Boolean))];

        return new Response(JSON.stringify({
            success: true,
            images: paginatedImages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            categories: categories,
            totalImages: images.length
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

// 保存相册图片（支持单图和多图）
async function saveImageAlbum(request, env) {
    try {
        const albumData = await request.json();
        
        // 验证必需字段
        if (!albumData.images || !Array.isArray(albumData.images) || albumData.images.length === 0) {
            return new Response(JSON.stringify({
                error: 'Missing required field: images array'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 生成相册ID
        const albumId = generateAlbumId();
        const currentTime = new Date().toISOString();
        
        // 构造相册对象
        const album = {
            id: albumId,
            title: albumData.title || '未命名相册',
            description: albumData.description || '',
            category: albumData.category || '默认分类',
            tags: albumData.tags || [],
            images: albumData.images.map(img => ({
                url: img.url,
                fileName: img.fileName,
                title: img.title || img.fileName,
                size: img.size || 0,
                type: img.type || 'image/jpeg'
            })),
            imageCount: albumData.images.length,
            coverImage: albumData.images[0], // 第一张图片作为封面
            uploadedBy: albumData.uploadedBy || 'unknown',
            createdAt: currentTime,
            updatedAt: currentTime
        };

        // 保存到IMAGES_KV
        console.log('Saving album to IMAGES_KV:', {
            key: `album_${albumId}`,
            album: album
        });
        
        await env.IMAGES_KV.put(`album_${albumId}`, JSON.stringify(album));
        
        // 验证保存是否成功
        const savedAlbum = await env.IMAGES_KV.get(`album_${albumId}`, 'json');
        console.log('Album saved successfully:', savedAlbum ? 'YES' : 'NO');

        return new Response(JSON.stringify({
            success: true,
            album: album
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Save image album error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to save image album'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 删除相册
async function deleteImageAlbum(albumId, env) {
    try {
        // 获取相册数据
        const album = await env.IMAGES_KV.get(`album_${albumId}`, 'json');
        if (!album) {
            return new Response(JSON.stringify({
                error: 'Album not found'
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 检查图片是否被文章使用
        const imageUsageCheck = await checkImageUsageInArticles(album.images, env);
        
        // 只删除没有被文章使用的图片
        const deletePromises = album.images.map(async (image) => {
            const isUsedInArticles = imageUsageCheck.some(usage => 
                usage.fileName === image.fileName && usage.isUsed
            );
            
            if (!isUsedInArticles) {
                try {
                    await env.IMAGES_BUCKET.delete(image.fileName);
                    console.log(`Deleted ${image.fileName} from R2`);
                } catch (r2Error) {
                    console.error(`Failed to delete ${image.fileName} from R2:`, r2Error);
                }
            } else {
                console.log(`Skipped deleting ${image.fileName} - used in articles`);
            }
        });

        await Promise.allSettled(deletePromises);

        // 从IMAGES_KV删除相册记录
        await env.IMAGES_KV.delete(`album_${albumId}`);

        const usedImagesCount = imageUsageCheck.filter(usage => usage.isUsed).length;
        const deletedImagesCount = album.imageCount - usedImagesCount;

        return new Response(JSON.stringify({
            success: true,
            message: `Album deleted successfully. ${deletedImagesCount} images deleted from R2, ${usedImagesCount} images preserved (used in articles)`
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Delete album error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete album'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 检查图片是否被文章使用
async function checkImageUsageInArticles(images, env) {
    try {
        // 获取所有文章的键
        const articleKeys = await env.CONTENT_KV.list({
            prefix: 'article:'
        });

        const imageUsage = images.map(img => ({
            fileName: img.fileName,
            url: img.url,
            isUsed: false
        }));

        // 检查每篇文章
        for (const key of articleKeys.keys) {
            try {
                const article = await env.CONTENT_KV.get(key.name, 'json');
                if (article) {
                    // 检查封面图片
                    if (article.coverImage) {
                        const coverImageUsage = imageUsage.find(usage => 
                            usage.url === article.coverImage.url || 
                            usage.fileName === article.coverImage.fileName
                        );
                        if (coverImageUsage) {
                            coverImageUsage.isUsed = true;
                        }
                    }

                    // 检查文章中的图片
                    if (article.images && Array.isArray(article.images)) {
                        article.images.forEach(articleImg => {
                            const imageUsageItem = imageUsage.find(usage => 
                                usage.url === articleImg.url || 
                                usage.fileName === articleImg.fileName
                            );
                            if (imageUsageItem) {
                                imageUsageItem.isUsed = true;
                            }
                        });
                    }
                }
            } catch (error) {
                console.error(`Failed to check article ${key.name}:`, error);
            }
        }

        return imageUsage;
    } catch (error) {
        console.error('Failed to check image usage:', error);
        // 如果检查失败，为了安全起见，假设所有图片都被使用
        return images.map(img => ({
            fileName: img.fileName,
            url: img.url,
            isUsed: true
        }));
    }
}

// 更新相册
async function updateImageAlbum(albumId, request, env) {
    try {
        const updateData = await request.json();
        
        // 获取现有相册数据
        const existingAlbum = await env.IMAGES_KV.get(`album_${albumId}`, 'json');
        if (!existingAlbum) {
            return new Response(JSON.stringify({
                error: 'Album not found'
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 更新相册数据
        const updatedAlbum = {
            ...existingAlbum,
            title: updateData.title || existingAlbum.title,
            description: updateData.description || existingAlbum.description,
            category: updateData.category || existingAlbum.category,
            tags: updateData.tags || existingAlbum.tags,
            updatedAt: new Date().toISOString()
        };

        // 保存更新后的相册
        await env.IMAGES_KV.put(`album_${albumId}`, JSON.stringify(updatedAlbum));

        return new Response(JSON.stringify({
            success: true,
            album: updatedAlbum
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Update album error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to update album'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// 从R2同步图片到相册
async function syncImagesFromR2(request, env) {
    try {
        // 列出R2中的所有图片
        const r2Objects = await env.IMAGES_BUCKET.list({
            prefix: 'images/',
            include: ['customMetadata', 'httpMetadata']
        });

        if (r2Objects.objects.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No images found in R2',
                total: 0
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // 获取现有相册列表，避免重复同步
        const existingAlbums = await env.IMAGES_KV.list({
            prefix: 'album_'
        });
        
        const existingImageUrls = new Set();
        for (const key of existingAlbums.keys) {
            try {
                const album = await env.IMAGES_KV.get(key.name, 'json');
                if (album && album.images) {
                    album.images.forEach(img => {
                        existingImageUrls.add(img.url);
                    });
                }
            } catch (error) {
                console.error(`Failed to check existing album ${key.name}:`, error);
            }
        }

        // 为每个R2图片创建单独的相册
        let syncedCount = 0;
        for (const obj of r2Objects.objects) {
            const imageUrl = `https://images.wengguodong.com/${obj.key}`;
            
            // 跳过已存在的图片
            if (existingImageUrls.has(imageUrl)) {
                continue;
            }

            const albumId = generateAlbumId();
            const imageName = obj.customMetadata?.originalName || obj.key.split('/').pop();
            
            const album = {
                id: albumId,
                title: imageName,
                description: '从R2同步的图片',
                category: '同步相册',
                tags: ['R2同步'],
                images: [{
                    url: imageUrl,
                    fileName: obj.key,
                    title: imageName,
                    alt: imageName,
                    caption: '',
                    width: null,
                    height: null,
                    size: obj.size,
                    type: obj.httpMetadata?.contentType || 'image/jpeg'
                }],
                imageCount: 1,
                coverImage: {
                    url: imageUrl,
                    fileName: obj.key,
                    title: imageName,
                    alt: imageName,
                    caption: '',
                    size: obj.size,
                    type: obj.httpMetadata?.contentType || 'image/jpeg'
                },
                uploadedBy: 'R2同步',
                createdAt: obj.customMetadata?.uploadedAt || obj.uploaded.toISOString(),
                updatedAt: new Date().toISOString()
            };

            // 保存相册
            await env.IMAGES_KV.put(`album_${albumId}`, JSON.stringify(album));
            syncedCount++;
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Synced ${syncedCount} new images from R2 (${r2Objects.objects.length} total found)`,
            synced: syncedCount,
            total: r2Objects.objects.length
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

// 生成相册ID
function generateAlbumId() {
    return 'album_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
} 