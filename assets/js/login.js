// login.js - 登录页面功能

// 全局变量
let feedbackSystem;
let loadingManager;

// 初始化系统
function initializeSystems() {
    if (typeof FeedbackSystem !== 'undefined') {
        feedbackSystem = new FeedbackSystem();
    }
    if (typeof LoadingManager !== 'undefined') {
        loadingManager = new LoadingManager();
    }
}

// 登录函数
async function login(event) {
    // 阻止表单默认提交行为
    if (event) {
        event.preventDefault();
    }
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // 表单验证
    if (!username || !password) {
        if (feedbackSystem) {
            feedbackSystem.showNotification({
                type: 'error',
                title: '输入错误',
                message: '请输入用户名和密码',
                duration: 3000
            });
        } else {
            showNotification('请输入用户名和密码', false);
        }
        
        // 聚焦到第一个空字段
        if (!username) {
            document.getElementById('username').focus();
        } else {
            document.getElementById('password').focus();
        }
        return;
    }
    
    // 基本验证
    if (username.length < 3) {
        if (feedbackSystem) {
            feedbackSystem.showNotification({
                type: 'warning',
                title: '用户名格式错误',
                message: '用户名至少需要3个字符',
                duration: 3000
            });
        }
        document.getElementById('username').focus();
        return;
    }
    
    if (password.length < 6) {
        if (feedbackSystem) {
            feedbackSystem.showNotification({
                type: 'warning',
                title: '密码格式错误',
                message: '密码至少需要6个字符',
                duration: 3000
            });
        }
        document.getElementById('password').focus();
        return;
    }
    
    // 显示加载状态
    if (loadingManager) {
        loadingManager.showLoading('正在登录中...');
    } else {
        showLoading(true);
    }
    
    // 禁用表单
    setFormDisabled(true);

    try {
        // 添加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 添加智能指纹头部
                ...getFingerprintHeaders()
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        // 检查响应状态
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = '登录失败';
            let errorTitle = '登录错误';
            let actions = [];
            
            switch (response.status) {
                case 400:
                    errorTitle = '请求错误';
                    errorMessage = '请求参数错误，请检查输入信息';
                    break;
                case 401:
                    errorTitle = '认证失败';
                    errorMessage = errorData.error || '用户名或密码错误';
                    actions = [{
                        text: '重置密码',
                        action: () => {
                            if (feedbackSystem) {
                                feedbackSystem.showNotification({
                                    type: 'info',
                                    title: '密码重置',
                                    message: '请联系管理员重置密码',
                                    duration: 5000
                                });
                            }
                        }
                    }];
                    break;
                case 403:
                    errorTitle = '访问被拒绝';
                    errorMessage = '访问被拒绝，请检查域名配置';
                    break;
                case 429:
                    errorTitle = '请求过于频繁';
                    errorMessage = '请求过于频繁，请稍后再试';
                    actions = [{
                        text: '1分钟后重试',
                        action: () => {
                            setTimeout(() => {
                                setFormDisabled(false);
                                if (feedbackSystem) {
                                    feedbackSystem.showNotification({
                                        type: 'info',
                                        title: '可以重试了',
                                        message: '现在可以重新尝试登录',
                                        duration: 3000
                                    });
                                }
                            }, 60000);
                        }
                    }];
                    break;
                case 500:
                    errorTitle = '服务器错误';
                    errorMessage = '服务器内部错误，请联系管理员';
                    actions = [{
                        text: '重试',
                        action: () => login()
                    }];
                    break;
                default:
                    errorMessage = `登录失败 (${response.status}): ${errorData.error || '未知错误'}`;
            }
            
            // 隐藏加载状态
            if (loadingManager) {
                loadingManager.hideLoading();
            } else {
                showLoading(false);
            }
            
            // 启用表单
            setFormDisabled(false);
            
            // 显示错误通知
            if (feedbackSystem) {
                feedbackSystem.showNotification({
                    type: 'error',
                    title: errorTitle,
                    message: errorMessage,
                    duration: 5000,
                    actions: actions
                });
            } else {
                showNotification(errorMessage, false);
            }
            return;
        }

        const data = await response.json();

        // 从响应中获取 token 或 session cookie
        const { token } = data;
        if (token) {
            sessionStorage.setItem('authToken', token);
        }
        
        // 隐藏加载状态
        if (loadingManager) {
            loadingManager.hideLoading();
        } else {
            showLoading(false);
        }
        
        // 启用表单
        setFormDisabled(false);
        
        // 显示成功通知
        if (feedbackSystem) {
            feedbackSystem.showNotification({
                type: 'success',
                title: '登录成功',
                message: '正在跳转到主页...',
                duration: 2000
            });
        } else {
            showNotification('登录成功！', true);
        }
        
        // 延迟跳转
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('登录错误详情:', error);
        
        // 隐藏加载状态
        if (loadingManager) {
            loadingManager.hideLoading();
        } else {
            showLoading(false);
        }
        
        // 启用表单
        setFormDisabled(false);
        
        let errorMessage = '登录失败';
        let errorTitle = '网络错误';
        let actions = [];
        
        if (error.name === 'AbortError') {
            errorTitle = '请求超时';
            errorMessage = '登录超时，请检查网络连接';
            actions = [{
                text: '重试',
                action: () => login()
            }];
        } else if (error.name === 'TypeError') {
            if (error.message.includes('fetch')) {
                errorTitle = '连接失败';
                errorMessage = `无法连接到服务器: ${API_BASE}`;
                actions = [{
                    text: '检查网络',
                    action: () => {
                        if (feedbackSystem) {
                            feedbackSystem.showNotification({
                                type: 'info',
                                title: '网络检查',
                                message: '请检查网络连接和API地址配置',
                                duration: 5000
                            });
                        }
                    }
                }];
            } else {
                errorMessage = '网络异常，请重试';
                actions = [{
                    text: '重试',
                    action: () => login()
                }];
            }
        } else if (error.message.includes('CORS')) {
            errorTitle = '跨域错误';
            errorMessage = '跨域请求被阻止，请检查域名配置';
        } else {
            errorMessage = `登录错误: ${error.message}`;
            actions = [{
                text: '重试',
                action: () => login()
            }];
        }
        
        // 显示错误通知
        if (feedbackSystem) {
            feedbackSystem.showNotification({
                type: 'error',
                title: errorTitle,
                message: errorMessage,
                duration: 8000,
                actions: actions
            });
        } else {
            showNotification(errorMessage, false);
        }
    }
}

// 获取指纹头部信息
function getFingerprintHeaders() {
    // 使用基础指纹信息
    return {
        'X-Screen-Info': `${screen.width}x${screen.height}:${screen.colorDepth}:${window.devicePixelRatio}`,
        'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Language': navigator.language
    };
}

// 设置表单禁用状态
function setFormDisabled(disabled) {
    const form = document.querySelector('.login-form');
    if (form) {
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = disabled;
        });
        
        // 添加视觉反馈
        if (disabled) {
            form.style.opacity = '0.6';
            form.style.pointerEvents = 'none';
        } else {
            form.style.opacity = '1';
            form.style.pointerEvents = 'auto';
        }
    }
}

// 显示/隐藏加载动画（向后兼容）
function showLoading(show) {
    const loadingElement = document.getElementById('login-loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// 切换密码显示/隐藏
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordEye = document.getElementById('password-eye');
    
    if (passwordInput && passwordEye) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordEye.className = 'fas fa-eye-slash';
            passwordEye.setAttribute('aria-label', '隐藏密码');
        } else {
            passwordInput.type = 'password';
            passwordEye.className = 'fas fa-eye';
            passwordEye.setAttribute('aria-label', '显示密码');
        }
    }
}

// 表单验证辅助函数
function validateForm() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = document.querySelector('.login-btn');
    
    const isValid = username.length >= 3 && password.length >= 6;
    
    if (submitBtn) {
        submitBtn.disabled = !isValid;
        submitBtn.classList.toggle('disabled', !isValid);
    }
    
    return isValid;
}

// 实时表单验证
function setupFormValidation() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (usernameInput && passwordInput) {
        [usernameInput, passwordInput].forEach(input => {
            input.addEventListener('input', validateForm);
            input.addEventListener('blur', validateForm);
        });
    }
}

// showNotification函数已在app.js中定义（向后兼容）

// 键盘事件处理和初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化系统
    initializeSystems();
    
    // 设置表单验证
    setupFormValidation();
    
    // 回车键登录
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.id === 'username' || activeElement.id === 'password')) {
                login();
            }
        }
    });
    
    // ESC键清除表单
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (usernameInput && passwordInput) {
                if (feedbackSystem) {
                    feedbackSystem.showConfirmDialog({
                        title: '清除表单',
                        message: '确定要清除所有输入内容吗？',
                        confirmText: '清除',
                        cancelText: '取消',
                        onConfirm: () => {
                            usernameInput.value = '';
                            passwordInput.value = '';
                            usernameInput.focus();
                            validateForm();
                        }
                    });
                }
            }
        }
    });

    // 检查是否已经登录
    if (sessionStorage.getItem('authToken')) {
        if (feedbackSystem) {
            feedbackSystem.showNotification({
                type: 'info',
                title: '已登录',
                message: '您已经登录，正在跳转到主页...',
                duration: 2000
            });
        } else {
            showNotification('您已经登录，正在跳转...', true);
        }
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    // 聚焦到用户名输入框
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
    
    // 添加环境信息到控制台
    console.log(`[登录系统] API地址: ${API_BASE}`);
    console.log(`[登录系统] 当前域名: ${window.location.origin}`);
    console.log(`[登录系统] 用户代理: ${navigator.userAgent}`);
    
    // 添加表单提交事件监听
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }
    
    // 添加密码切换按钮事件
    const passwordToggle = document.getElementById('password-eye');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', togglePassword);
        passwordToggle.setAttribute('aria-label', '显示密码');
        passwordToggle.setAttribute('role', 'button');
        passwordToggle.setAttribute('tabindex', '0');
        
        // 键盘支持
        passwordToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePassword();
            }
        });
    }
    
    // 初始表单验证
    validateForm();
});