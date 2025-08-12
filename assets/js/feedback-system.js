// 用户反馈系统 - feedback-system.js
// 统一管理通知、错误处理和用户引导

class FeedbackSystem {
    constructor() {
        this.notifications = new Map();
        this.toasts = [];
        this.maxToasts = 5;
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.createToastContainer();
        this.setupGlobalErrorHandler();
    }

    // 创建通知容器
    createNotificationContainer() {
        if (document.querySelector('.notification-container')) return;

        const container = document.createElement('div');
        container.className = 'notification-container';
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    // 创建Toast容器
    createToastContainer() {
        if (document.querySelector('.toast-container')) return;

        const container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 350px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }

    // 显示通知
    showNotification(message, type = 'info', options = {}) {
        const {
            duration = 5000,
            persistent = false,
            actions = [],
            icon = null,
            title = null
        } = options;

        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.id = id;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 10px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
            position: relative;
            overflow: hidden;
            max-width: 100%;
            word-wrap: break-word;
        `;

        // 创建通知内容
        const content = document.createElement('div');
        content.className = 'notification-content';
        content.style.cssText = `
            display: flex;
            align-items: flex-start;
            gap: 12px;
        `;

        // 添加图标
        if (icon || this.getDefaultIcon(type)) {
            const iconEl = document.createElement('div');
            iconEl.className = 'notification-icon';
            iconEl.innerHTML = `<i class="${icon || this.getDefaultIcon(type)}"></i>`;
            iconEl.style.cssText = `
                font-size: 18px;
                margin-top: 2px;
                flex-shrink: 0;
            `;
            content.appendChild(iconEl);
        }

        // 添加文本内容
        const textContent = document.createElement('div');
        textContent.className = 'notification-text';
        textContent.style.cssText = `
            flex: 1;
            line-height: 1.4;
        `;

        if (title) {
            const titleEl = document.createElement('div');
            titleEl.className = 'notification-title';
            titleEl.textContent = title;
            titleEl.style.cssText = `
                font-weight: 600;
                margin-bottom: 4px;
                font-size: 14px;
            `;
            textContent.appendChild(titleEl);
        }

        const messageEl = document.createElement('div');
        messageEl.className = 'notification-message';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            font-size: 13px;
            opacity: 0.95;
        `;
        textContent.appendChild(messageEl);

        content.appendChild(textContent);

        // 添加关闭按钮
        if (!persistent) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'notification-close';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                opacity: 0.7;
                transition: opacity 0.2s ease;
                flex-shrink: 0;
                margin-top: -2px;
            `;
            closeBtn.addEventListener('click', () => this.hideNotification(id));
            closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
            closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.7');
            content.appendChild(closeBtn);
        }

        notification.appendChild(content);

        // 添加操作按钮
        if (actions.length > 0) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'notification-actions';
            actionsEl.style.cssText = `
                margin-top: 12px;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            `;

            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.textContent = action.text;
                btn.className = `notification-action ${action.primary ? 'primary' : 'secondary'}`;
                btn.style.cssText = `
                    background: ${action.primary ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                `;
                btn.addEventListener('click', () => {
                    action.handler();
                    if (action.closeOnClick !== false) {
                        this.hideNotification(id);
                    }
                });
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = action.primary ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = action.primary ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                });
                actionsEl.appendChild(btn);
            });

            notification.appendChild(actionsEl);
        }

        // 添加进度条（如果有持续时间）
        if (duration > 0 && !persistent) {
            const progressBar = document.createElement('div');
            progressBar.className = 'notification-progress';
            progressBar.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                width: 100%;
                transform-origin: left;
                animation: notification-progress ${duration}ms linear;
            `;
            notification.appendChild(progressBar);

            // 添加进度条动画
            const style = document.createElement('style');
            style.textContent = `
                @keyframes notification-progress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
            `;
            document.head.appendChild(style);
        }

        // 添加到容器
        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // 触发显示动画
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // 存储通知引用
        this.notifications.set(id, {
            element: notification,
            timer: null,
            persistent
        });

        // 设置自动隐藏
        if (duration > 0 && !persistent) {
            const timer = setTimeout(() => {
                this.hideNotification(id);
            }, duration);
            this.notifications.get(id).timer = timer;
        }

        return id;
    }

    // 隐藏通知
    hideNotification(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const { element, timer } = notification;
        
        if (timer) {
            clearTimeout(timer);
        }

        element.style.transform = 'translateX(100%)';
        element.style.opacity = '0';

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    // 显示Toast消息
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${this.getToastColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            max-width: 100%;
            word-wrap: break-word;
        `;
        toast.textContent = message;

        // 点击关闭
        toast.addEventListener('click', () => {
            this.hideToast(toast);
        });

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // 管理Toast数量
        this.toasts.push(toast);
        if (this.toasts.length > this.maxToasts) {
            const oldToast = this.toasts.shift();
            this.hideToast(oldToast);
        }

        // 触发显示动画
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                this.hideToast(toast);
            }, duration);
        }

        return toast;
    }

    // 隐藏Toast
    hideToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }

    // 显示确认对话框
    showConfirm(message, options = {}) {
        const {
            title = '确认操作',
            confirmText = '确认',
            cancelText = '取消',
            type = 'warning'
        } = options;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';
            dialog.style.cssText = `
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            `;

            dialog.innerHTML = `
                <div class="confirm-header" style="margin-bottom: 16px;">
                    <h3 style="margin: 0; color: #2c3e50; font-size: 18px; font-weight: 600;">${title}</h3>
                </div>
                <div class="confirm-body" style="margin-bottom: 24px;">
                    <p style="margin: 0; color: #6c757d; line-height: 1.5;">${message}</p>
                </div>
                <div class="confirm-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="confirm-cancel" style="
                        background: transparent;
                        border: 2px solid #e9ecef;
                        color: #6c757d;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">${cancelText}</button>
                    <button class="confirm-ok" style="
                        background: ${this.getNotificationColor(type)};
                        border: none;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">${confirmText}</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // 绑定事件
            const cancelBtn = dialog.querySelector('.confirm-cancel');
            const okBtn = dialog.querySelector('.confirm-ok');

            cancelBtn.addEventListener('click', () => {
                this.hideConfirm(overlay);
                resolve(false);
            });

            okBtn.addEventListener('click', () => {
                this.hideConfirm(overlay);
                resolve(true);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideConfirm(overlay);
                    resolve(false);
                }
            });

            // 显示动画
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                dialog.style.transform = 'scale(1)';
            });

            // 键盘支持
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    this.hideConfirm(overlay);
                    resolve(false);
                    document.removeEventListener('keydown', handleKeydown);
                } else if (e.key === 'Enter') {
                    this.hideConfirm(overlay);
                    resolve(true);
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
        });
    }

    // 隐藏确认对话框
    hideConfirm(overlay) {
        overlay.style.opacity = '0';
        const dialog = overlay.querySelector('.confirm-dialog');
        dialog.style.transform = 'scale(0.9)';

        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }

    // 设置全局错误处理
    setupGlobalErrorHandler() {
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            this.showNotification(
                '页面遇到了一个错误，请刷新页面重试',
                'error',
                {
                    title: '系统错误',
                    actions: [
                        {
                            text: '刷新页面',
                            primary: true,
                            handler: () => window.location.reload()
                        }
                    ]
                }
            );
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            this.showNotification(
                '网络请求失败，请检查网络连接',
                'error',
                {
                    title: '网络错误',
                    duration: 5000
                }
            );
        });
    }

    // 获取通知颜色
    getNotificationColor(type) {
        const colors = {
            success: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
            error: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
            warning: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
            info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        };
        return colors[type] || colors.info;
    }

    // 获取Toast颜色
    getToastColor(type) {
        const colors = {
            success: '#4ecdc4',
            error: '#ff6b6b',
            warning: '#f39c12',
            info: '#667eea'
        };
        return colors[type] || colors.info;
    }

    // 获取默认图标
    getDefaultIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // 清除所有通知
    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.hideNotification(id);
        });
        
        this.toasts.forEach(toast => {
            this.hideToast(toast);
        });
    }

    // 销毁反馈系统
    destroy() {
        this.clearAll();
        
        const containers = [
            document.getElementById('notification-container'),
            document.getElementById('toast-container')
        ];
        
        containers.forEach(container => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
    }
}

// 创建全局反馈系统实例
window.feedbackSystem = new FeedbackSystem();

// 兼容原有的showNotification函数
window.showNotification = function(message, isSuccess = true) {
    const type = isSuccess ? 'success' : 'error';
    window.feedbackSystem.showNotification(message, type);
};

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedbackSystem;
}