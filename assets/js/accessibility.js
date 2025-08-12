// accessibility.js - 无障碍访问性增强

class AccessibilityEnhancer {
    constructor() {
        this.isKeyboardUser = false;
        this.currentFontSize = 'normal';
        this.currentLineHeight = 'normal';
        this.highContrastMode = false;
        this.reducedMotion = false;
        this.init();
    }

    init() {
        this.detectKeyboardUser();
        this.setupSkipLinks();
        this.enhanceFormAccessibility();
        this.setupARIAAttributes();
        this.setupKeyboardNavigation();
        this.setupAccessibilityToolbar();
        this.setupFocusManagement();
        this.setupScreenReaderSupport();
        this.loadUserPreferences();
    }

    // 检测键盘用户
    detectKeyboardUser() {
        // 检测Tab键使用
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.isKeyboardUser = true;
                document.body.classList.add('keyboard-navigation');
            }
        });

        // 检测鼠标使用
        document.addEventListener('mousedown', () => {
            this.isKeyboardUser = false;
            document.body.classList.remove('keyboard-navigation');
        });

        // 检测触摸使用
        document.addEventListener('touchstart', () => {
            this.isKeyboardUser = false;
            document.body.classList.remove('keyboard-navigation');
        });
    }

    // 设置跳转链接
    setupSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">跳转到主要内容</a>
            <a href="#navigation" class="skip-link">跳转到导航</a>
            <a href="#search" class="skip-link">跳转到搜索</a>
        `;
        
        document.body.insertBefore(skipLinks, document.body.firstChild);

        // 为主要内容区域添加ID
        const main = document.querySelector('main') || document.querySelector('.container');
        if (main && !main.id) {
            main.id = 'main-content';
            main.setAttribute('role', 'main');
        }

        // 为导航添加ID
        const nav = document.querySelector('nav');
        if (nav && !nav.id) {
            nav.id = 'navigation';
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', '主导航');
        }

        // 为搜索添加ID
        const search = document.querySelector('.search-container, [role="search"]');
        if (search && !search.id) {
            search.id = 'search';
            search.setAttribute('role', 'search');
            search.setAttribute('aria-label', '搜索');
        }
    }

    // 增强表单无障碍性
    enhanceFormAccessibility() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // 为表单添加标题
            if (!form.getAttribute('aria-label') && !form.getAttribute('aria-labelledby')) {
                const title = form.querySelector('h1, h2, h3, h4, h5, h6, .form-title');
                if (title) {
                    const titleId = this.generateId('form-title');
                    title.id = titleId;
                    form.setAttribute('aria-labelledby', titleId);
                }
            }

            // 增强输入字段
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                this.enhanceInputAccessibility(input);
            });

            // 增强提交按钮
            const submitBtn = form.querySelector('[type="submit"], .btn-submit');
            if (submitBtn && !submitBtn.getAttribute('aria-describedby')) {
                const description = form.querySelector('.form-description, .help-text');
                if (description) {
                    const descId = this.generateId('form-desc');
                    description.id = descId;
                    submitBtn.setAttribute('aria-describedby', descId);
                }
            }
        });
    }

    enhanceInputAccessibility(input) {
        const formGroup = input.closest('.form-group');
        const label = formGroup?.querySelector('label');
        
        // 确保标签关联
        if (label && !input.id) {
            const inputId = this.generateId('input');
            input.id = inputId;
            label.setAttribute('for', inputId);
        }

        // 添加必填字段标识
        if (input.required && label && !label.classList.contains('required')) {
            label.classList.add('required');
            input.setAttribute('aria-required', 'true');
        }

        // 添加输入提示
        const placeholder = input.getAttribute('placeholder');
        if (placeholder && !input.getAttribute('aria-label')) {
            input.setAttribute('aria-label', placeholder);
        }

        // 添加错误消息支持
        input.addEventListener('invalid', (e) => {
            this.showInputError(e.target);
        });

        input.addEventListener('input', (e) => {
            this.clearInputError(e.target);
        });

        // 添加输入验证反馈
        input.addEventListener('blur', (e) => {
            this.validateInput(e.target);
        });
    }

    showInputError(input) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        // 移除现有错误消息
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // 创建错误消息
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.setAttribute('role', 'alert');
        errorMessage.setAttribute('aria-live', 'polite');
        
        const errorId = this.generateId('error');
        errorMessage.id = errorId;
        
        // 设置错误消息内容
        if (input.validity.valueMissing) {
            errorMessage.textContent = '此字段为必填项';
        } else if (input.validity.typeMismatch) {
            errorMessage.textContent = '请输入有效的格式';
        } else if (input.validity.tooShort) {
            errorMessage.textContent = `至少需要 ${input.minLength} 个字符`;
        } else if (input.validity.tooLong) {
            errorMessage.textContent = `最多允许 ${input.maxLength} 个字符`;
        } else {
            errorMessage.textContent = '输入格式不正确';
        }

        formGroup.appendChild(errorMessage);
        input.setAttribute('aria-describedby', errorId);
        input.setAttribute('aria-invalid', 'true');
        formGroup.classList.add('error');
    }

    clearInputError(input) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }

        input.removeAttribute('aria-describedby');
        input.removeAttribute('aria-invalid');
        formGroup.classList.remove('error');
    }

    validateInput(input) {
        if (input.validity.valid && input.value.trim()) {
            const formGroup = input.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('success');
                
                // 添加成功消息
                let successMessage = formGroup.querySelector('.success-message');
                if (!successMessage) {
                    successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    successMessage.textContent = '输入有效';
                    successMessage.setAttribute('aria-live', 'polite');
                    formGroup.appendChild(successMessage);
                }
            }
        }
    }

    // 设置ARIA属性
    setupARIAAttributes() {
        // 为卡片添加ARIA属性
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            if (!card.getAttribute('role')) {
                card.setAttribute('role', 'article');
            }
            
            const title = card.querySelector('.card-title, h1, h2, h3, h4, h5, h6');
            if (title) {
                const titleId = this.generateId('card-title');
                title.id = titleId;
                card.setAttribute('aria-labelledby', titleId);
            }

            // 为可点击的卡片添加键盘支持
            if (card.onclick || card.querySelector('a')) {
                card.setAttribute('tabindex', '0');
                card.setAttribute('role', 'button');
                
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        card.click();
                    }
                });
            }
        });

        // 为按钮添加ARIA属性
        const buttons = document.querySelectorAll('button, .btn');
        buttons.forEach(button => {
            if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
                const icon = button.querySelector('i, .icon');
                if (icon) {
                    button.setAttribute('aria-label', this.getIconDescription(icon));
                }
            }
        });

        // 为导航链接添加ARIA属性
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            if (link.href === window.location.href) {
                link.setAttribute('aria-current', 'page');
            }
        });

        // 为模态框添加ARIA属性
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-hidden', 'true');
            
            const title = modal.querySelector('h1, h2, h3, h4, h5, h6, .modal-title');
            if (title) {
                const titleId = this.generateId('modal-title');
                title.id = titleId;
                modal.setAttribute('aria-labelledby', titleId);
            }
        });
    }

    // 设置键盘导航
    setupKeyboardNavigation() {
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.active, .modal[aria-hidden="false"]');
                if (openModal) {
                    this.closeModal(openModal);
                }

                const openMenu = document.querySelector('.mobile-menu-open');
                if (openMenu && window.mobileNavigation) {
                    window.mobileNavigation.closeMobileMenu();
                }
            }
        });

        // 方向键导航
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('.content-grid, .grid--container')) {
                this.handleGridNavigation(e);
            }
        });

        // Tab键循环导航
        this.setupTabTrap();
    }

    handleGridNavigation(e) {
        const grid = e.target.closest('.content-grid, .grid--container');
        const items = Array.from(grid.querySelectorAll('.card, .grid--cell'));
        const currentIndex = items.indexOf(document.activeElement);
        
        if (currentIndex === -1) return;

        let newIndex = currentIndex;
        const columns = this.getGridColumns(grid);

        switch (e.key) {
            case 'ArrowRight':
                newIndex = Math.min(currentIndex + 1, items.length - 1);
                break;
            case 'ArrowLeft':
                newIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'ArrowDown':
                newIndex = Math.min(currentIndex + columns, items.length - 1);
                break;
            case 'ArrowUp':
                newIndex = Math.max(currentIndex - columns, 0);
                break;
            case 'Home':
                newIndex = 0;
                break;
            case 'End':
                newIndex = items.length - 1;
                break;
            default:
                return;
        }

        if (newIndex !== currentIndex) {
            e.preventDefault();
            items[newIndex].focus();
        }
    }

    getGridColumns(grid) {
        const computedStyle = window.getComputedStyle(grid);
        const columns = computedStyle.gridTemplateColumns.split(' ').length;
        return columns || 1;
    }

    setupTabTrap() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.trapFocus(e, modal);
                }
            });
        });
    }

    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }

    // 设置无障碍工具栏
    setupAccessibilityToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'accessibility-toolbar';
        toolbar.innerHTML = `
            <button onclick="accessibilityEnhancer.toggleFontSize()" aria-label="调整字体大小">字体</button>
            <button onclick="accessibilityEnhancer.toggleLineHeight()" aria-label="调整行高">行高</button>
            <button onclick="accessibilityEnhancer.toggleHighContrast()" aria-label="切换高对比度">对比度</button>
            <button onclick="accessibilityEnhancer.toggleReducedMotion()" aria-label="减少动画">动画</button>
            <button onclick="accessibilityEnhancer.resetSettings()" aria-label="重置设置">重置</button>
        `;
        
        document.body.appendChild(toolbar);

        // 添加工具栏切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'accessibility-toggle';
        toggleBtn.innerHTML = '♿';
        toggleBtn.setAttribute('aria-label', '打开无障碍工具栏');
        toggleBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            z-index: 9999;
        `;
        
        toggleBtn.addEventListener('click', () => {
            toolbar.classList.toggle('show');
            const isOpen = toolbar.classList.contains('show');
            toggleBtn.setAttribute('aria-label', isOpen ? '关闭无障碍工具栏' : '打开无障碍工具栏');
        });
        
        document.body.appendChild(toggleBtn);
    }

    // 焦点管理
    setupFocusManagement() {
        // 页面加载时聚焦到主要内容
        window.addEventListener('load', () => {
            const skipLink = document.querySelector('.skip-link');
            if (skipLink && this.isKeyboardUser) {
                skipLink.focus();
            }
        });

        // 模态框焦点管理
        this.setupModalFocusManagement();
    }

    setupModalFocusManagement() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class' || mutation.attributeName === 'aria-hidden') {
                        const isOpen = modal.classList.contains('active') || modal.getAttribute('aria-hidden') === 'false';
                        
                        if (isOpen) {
                            this.openModal(modal);
                        } else {
                            this.closeModal(modal);
                        }
                    }
                });
            });
            
            observer.observe(modal, { attributes: true });
        });
    }

    openModal(modal) {
        // 保存当前焦点
        this.previousFocus = document.activeElement;
        
        // 设置ARIA属性
        modal.setAttribute('aria-hidden', 'false');
        
        // 聚焦到模态框内的第一个可聚焦元素
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
        
        // 阻止背景滚动
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        // 设置ARIA属性
        modal.setAttribute('aria-hidden', 'true');
        
        // 恢复焦点
        if (this.previousFocus) {
            this.previousFocus.focus();
            this.previousFocus = null;
        }
        
        // 恢复背景滚动
        document.body.style.overflow = '';
    }

    // 屏幕阅读器支持
    setupScreenReaderSupport() {
        // 创建实时区域用于状态更新
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'live-region';
        document.body.appendChild(liveRegion);

        // 页面加载完成通知
        window.addEventListener('load', () => {
            this.announceToScreenReader('页面加载完成');
        });

        // 内容更新通知
        this.setupContentChangeAnnouncements();
    }

    setupContentChangeAnnouncements() {
        // 监听内容区域变化
        const contentAreas = document.querySelectorAll('.content-grid, .grid--container, #articles-container, #albums-container');
        
        contentAreas.forEach(area => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        const addedElements = Array.from(mutation.addedNodes).filter(node => node.nodeType === 1);
                        if (addedElements.length > 0) {
                            this.announceToScreenReader(`已加载 ${addedElements.length} 个新项目`);
                        }
                    }
                });
            });
            
            observer.observe(area, { childList: true });
        });
    }

    announceToScreenReader(message) {
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            
            // 清除消息以便下次使用
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    // 工具栏功能
    toggleFontSize() {
        const sizes = ['small', 'normal', 'large', 'extra-large'];
        const currentIndex = sizes.indexOf(this.currentFontSize);
        const nextIndex = (currentIndex + 1) % sizes.length;
        this.currentFontSize = sizes[nextIndex];
        
        document.body.className = document.body.className.replace(/font-size-\w+/g, '');
        document.body.classList.add(`font-size-${this.currentFontSize}`);
        
        this.saveUserPreferences();
        this.announceToScreenReader(`字体大小已调整为${this.currentFontSize}`);
    }

    toggleLineHeight() {
        const heights = ['normal', 'relaxed', 'loose'];
        const currentIndex = heights.indexOf(this.currentLineHeight);
        const nextIndex = (currentIndex + 1) % heights.length;
        this.currentLineHeight = heights[nextIndex];
        
        document.body.className = document.body.className.replace(/line-height-\w+/g, '');
        document.body.classList.add(`line-height-${this.currentLineHeight}`);
        
        this.saveUserPreferences();
        this.announceToScreenReader(`行高已调整为${this.currentLineHeight}`);
    }

    toggleHighContrast() {
        this.highContrastMode = !this.highContrastMode;
        document.body.classList.toggle('high-contrast', this.highContrastMode);
        
        this.saveUserPreferences();
        this.announceToScreenReader(this.highContrastMode ? '已启用高对比度模式' : '已禁用高对比度模式');
    }

    toggleReducedMotion() {
        this.reducedMotion = !this.reducedMotion;
        document.body.classList.toggle('reduced-motion', this.reducedMotion);
        
        if (this.reducedMotion) {
            document.documentElement.style.setProperty('--animation-duration-fast', '0.01ms');
            document.documentElement.style.setProperty('--animation-duration-normal', '0.01ms');
            document.documentElement.style.setProperty('--animation-duration-slow', '0.01ms');
        } else {
            document.documentElement.style.removeProperty('--animation-duration-fast');
            document.documentElement.style.removeProperty('--animation-duration-normal');
            document.documentElement.style.removeProperty('--animation-duration-slow');
        }
        
        this.saveUserPreferences();
        this.announceToScreenReader(this.reducedMotion ? '已减少动画效果' : '已恢复动画效果');
    }

    resetSettings() {
        this.currentFontSize = 'normal';
        this.currentLineHeight = 'normal';
        this.highContrastMode = false;
        this.reducedMotion = false;
        
        document.body.className = document.body.className.replace(/font-size-\w+|line-height-\w+|high-contrast|reduced-motion/g, '');
        
        document.documentElement.style.removeProperty('--animation-duration-fast');
        document.documentElement.style.removeProperty('--animation-duration-normal');
        document.documentElement.style.removeProperty('--animation-duration-slow');
        
        this.saveUserPreferences();
        this.announceToScreenReader('无障碍设置已重置');
    }

    // 用户偏好设置
    saveUserPreferences() {
        const preferences = {
            fontSize: this.currentFontSize,
            lineHeight: this.currentLineHeight,
            highContrast: this.highContrastMode,
            reducedMotion: this.reducedMotion
        };
        
        localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
    }

    loadUserPreferences() {
        const saved = localStorage.getItem('accessibility-preferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            
            this.currentFontSize = preferences.fontSize || 'normal';
            this.currentLineHeight = preferences.lineHeight || 'normal';
            this.highContrastMode = preferences.highContrast || false;
            this.reducedMotion = preferences.reducedMotion || false;
            
            // 应用设置
            document.body.classList.add(`font-size-${this.currentFontSize}`);
            document.body.classList.add(`line-height-${this.currentLineHeight}`);
            
            if (this.highContrastMode) {
                document.body.classList.add('high-contrast');
            }
            
            if (this.reducedMotion) {
                document.body.classList.add('reduced-motion');
                document.documentElement.style.setProperty('--animation-duration-fast', '0.01ms');
                document.documentElement.style.setProperty('--animation-duration-normal', '0.01ms');
                document.documentElement.style.setProperty('--animation-duration-slow', '0.01ms');
            }
        }
    }

    // 工具方法
    generateId(prefix) {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getIconDescription(icon) {
        const classList = Array.from(icon.classList);
        const iconMap = {
            'fa-home': '首页',
            'fa-newspaper': '文章',
            'fa-images': '相册',
            'fa-user': '用户',
            'fa-search': '搜索',
            'fa-bars': '菜单',
            'fa-times': '关闭',
            'fa-arrow-up': '向上',
            'fa-arrow-down': '向下',
            'fa-share': '分享',
            'fa-eye': '查看',
            'fa-edit': '编辑',
            'fa-trash': '删除'
        };
        
        for (const className of classList) {
            if (iconMap[className]) {
                return iconMap[className];
            }
        }
        
        return '图标';
    }
}

// 初始化无障碍增强
let accessibilityEnhancer;

document.addEventListener('DOMContentLoaded', () => {
    accessibilityEnhancer = new AccessibilityEnhancer();
    
    // 将实例暴露到全局作用域供工具栏使用
    window.accessibilityEnhancer = accessibilityEnhancer;
});

// 导出类以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AccessibilityEnhancer };
}