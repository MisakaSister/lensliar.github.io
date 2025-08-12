// mobile-navigation.js - 移动端导航增强

class MobileNavigation {
    constructor() {
        this.isMenuOpen = false;
        this.init();
    }

    init() {
        this.createMobileMenuToggle();
        this.setupEventListeners();
        this.handleResize();
    }

    createMobileMenuToggle() {
        const nav = document.querySelector('nav');
        if (!nav) return;

        // 检查是否已存在移动菜单按钮
        if (nav.querySelector('.mobile-menu-toggle')) return;

        // 创建移动菜单切换按钮
        const toggleButton = document.createElement('button');
        toggleButton.className = 'mobile-menu-toggle';
        toggleButton.setAttribute('aria-label', '切换导航菜单');
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.innerHTML = '<i class="fas fa-bars"></i>';

        // 插入到导航栏中
        const navLinks = nav.querySelector('.nav-links');
        if (navLinks) {
            nav.insertBefore(toggleButton, navLinks);
        }
    }

    setupEventListeners() {
        // 移动菜单切换
        document.addEventListener('click', (e) => {
            if (e.target.closest('.mobile-menu-toggle')) {
                e.preventDefault();
                this.toggleMobileMenu();
            }
        });

        // 点击菜单外部关闭菜单
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !e.target.closest('nav')) {
                this.closeMobileMenu();
            }
        });

        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });

        // 窗口大小变化时处理菜单状态
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // 导航链接点击后关闭移动菜单
        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-links a') && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        if (this.isMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        const toggleButton = document.querySelector('.mobile-menu-toggle');
        
        if (navLinks && toggleButton) {
            navLinks.classList.add('mobile-menu-open');
            toggleButton.setAttribute('aria-expanded', 'true');
            toggleButton.innerHTML = '<i class="fas fa-times"></i>';
            this.isMenuOpen = true;

            // 防止背景滚动
            document.body.style.overflow = 'hidden';

            // 聚焦到第一个菜单项
            const firstLink = navLinks.querySelector('a');
            if (firstLink) {
                setTimeout(() => firstLink.focus(), 100);
            }
        }
    }

    closeMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        const toggleButton = document.querySelector('.mobile-menu-toggle');
        
        if (navLinks && toggleButton) {
            navLinks.classList.remove('mobile-menu-open');
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
            this.isMenuOpen = false;

            // 恢复背景滚动
            document.body.style.overflow = '';
        }
    }

    handleResize() {
        // 在大屏幕上自动关闭移动菜单
        if (window.innerWidth > 768 && this.isMenuOpen) {
            this.closeMobileMenu();
        }
    }
}

// 触摸手势支持
class TouchGestures {
    constructor() {
        this.startX = 0;
        this.startY = 0;
        this.threshold = 50; // 最小滑动距离
        this.init();
    }

    init() {
        this.setupTouchEvents();
    }

    setupTouchEvents() {
        let startTime = 0;

        document.addEventListener('touchstart', (e) => {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            startTime = Date.now();
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!e.changedTouches[0]) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - this.startX;
            const deltaY = endY - this.startY;
            const deltaTime = Date.now() - startTime;

            // 检查是否为有效的滑动手势
            if (Math.abs(deltaX) > this.threshold && 
                Math.abs(deltaX) > Math.abs(deltaY) && 
                deltaTime < 300) {
                
                this.handleSwipe(deltaX > 0 ? 'right' : 'left');
            }
        }, { passive: true });
    }

    handleSwipe(direction) {
        const mobileNav = window.mobileNavigation;
        if (!mobileNav) return;

        // 从左边缘向右滑动打开菜单
        if (direction === 'right' && this.startX < 50 && !mobileNav.isMenuOpen) {
            mobileNav.openMobileMenu();
        }
        // 向左滑动关闭菜单
        else if (direction === 'left' && mobileNav.isMenuOpen) {
            mobileNav.closeMobileMenu();
        }
    }
}

// 移动端优化工具
class MobileOptimizations {
    constructor() {
        this.init();
    }

    init() {
        this.optimizeViewport();
        this.optimizeTouchTargets();
        this.optimizeImages();
        this.setupOrientationChange();
    }

    optimizeViewport() {
        // 确保视口设置正确
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    }

    optimizeTouchTargets() {
        // 确保所有可点击元素满足最小触摸目标尺寸
        const clickableElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], .btn');
        
        clickableElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                element.style.minWidth = '44px';
                element.style.minHeight = '44px';
                element.style.display = 'inline-flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'center';
            }
        });
    }

    optimizeImages() {
        // 为图片添加懒加载和响应式处理
        const images = document.querySelectorAll('img:not([loading])');
        
        images.forEach(img => {
            // 添加懒加载
            img.loading = 'lazy';
            
            // 添加错误处理
            img.addEventListener('error', () => {
                img.style.display = 'none';
                
                // 创建占位符
                const placeholder = document.createElement('div');
                placeholder.className = 'image-placeholder';
                placeholder.style.cssText = `
                    width: 100%;
                    height: 200px;
                    background: #f8f9fa;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #6c757d;
                    font-size: 0.875rem;
                    border-radius: 8px;
                `;
                placeholder.innerHTML = '<i class="fas fa-image"></i> 图片加载失败';
                
                img.parentNode.insertBefore(placeholder, img);
            });
        });
    }

    setupOrientationChange() {
        // 处理设备方向变化
        window.addEventListener('orientationchange', () => {
            // 延迟执行以确保新的视口尺寸已生效
            setTimeout(() => {
                // 重新计算布局
                this.optimizeTouchTargets();
                
                // 关闭移动菜单（如果打开）
                if (window.mobileNavigation && window.mobileNavigation.isMenuOpen) {
                    window.mobileNavigation.closeMobileMenu();
                }
                
                // 滚动到顶部（避免iOS Safari的地址栏问题）
                if (window.scrollY < 100) {
                    window.scrollTo(0, 0);
                }
            }, 100);
        });
    }
}

// 移动端性能优化
class MobilePerformance {
    constructor() {
        this.init();
    }

    init() {
        this.optimizeScrolling();
        this.optimizeAnimations();
        this.setupIntersectionObserver();
    }

    optimizeScrolling() {
        // 优化滚动性能
        let ticking = false;
        
        const updateScrollPosition = () => {
            // 更新滚动相关的UI元素
            const scrollTop = window.pageYOffset;
            
            // 显示/隐藏返回顶部按钮
            const backToTop = document.querySelector('.back-to-top');
            if (backToTop) {
                if (scrollTop > 300) {
                    backToTop.style.display = 'block';
                } else {
                    backToTop.style.display = 'none';
                }
            }
            
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollPosition);
                ticking = true;
            }
        }, { passive: true });
    }

    optimizeAnimations() {
        // 检查用户是否偏好减少动画
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--transition', 'none');
            return;
        }

        // 为低性能设备减少动画
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
            document.documentElement.style.setProperty('--transition', 'all 0.15s ease');
        }
    }

    setupIntersectionObserver() {
        // 使用Intersection Observer优化动画触发
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });

            // 观察需要动画的元素
            document.querySelectorAll('.card, .list-item').forEach(el => {
                observer.observe(el);
            });
        }
    }
}

// 初始化移动端功能
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth <= 768;

    // 初始化移动端导航
    window.mobileNavigation = new MobileNavigation();
    
    // 初始化触摸手势（仅在移动设备上）
    if (isMobile) {
        new TouchGestures();
    }
    
    // 初始化移动端优化
    new MobileOptimizations();
    
    // 初始化性能优化
    new MobilePerformance();
    
    // 添加移动端类名到body
    if (isMobile) {
        document.body.classList.add('mobile-device');
    }
    
    // 检测触摸支持
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }
});

// 导出类以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MobileNavigation,
        TouchGestures,
        MobileOptimizations,
        MobilePerformance
    };
}