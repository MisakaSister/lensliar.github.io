// 文章管理模块
class ArticleManager {
    constructor(apiBase) {
        this.apiBase = apiBase;
        this.articles = [];
    }

    // 获取认证头
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        };
    }

    // 加载文章数据
    async loadArticles() {
        try {
            const response = await fetch(`${this.apiBase}/content`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            this.articles = result.articles || [];
            
            return this.articles;
        } catch (error) {
            throw error;
        }
    }

    // 创建文章
    async createArticle(articleData) {
        try {
            const response = await fetch(`${this.apiBase}/content`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(articleData)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            
            // 重新加载数据确保同步
            await this.loadArticles();
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 更新文章
    async updateArticle(articleId, updateData) {
        try {
            const response = await fetch(`${this.apiBase}/content/${articleId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            
            // 重新加载数据确保同步
            await this.loadArticles();
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    // 删除文章
    async deleteArticle(articleId) {
        try {
            const response = await fetch(`${this.apiBase}/content/${articleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            
            // 重新加载数据确保同步
            await this.loadArticles();
            
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

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            
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

    // 获取文章详情
    getArticleById(articleId) {
        return this.articles.find(article => article.id === articleId);
    }

    // 获取文章列表
    getArticles() {
        return this.articles;
    }

    // 搜索文章
    searchArticles(query) {
        if (!query) return this.articles;
        
        const searchTerm = query.toLowerCase();
        return this.articles.filter(article => 
            article.title.toLowerCase().includes(searchTerm) ||
            article.content.toLowerCase().includes(searchTerm) ||
            article.category.toLowerCase().includes(searchTerm) ||
            article.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    // 按分类过滤文章
    filterByCategory(category) {
        if (!category) return this.articles;
        return this.articles.filter(article => article.category === category);
    }

    // 获取所有分类
    getCategories() {
        const categories = new Set();
        this.articles.forEach(article => {
            if (article.category) {
                categories.add(article.category);
            }
        });
        return Array.from(categories);
    }

    // 获取统计信息
    getStats() {
        const totalArticles = this.articles.length;
        const categories = this.getCategories();
        
        return {
            totalArticles,
            totalCategories: categories.length,
            categories
        };
    }
}

// 导出给全局使用
window.ArticleManager = ArticleManager; 