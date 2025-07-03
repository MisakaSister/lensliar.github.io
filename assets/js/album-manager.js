// 相册管理模块
class AlbumManager {
    constructor(apiBase) {
        this.apiBase = apiBase;
        this.albums = [];
        this.selectedFiles = [];
    }

    // 获取认证头
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        };
    }

    // 加载相册数据
    async loadAlbums() {
        try {
            console.log('🔄 开始加载相册数据...');
            
            const response = await fetch(`${this.apiBase}/images`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            console.log('📥 相册API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 加载相册失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 相册数据加载成功:', result);
            
            this.albums = result.images || [];
            console.log(`📊 共加载 ${this.albums.length} 个相册`);
            
            return this.albums;
        } catch (error) {
            console.error('❌ 加载相册异常:', error);
            throw error;
        }
    }

    // 创建相册
    async createAlbum(albumData) {
        try {
            console.log('🔄 开始创建相册...');
            console.log('📤 发送数据:', JSON.stringify(albumData, null, 2));
            
            const response = await fetch(`${this.apiBase}/images`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(albumData)
            });

            console.log('📥 创建相册API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 创建相册失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 相册创建成功:', result);
            
            // 重新加载数据确保同步
            await this.loadAlbums();
            
            return result;
        } catch (error) {
            console.error('❌ 创建相册异常:', error);
            throw error;
        }
    }

    // 更新相册
    async updateAlbum(albumId, updateData) {
        try {
            console.log('🔄 开始更新相册:', albumId);
            console.log('📤 更新数据:', JSON.stringify(updateData, null, 2));
            
            const response = await fetch(`${this.apiBase}/images/${albumId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(updateData)
            });

            console.log('📥 更新相册API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 更新相册失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 相册更新成功:', result);
            
            // 重新加载数据确保同步
            await this.loadAlbums();
            
            return result;
        } catch (error) {
            console.error('❌ 更新相册异常:', error);
            throw error;
        }
    }

    // 删除相册
    async deleteAlbum(albumId) {
        try {
            console.log('🔄 开始删除相册:', albumId);
            
            const response = await fetch(`${this.apiBase}/images/${albumId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            console.log('📥 删除相册API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 删除相册失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 相册删除成功:', result);
            
            // 重新加载数据确保同步
            await this.loadAlbums();
            
            return result;
        } catch (error) {
            console.error('❌ 删除相册异常:', error);
            throw error;
        }
    }

    // 上传图片文件
    async uploadImage(file) {
        try {
            console.log('🔄 开始上传图片:', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            });
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.apiBase}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            console.log('📥 上传图片API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 上传图片失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 图片上传成功:', result);
            
            return {
                url: result.url,
                fileName: result.fileName,
                size: result.size,
                type: result.type
            };
        } catch (error) {
            console.error('❌ 上传图片异常:', error);
            throw error;
        }
    }

    // 批量上传图片并创建相册
    async uploadAndCreateAlbum(files, albumInfo) {
        try {
            console.log('🔄 开始批量上传并创建相册...');
            console.log('📁 文件数量:', files.length);
            console.log('📋 相册信息:', albumInfo);
            
            const uploadedImages = [];
            
            // 逐个上传图片
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const uploadResult = await this.uploadImage(file);
                    uploadedImages.push({
                        url: uploadResult.url,
                        fileName: uploadResult.fileName,
                        title: file.name.replace(/\.[^/.]+$/, ''),
                        alt: file.name.replace(/\.[^/.]+$/, ''),
                        caption: '',
                        size: uploadResult.size,
                        type: uploadResult.type
                    });
                    console.log(`✅ 图片 ${i + 1}/${files.length} 上传成功`);
                } catch (error) {
                    console.error(`❌ 图片 ${i + 1}/${files.length} 上传失败:`, error);
                    throw error;
                }
            }
            
            // 创建相册
            const albumData = {
                title: albumInfo.title || '未命名相册',
                description: albumInfo.description || '',
                category: albumInfo.category || '默认分类',
                tags: albumInfo.tags || [],
                images: uploadedImages
            };
            
            const result = await this.createAlbum(albumData);
            console.log('🎉 相册创建完成!');
            
            return result;
        } catch (error) {
            console.error('❌ 批量上传并创建相册失败:', error);
            throw error;
        }
    }

    // 获取相册详情
    getAlbumById(albumId) {
        return this.albums.find(album => album.id === albumId);
    }

    // 获取相册列表
    getAlbums() {
        return this.albums;
    }

    // 搜索相册
    searchAlbums(query) {
        if (!query) return this.albums;
        
        const searchTerm = query.toLowerCase();
        return this.albums.filter(album => 
            album.title.toLowerCase().includes(searchTerm) ||
            album.description.toLowerCase().includes(searchTerm) ||
            album.category.toLowerCase().includes(searchTerm) ||
            album.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    // 按分类过滤相册
    filterByCategory(category) {
        if (!category) return this.albums;
        return this.albums.filter(album => album.category === category);
    }

    // 获取所有分类
    getCategories() {
        const categories = new Set();
        this.albums.forEach(album => {
            if (album.category) {
                categories.add(album.category);
            }
        });
        return Array.from(categories);
    }

    // 获取统计信息
    getStats() {
        const totalAlbums = this.albums.length;
        const totalImages = this.albums.reduce((sum, album) => sum + (album.imageCount || 0), 0);
        const categories = this.getCategories();
        
        return {
            totalAlbums,
            totalImages,
            totalCategories: categories.length,
            categories
        };
    }
}

// 导出给全局使用
window.AlbumManager = AlbumManager; 