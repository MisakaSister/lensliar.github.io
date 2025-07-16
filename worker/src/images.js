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
        if (pathname === '/images/categories' && method === 'GET') {
            return await getAlbumCategories(env);
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

        return new Response(JSON.stringify({
            error: 'Not Found'
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Images handler error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error'
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
        console.log('[相册] 开始获取相册列表');
        
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const search = url.searchParams.get('search') || '';
        const category = url.searchParams.get('category') || '';

        console.log(`[相册] 查询参数: page=${page}, limit=${limit}, search=${search}, category=${category}`);

        let query = 'SELECT * FROM albums';
        let params = [];
        let conditions = [];

        // 搜索过滤
        if (search) {
            conditions.push('(title LIKE ? OR description LIKE ? OR category LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // 分类过滤
        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        // 分页
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        console.log(`[相册] 执行查询: ${query}`);
        console.log(`[相册] 查询参数:`, params);

        const { results } = await env.d1_sql.prepare(query).bind(...params).all();
        console.log(`[相册] 查询结果数量: ${results?.length || 0}`);
        
        // 获取总数
        let countQuery = 'SELECT COUNT(*) as total FROM albums';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const { results: countResults } = await env.d1_sql.prepare(countQuery).bind(...params.slice(0, -2)).all();
        const total = countResults[0]?.total || 0;
        console.log(`[相册] 总数: ${total}`);

        // 获取所有分类
        const { results: categories } = await env.d1_sql.prepare(`
            SELECT DISTINCT category FROM albums WHERE category IS NOT NULL AND category != ''
        `).all();
        console.log(`[相册] 分类数量: ${categories?.length || 0}`);

        // 格式化返回数据
        const albums = (results || []).map(album => ({
            id: album.id,
            title: album.title,
            description: album.description,
            category: album.category,
            tags: JSON.parse(album.tags || '[]'),
            images: JSON.parse(album.images || '[]'),
            imageCount: album.image_count,
            coverImage: JSON.parse(album.cover_image || 'null'),
            uploadedBy: album.uploaded_by,
            createdAt: album.created_at,
            updatedAt: album.updated_at
        }));

        console.log(`[相册] 格式化后相册数量: ${albums.length}`);

        return new Response(JSON.stringify({
            success: true,
            images: albums,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            categories: categories?.map(c => c.category) || [],
            totalImages: total
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('[相册] 获取相册列表时出错:', error);
        console.error('[相册] 错误堆栈:', error.stack);
        return new Response(JSON.stringify({
            error: 'Failed to get images',
            details: error.message
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
                alt: img.alt || img.title || img.fileName,
                caption: img.caption || '',
                width: img.width || null,
                height: img.height || null,
                size: img.size || 0,
                type: img.type || 'image/jpeg'
            })),
            imageCount: albumData.images.length,
            coverImage: {
                url: albumData.images[0].url,
                fileName: albumData.images[0].fileName,
                title: albumData.images[0].title || albumData.images[0].fileName,
                alt: albumData.images[0].alt || albumData.images[0].title || albumData.images[0].fileName,
                caption: albumData.images[0].caption || '',
                size: albumData.images[0].size || 0,
                type: albumData.images[0].type || 'image/jpeg'
            },
            uploadedBy: albumData.uploadedBy || 'admin',
            createdAt: currentTime,
            updatedAt: currentTime
        };

        // 保存到D1数据库
        const { success } = await env.d1_sql.prepare(`
            INSERT INTO albums (
                id, title, description, category, tags, images, image_count, 
                cover_image, uploaded_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            album.id,
            album.title,
            album.description,
            album.category,
            JSON.stringify(album.tags),
            JSON.stringify(album.images),
            album.imageCount,
            JSON.stringify(album.coverImage),
            album.uploadedBy,
            album.createdAt,
            album.updatedAt
        ).run();

        if (!success) {
            throw new Error('Failed to save album to database');
        }

        return new Response(JSON.stringify({
            success: true,
            album: album,
            images: [album] // 为了兼容性，也返回images字段
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Error saving album:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        return new Response(JSON.stringify({
            error: 'Failed to save image album',
            details: error.message
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
        const { results } = await env.d1_sql.prepare(`
            SELECT * FROM albums WHERE id = ?
        `).bind(albumId).all();
        
        if (!results || results.length === 0) {
            return new Response(JSON.stringify({
                error: 'Album not found'
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const album = results[0];
        const images = JSON.parse(album.images || '[]');

        // 检查图片是否被文章使用
        const imageUsageCheck = await checkImageUsageInArticles(images, env);
        
        // 只删除没有被文章使用的图片
        const deletePromises = images.map(async (image) => {
            const isUsedInArticles = imageUsageCheck.some(usage => 
                usage.fileName === image.fileName && usage.isUsed
            );
            
            if (!isUsedInArticles) {
                try {
                    await env.IMAGES_BUCKET.delete(image.fileName);
                } catch (r2Error) {
                    // Silently handle R2 deletion errors
                }
            }
        });

        await Promise.allSettled(deletePromises);

        // 从数据库删除相册记录
        const { success } = await env.d1_sql.prepare(`
            DELETE FROM albums WHERE id = ?
        `).bind(albumId).run();

        if (!success) {
            throw new Error('Failed to delete album from database');
        }

        const usedImagesCount = imageUsageCheck.filter(usage => usage.isUsed).length;
        const deletedImagesCount = album.image_count - usedImagesCount;

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
        console.error('Error deleting album:', error);
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
        // 获取所有文章
        const { results: articles } = await env.d1_sql.prepare(`
            SELECT cover_image, images FROM articles
        `).all();

        const imageUsage = images.map(img => ({
            fileName: img.fileName,
            url: img.url,
            isUsed: false
        }));

        // 检查每篇文章
        for (const article of articles || []) {
            try {
                // 检查封面图片
                if (article.cover_image) {
                    const coverImage = JSON.parse(article.cover_image);
                    if (coverImage) {
                        const coverImageUsage = imageUsage.find(usage => 
                            usage.url === coverImage.url || 
                            usage.fileName === coverImage.fileName
                        );
                        if (coverImageUsage) {
                            coverImageUsage.isUsed = true;
                        }
                    }
                }

                // 检查文章中的图片
                if (article.images) {
                    const articleImages = JSON.parse(article.images);
                    if (Array.isArray(articleImages)) {
                        articleImages.forEach(articleImg => {
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
                // Silently skip failed articles
            }
        }

        return imageUsage;
    } catch (error) {
        console.error('Error checking image usage:', error);
        return images.map(img => ({
            fileName: img.fileName,
            url: img.url,
            isUsed: false
        }));
    }
}

// 更新相册
async function updateImageAlbum(albumId, request, env) {
    try {
        const updateData = await request.json();
        
        // 获取现有相册数据
        const { results } = await env.d1_sql.prepare(`
            SELECT * FROM albums WHERE id = ?
        `).bind(albumId).all();
        
        if (!results || results.length === 0) {
            return new Response(JSON.stringify({
                error: 'Album not found'
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const existingAlbum = results[0];
        const currentTime = new Date().toISOString();

        // 更新相册数据
        const { success } = await env.d1_sql.prepare(`
            UPDATE albums SET 
                title = ?, description = ?, category = ?, tags = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            updateData.title || existingAlbum.title,
            updateData.description || existingAlbum.description,
            updateData.category || existingAlbum.category,
            JSON.stringify(updateData.tags || JSON.parse(existingAlbum.tags || '[]')),
            currentTime,
            albumId
        ).run();

        if (!success) {
            throw new Error('Failed to update album in database');
        }

        const updatedAlbum = {
            ...existingAlbum,
            title: updateData.title || existingAlbum.title,
            description: updateData.description || existingAlbum.description,
            category: updateData.category || existingAlbum.category,
            tags: updateData.tags || JSON.parse(existingAlbum.tags || '[]'),
            updatedAt: currentTime
        };

        return new Response(JSON.stringify({
            success: true,
            album: updatedAlbum,
            images: [updatedAlbum] // 为了兼容性，也返回images字段
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Error updating album:', error);
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

// 获取所有相册分类
async function getAlbumCategories(env) {
    try {
        const { results } = await env.d1_sql.prepare(`
            SELECT id, name, description, color, sort_order FROM album_categories ORDER BY sort_order ASC, created_at ASC
        `).all();
        return new Response(JSON.stringify({
            categories: results || []
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('[分类] 获取相册分类出错:', error);
        return new Response(JSON.stringify({
            error: 'Failed to get album categories',
            details: error.message
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
    return `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 