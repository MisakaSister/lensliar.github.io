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
            console.log('🔄 开始加载文章数据...');
            
            const response = await fetch(`${this.apiBase}/content`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            console.log('📥 文章API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 加载文章失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 文章数据加载成功:', result);
            
            this.articles = result.articles || [];
            console.log(`📊 共加载 ${this.articles.length} 篇文章`);
            
            return this.articles;
        } catch (error) {
            console.error('❌ 加载文章异常:', error);
            throw error;
        }
    }

    // 创建文章
    async createArticle(articleData) {
        try {
            console.log('🔄 开始创建文章...');
            console.log('📤 发送数据:', JSON.stringify(articleData, null, 2));
            
            const response = await fetch(`${this.apiBase}/content`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(articleData)
            });

            console.log('📥 创建文章API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 创建文章失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 文章创建成功:', result);
            
            // 重新加载数据确保同步
            await this.loadArticles();
            
            return result;
        } catch (error) {
            console.error('❌ 创建文章异常:', error);
            throw error;
        }
    }

    // 更新文章
    async updateArticle(articleId, updateData) {
        try {
            console.log('🔄 开始更新文章:', articleId);
            console.log('📤 更新数据:', JSON.stringify(updateData, null, 2));
            
            const response = await fetch(`${this.apiBase}/content/${articleId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(updateData)
            });

            console.log('📥 更新文章API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 更新文章失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 文章更新成功:', result);
            
            // 重新加载数据确保同步
            await this.loadArticles();
            
            return result;
        } catch (error) {
            console.error('❌ 更新文章异常:', error);
            throw error;
        }
    }

    // 删除文章
    async deleteArticle(articleId) {
        try {
            console.log('🔄 开始删除文章:', articleId);
            
            const response = await fetch(`${this.apiBase}/content/${articleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            console.log('📥 删除文章API响应状态:', response.status);

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ 删除文章失败:', error);
                throw new Error(`HTTP ${response.status}: ${error}`);
            }

            const result = await response.json();
            console.log('✅ 文章删除成功:', result);
            
            // 重新加载数据确保同步
            await this.loadArticles();
            
            return result;
        } catch (error) {
            console.error('❌ 删除文章异常:', error);
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