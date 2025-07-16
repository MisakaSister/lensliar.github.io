// 统一 API 客户端
class ApiClient {
    constructor(apiBase) {
        this.apiBase = apiBase;
    }

    // 统一的响应处理
    async handleResponse(response) {
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return null;
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

    // 通用 GET 请求
    async get(endpoint) {
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        return await this.handleResponse(response);
    }

    // 通用 POST 请求
    async post(endpoint, data) {
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await this.handleResponse(response);
    }

    // 通用 PUT 请求
    async put(endpoint, data) {
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });
        return await this.handleResponse(response);
    }

    // 通用 DELETE 请求
    async delete(endpoint) {
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        return await this.handleResponse(response);
    }

    // 文件上传
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.apiBase}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP ${response.status}: ${error}`);
        }

        return await response.json();
    }
}

// 内容管理基类
class ContentManager extends ApiClient {
    constructor(apiBase, endpoint) {
        super(apiBase);
        this.endpoint = endpoint;
        this.items = [];
    }

    async loadAll() {
        try {
            const data = await this.get(this.endpoint);
            if (!data) return [];
            
            // 根据endpoint确定数据字段名
            if (this.endpoint === '/content') {
                this.items = data.articles || [];
            } else if (this.endpoint === '/images') {
                this.items = data.images || [];
            } else {
                this.items = data.articles || data.albums || data.images || [];
            }
            return this.items;
        } catch (error) {
            console.error(`加载${this.endpoint}失败:`, error);
            throw error;
        }
    }

    async create(itemData) {
        try {
            const data = await this.post(this.endpoint, itemData);
            if (!data) return null;
            
            if (data.success) {
                const newItem = data.article || data.album || data.images;
                if (newItem) {
                    this.items.push(newItem);
                }
                return newItem;
            }
            throw new Error(data.error || '创建失败');
        } catch (error) {
            console.error(`创建${this.endpoint}失败:`, error);
            throw error;
        }
    }

    async update(id, itemData) {
        try {
            const data = await this.put(`${this.endpoint}/${id}`, itemData);
            if (!data) return null;
            
            if (data.success) {
                const updatedItem = data.article || data.album || data.images;
                const index = this.items.findIndex(item => item.id === id);
                if (index !== -1 && updatedItem) {
                    this.items[index] = updatedItem;
                }
                return updatedItem;
            }
            throw new Error(data.error || '更新失败');
        } catch (error) {
            console.error(`更新${this.endpoint}失败:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const data = await this.delete(`${this.endpoint}/${id}`);
            if (!data) return false;
            
            if (data.success) {
                this.items = this.items.filter(item => item.id !== id);
                return true;
            }
            throw new Error(data.error || '删除失败');
        } catch (error) {
            console.error(`删除${this.endpoint}失败:`, error);
            throw error;
        }
    }

    getById(id) {
        return this.items.find(item => item.id === id);
    }

    getAll() {
        return this.items;
    }

    search(query) {
        if (!query) return this.items;
        
        const searchTerm = query.toLowerCase();
        return this.items.filter(item => 
            item.title?.toLowerCase().includes(searchTerm) ||
            item.content?.toLowerCase().includes(searchTerm) ||
            item.description?.toLowerCase().includes(searchTerm) ||
            item.category?.toLowerCase().includes(searchTerm) ||
            item.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    filterByCategory(category) {
        if (!category) return this.items;
        return this.items.filter(item => item.category === category);
    }

    getCategories() {
        const categories = new Set();
        this.items.forEach(item => {
            if (item.category) {
                categories.add(item.category);
            }
        });
        return Array.from(categories);
    }

    getStats() {
        const totalItems = this.items.length;
        const categories = this.getCategories();
        const totalCategories = categories.length;
        
        return {
            totalItems,
            totalCategories,
            categories: categories.length
        };
    }
}

// 文章管理器
class ArticleManager extends ContentManager {
    constructor(apiBase) {
        super(apiBase, '/content');
    }

    async uploadImage(file) {
        const result = await this.uploadFile(file);
        return {
            url: result.url,
            fileName: result.fileName,
            size: result.size,
            type: result.type
        };
    }
}

// 相册管理器
class AlbumManager extends ContentManager {
    constructor(apiBase) {
        super(apiBase, '/images');
    }

    async uploadImages(files) {
        const uploadPromises = Array.from(files).map(file => this.uploadFile(file));
        return await Promise.all(uploadPromises);
    }
} 