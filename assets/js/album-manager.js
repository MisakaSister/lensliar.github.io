// 相册管理模块
class AlbumManager {
    constructor(apiBase) {
        this.apiBase = apiBase;
        this.albums = [];
        this.selectedFiles = [];
    }

    // 统一的响应处理
    async handleResponse(response) {
        if (!response.ok) {
            // 如果是401错误，说明token无效，跳转到登录页面
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return;
            }
            
            const error = await response.text();
            throw new Error(`请求失败: ${error}`);
        }
        
        return await response.json();
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
            const response = await fetch(`${this.apiBase}/images`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const result = await this.handleResponse(response);
            
            // 确保result.images是数组
            this.albums = Array.isArray(result.images) ? result.images : [];
            
            return this.albums;
        } catch (error) {
            throw error;
        }
    }

    // 创建相册
    async createAlbum(albumData) {
        try {
            const response = await fetch(`${this.apiBase}/images`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(albumData)
            });

            const result = await this.handleResponse(response);
            
            // 重新加载数据确保同步
            await this.loadAlbums();
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 更新相册
    async updateAlbum(albumId, updateData) {
        try {
            const response = await fetch(`${this.apiBase}/images/${albumId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(updateData)
            });

            const result = await this.handleResponse(response);
            
            // 重新加载数据确保同步
            await this.loadAlbums();
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 删除相册
    async deleteAlbum(albumId) {
        try {
            const response = await fetch(`${this.apiBase}/images/${albumId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            const result = await this.handleResponse(response);
            
            // 重新加载数据确保同步
            await this.loadAlbums();
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 上传图片文件
    async uploadImage(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.apiBase}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            const result = await this.handleResponse(response);
            
            return {
                url: result.url,
                fileName: result.fileName,
                size: result.size,
                type: result.type
            };
        } catch (error) {
            throw error;
        }
    }

    // 批量上传图片并创建相册
    async uploadAndCreateAlbum(files, albumInfo) {
        try {
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
                } catch (error) {
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
            
            return result;
        } catch (error) {
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
        if (!query) {
            return this.albums;
        }
        
        const searchTerm = query.toLowerCase();
        const filtered = this.albums.filter(album => 
            (album.title || '').toLowerCase().includes(searchTerm) ||
            (album.description || '').toLowerCase().includes(searchTerm) ||
            (album.category || '').toLowerCase().includes(searchTerm) ||
            (album.tags || []).some(tag => (tag || '').toLowerCase().includes(searchTerm))
        );
        
        return filtered;
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