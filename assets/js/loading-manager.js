// 加载管理器 - loading-manager.js
// 统一管理页面加载状态、骨架屏和用户反馈

class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.progressBar = null;
        this.currentProgress = 0;
        this.init();
    }

    init() {
        this.createProgressBar();
        this.setupIntersectionObserver();
    }

    // 创建顶部进度条
    createProgressBar() {
        if (document.querySelector('.loading-progress')) return;

        const progressContainer = document.createElement('div');
        progressContainer.className = 'loading-progress';
        progressContainer.innerHTML = `
            <div class="loading-progress-bar" id="loading-progress-bar"></div>
        `;
        
        document.body.appendChild(progressContainer);
        this.progressBar = document.getElementById('loading-progress-bar');
    }

    // 显示进度条
    showProgress(progress = 0) {
        const progressContainer = document.querySelector('.loading-progress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
            this.updateProgress(progress);
        }
    }

    // 更新进度
    updateProgress(progress) {
        this.currentProgress = Math.min(Math.max(progress, 0), 100);
        if (this.progressBar) {
            this.progressBar.style.width = `${this.currentProgress}%`;
        }
    }

    // 隐藏进度条
    hideProgress() {
        const progressContainer = document.querySelector('.loading-progress');
        if (progressContainer) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
                this.currentProgress = 0;
                if (this.progressBar) {
                    this.progressBar.style.width = '0%';
                }
            }, 300);
        }
    }

    // 创建文章骨架屏
    createArticleSkeleton(count = 6) {
        const skeletons = [];
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-article-card';
            skeleton.style.animationDelay = `${i * 0.1}s`;
            skeleton.innerHTML = `
                <div class="skeleton-article-image skeleton"></div>
                <div class="skeleton-article-content">
                    <div class="skeleton-article-title skeleton"></div>
                    <div class="skeleton-article-excerpt skeleton"></div>
                    <div class="skeleton-article-excerpt skeleton"></div>
                    <div class="skeleton-article-excerpt skeleton"></div>
                    <div class="skeleton-article-meta">
                        <div class="skeleton-meta-item skeleton"></div>
                        <div class="skeleton-meta-item skeleton"></div>
                    </div>
                    <div class="skeleton-article-actions">
                        <div class="skeleton-btn skeleton"></div>
                        <div class="skeleton-btn-icon skeleton"></div>
                    </div>
                </div>
            `;
            skeletons.push(skeleton);
        }
        return skeletons;
    }

    // 创建相册骨架屏
    createAlbumSkeleton(count = 6) {
        const skeletons = [];
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-album-card';
            skeleton.style.animationDelay = `${i * 0.1}s`;
            skeleton.innerHTML = `
                <div class="skeleton-album-image skeleton"></div>
                <div class="skeleton-album-content">
                    <div class="skeleton-album-title skeleton"></div>
                    <div class="skeleton-album-description skeleton"></div>
                    <div class="skeleton-album-description skeleton"></div>
                    <div class="skeleton-album-meta">
                        <div class="skeleton-album-meta-item skeleton"></div>
                        <div class="skeleton-album-meta-item skeleton"></div>
                    </div>
                </div>
            `;
            skeletons.push(skeleton);
        }
        return skeletons;
    }

    // 创建统计数据骨架屏
    createStatsSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-stats';
        skeleton.innerHTML = `
            <div class="skeleton-stat-item">
                <div class="skeleton-stat-icon skeleton"></div>
                <div class="skeleton-stat-details">
                    <div class="skeleton-stat-number skeleton"></div>
                    <div class="skeleton-stat-label skeleton"></div>
                </div>
            </div>
            <div class="skeleton-stat-item">
                <div class="skeleton-stat-icon skeleton"></div>
                <div class="skeleton-stat-details">
                    <div class="skeleton-stat-number skeleton"></div>
                    <div class="skeleton-stat-label skeleton"></div>
                </div>
            </div>
            <div class="skeleton-stat-item">
                <div class="skeleton-stat-icon skeleton"></div>
                <div class="skeleton-stat-details">
                    <div class="skeleton-stat-number skeleton"></div>
                    <div class="skeleton-stat-label skeleton"></div>
                </div>
            </div>
        `;
        return skeleton;
    }

    // 显示内容骨架屏
    showContentSkeleton(container, type = 'article', count = 6) {
        if (!container) return;

        // 清空容器
        container.innerHTML = '';
        
        let skeletons;
        switch (type) {
            case 'article':
                skeletons = this.createArticleSkeleton(count);
                break;
            case 'album':
                skeletons = this.createAlbumSkeleton(count);
                break;
            case 'stats':
                skeletons = [this.createStatsSkeleton()];
                break;
            default:
                skeletons = this.createArticleSkeleton(count);
        }

        // 添加骨架屏到容器
        skeletons.forEach(skeleton => {
            container.appendChild(skeleton);
        });

        // 标记容器为骨架屏状态
        container.classList.add('skeleton-loading');
    }

    // 隐藏骨架屏并显示内容
    hideContentSkeleton(container, content, fadeIn = true) {
        if (!container) return;

        const skeletons = container.querySelectorAll('.skeleton-article-card, .skeleton-album-card, .skeleton-stats');
        
        if (skeletons.length > 0) {
            // 淡出骨架屏
            skeletons.forEach(skeleton => {
                skeleton.classList.add('skeleton-fade-out');
            });

            setTimeout(() => {
                // 清空容器
                container.innerHTML = '';
                
                // 添加实际内容
                if (typeof content === 'function') {
                    content();
                } else if (content) {
                    if (Array.isArray(content)) {
                        content.forEach(item => container.appendChild(item));
                    } else {
                        container.appendChild(content);
                    }
                }

                // 移除骨架屏状态
                container.classList.remove('skeleton-loading');

                // 添加淡入动画
                if (fadeIn) {
                    container.classList.add('content-fade-in');
                    setTimeout(() => {
                        container.classList.remove('content-fade-in');
                    }, 300);
                }
            }, 300);
        } else {
            // 直接显示内容
            if (typeof content === 'function') {
                content();
            } else if (content) {
                container.innerHTML = '';
                if (Array.isArray(content)) {
                    content.forEach(item => container.appendChild(item));
                } else {
                    container.appendChild(content);
                }
            }
        }
    }

    // 显示加载状态
    showLoading(key, message = '正在加载...') {
        this.loadingStates.set(key, true);
        
        // 显示进度条
        this.showProgress(10);
        
        // 可以在这里添加全局加载提示
        this.showLoadingMessage(message);
    }

    // 隐藏加载状态
    hideLoading(key) {
        this.loadingStates.delete(key);
        
        // 如果没有其他加载状态，隐藏进度条
        if (this.loadingStates.size === 0) {
            this.updateProgress(100);
            setTimeout(() => {
                this.hideProgress();
                this.hideLoadingMessage();
            }, 200);
        }
    }

    // 显示加载消息
    showLoadingMessage(message) {
        let messageEl = document.getElementById('global-loading-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'global-loading-message';
            messageEl.className = 'global-loading-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 50px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 24px;
                font-size: 14px;
                font-weight: 500;
                z-index: 9998;
                backdrop-filter: blur(10px);
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            `;
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.style.opacity = '1';
    }

    // 隐藏加载消息
    hideLoadingMessage() {
        const messageEl = document.getElementById('global-loading-message');
        if (messageEl) {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }
    }

    // 设置交叉观察器用于懒加载
    setupIntersectionObserver() {
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.loadImage(img);
                    this.imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }

    // 懒加载图片
    loadImage(img) {
        const src = img.dataset.src || img.dataset.lazySrc;
        if (!src) return;

        // 创建新的图片对象来预加载
        const newImg = new Image();
        
        // 显示加载状态
        img.style.opacity = '0.5';
        img.style.filter = 'blur(5px)';
        
        newImg.onload = () => {
            // 图片加载完成
            img.src = src;
            img.style.opacity = '1';
            img.style.filter = 'none';
            img.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
            
            // 移除懒加载属性
            img.removeAttribute('data-src');
            img.removeAttribute('data-lazy-src');
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
        };
        
        newImg.onerror = () => {
            // 图片加载失败
            img.style.opacity = '1';
            img.style.filter = 'none';
            img.classList.add('lazy-error');
            
            // 显示默认图片或错误状态
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4=';
        };
        
        newImg.src = src;
    }

    // 观察懒加载图片
    observeImages(container = document) {
        const lazyImages = container.querySelectorAll('img[data-src], img[data-lazy-src], .lazy-loading');
        lazyImages.forEach(img => {
            img.classList.add('lazy-loading');
            this.imageObserver.observe(img);
        });
    }

    // 预加载关键资源
    preloadCriticalResources(resources) {
        const promises = resources.map(resource => {
            return new Promise((resolve, reject) => {
                if (resource.type === 'image') {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = resource.url;
                } else if (resource.type === 'css') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = resource.url;
                    link.onload = resolve;
                    link.onerror = reject;
                    document.head.appendChild(link);
                } else if (resource.type === 'js') {
                    const script = document.createElement('script');
                    script.src = resource.url;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                }
            });
        });

        return Promise.allSettled(promises);
    }

    // 模拟渐进式加载
    simulateProgressiveLoading(duration = 2000, steps = 10) {
        const stepDuration = duration / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const progress = (currentStep / steps) * 90; // 最多到90%，留10%给实际完成
            this.updateProgress(progress);

            if (currentStep >= steps) {
                clearInterval(interval);
            }
        }, stepDuration);

        return interval;
    }

    // 批量加载内容
    async batchLoadContent(loadFunction, batchSize = 3, delay = 100) {
        const results = [];
        
        for (let i = 0; i < batchSize; i++) {
            try {
                const result = await loadFunction(i);
                results.push(result);
                
                // 更新进度
                const progress = ((i + 1) / batchSize) * 100;
                this.updateProgress(progress);
                
                // 添加延迟以避免过快加载
                if (i < batchSize - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                console.error(`批量加载第${i}项失败:`, error);
                results.push(null);
            }
        }
        
        return results;
    }

    // 清理资源
    destroy() {
        if (this.imageObserver) {
            this.imageObserver.disconnect();
        }
        
        const progressContainer = document.querySelector('.loading-progress');
        if (progressContainer) {
            progressContainer.remove();
        }
        
        const messageEl = document.getElementById('global-loading-message');
        if (messageEl) {
            messageEl.remove();
        }
        
        this.loadingStates.clear();
    }
}

// 创建全局加载管理器实例
window.loadingManager = new LoadingManager();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingManager;
}