// interactions.js - 界面交互增强

class InteractionEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.setupCardInteractions();
        this.setupButtonInteractions();
        this.setupFormInteractions();
        this.setupScrollAnimations();
        this.setupHoverEffects();
        this.setupClickEffects();
        this.setupKeyboardInteractions();
    }

    // 卡片交互增强
    setupCardInteractions() {
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            // 鼠标进入效果
            card.addEventListener('mouseenter', (e) => {
                this.addCardHoverEffect(e.target);
            });

            // 鼠标离开效果
            card.addEventListener('mouseleave', (e) => {
                this.removeCardHoverEffect(e.target);
            });

            // 点击效果
            card.addEventListener('click', (e) => {
                this.addCardClickEffect(e.target);
            });

            // 添加视差效果
            card.addEventListener('mousemove', (e) => {
                this.addCardParallaxEffect(e, card);
            });
        });
    }

    addCardHoverEffect(card) {
        card.style.transform = 'translateY(-8px) scale(1.02)';
        card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
        
        // 添加内容动画
        const cardBody = card.querySelector('.card-body');
        if (cardBody) {
            cardBody.style.transform = 'translateY(-2px)';
        }

        // 添加图片效果
        const cardImg = card.querySelector('.card-img');
        if (cardImg) {
            cardImg.style.filter = 'brightness(1.1) saturate(1.2)';
            cardImg.style.transform = 'scale(1.05)';
        }
    }

    removeCardHoverEffect(card) {
        card.style.transform = '';
        card.style.boxShadow = '';
        
        const cardBody = card.querySelector('.card-body');
        if (cardBody) {
            cardBody.style.transform = '';
        }

        const cardImg = card.querySelector('.card-img');
        if (cardImg) {
            cardImg.style.filter = '';
            cardImg.style.transform = '';
        }
    }

    addCardClickEffect(card) {
        card.style.transform = 'translateY(-4px) scale(1.01)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
    }

    addCardParallaxEffect(e, card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
    }

    // 按钮交互增强
    setupButtonInteractions() {
        const buttons = document.querySelectorAll('.btn, button');
        
        buttons.forEach(button => {
            // 波纹效果
            button.addEventListener('click', (e) => {
                this.createRippleEffect(e, button);
            });

            // 悬停效果
            button.addEventListener('mouseenter', (e) => {
                this.addButtonHoverEffect(e.target);
            });

            button.addEventListener('mouseleave', (e) => {
                this.removeButtonHoverEffect(e.target);
            });

            // 按下效果
            button.addEventListener('mousedown', (e) => {
                this.addButtonPressEffect(e.target);
            });

            button.addEventListener('mouseup', (e) => {
                this.removeButtonPressEffect(e.target);
            });
        });
    }

    createRippleEffect(e, button) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    addButtonHoverEffect(button) {
        button.style.transform = 'translateY(-2px) scale(1.05)';
        button.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    }

    removeButtonHoverEffect(button) {
        button.style.transform = '';
        button.style.boxShadow = '';
    }

    addButtonPressEffect(button) {
        button.style.transform = 'translateY(0) scale(0.98)';
    }

    removeButtonPressEffect(button) {
        button.style.transform = '';
    }

    // 表单交互增强
    setupFormInteractions() {
        const inputs = document.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // 聚焦效果
            input.addEventListener('focus', (e) => {
                this.addInputFocusEffect(e.target);
            });

            input.addEventListener('blur', (e) => {
                this.removeInputFocusEffect(e.target);
            });

            // 输入验证动画
            input.addEventListener('input', (e) => {
                this.validateInputAnimation(e.target);
            });

            // 浮动标签效果
            this.setupFloatingLabel(input);
        });
    }

    addInputFocusEffect(input) {
        input.style.transform = 'translateY(-2px)';
        input.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1), 0 8px 25px rgba(102, 126, 234, 0.15)';
        
        // 添加聚焦动画
        input.style.animation = 'searchFocus 0.3s ease';
    }

    removeInputFocusEffect(input) {
        input.style.transform = '';
        input.style.boxShadow = '';
        input.style.animation = '';
    }

    validateInputAnimation(input) {
        const value = input.value.trim();
        const formGroup = input.closest('.form-group');
        
        if (formGroup) {
            formGroup.classList.remove('error', 'success');
            
            if (value) {
                if (this.isValidInput(input, value)) {
                    formGroup.classList.add('success');
                    input.style.borderColor = '#28a745';
                } else {
                    formGroup.classList.add('error');
                    input.style.borderColor = '#dc3545';
                }
            } else {
                input.style.borderColor = '';
            }
        }
    }

    isValidInput(input, value) {
        const type = input.type;
        
        switch (type) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'password':
                return value.length >= 6;
            case 'text':
                return value.length >= 2;
            default:
                return true;
        }
    }

    setupFloatingLabel(input) {
        const formGroup = input.closest('.form-group');
        const label = formGroup?.querySelector('label');
        
        if (label && !formGroup.classList.contains('floating-label')) {
            formGroup.classList.add('floating-label');
            
            // 检查初始状态
            if (input.value) {
                label.classList.add('active');
            }
        }
    }

    // 滚动动画
    setupScrollAnimations() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateElementOnScroll(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });

            // 观察需要动画的元素
            const animateElements = document.querySelectorAll('.card, .list-item, .form-group, .page-title');
            animateElements.forEach(el => {
                observer.observe(el);
            });
        }

        // 滚动进度指示器
        this.setupScrollProgress();
    }

    animateElementOnScroll(element) {
        element.classList.add('animate-slide-up');
        
        // 为卡片添加延迟动画
        if (element.classList.contains('card')) {
            const cards = Array.from(document.querySelectorAll('.card'));
            const index = cards.indexOf(element);
            element.style.animationDelay = `${index * 0.1}s`;
        }
    }

    setupScrollProgress() {
        let progressBar = document.querySelector('.scroll-progress');
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'scroll-progress';
            progressBar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 0%;
                height: 3px;
                background: linear-gradient(90deg, var(--primary-color), var(--secondary));
                z-index: 9999;
                transition: width 0.1s ease;
            `;
            document.body.appendChild(progressBar);
        }

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            
            progressBar.style.width = `${Math.min(scrollPercent, 100)}%`;
        });
    }

    // 悬停效果增强
    setupHoverEffects() {
        // 导航链接悬停效果
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', (e) => {
                e.target.style.transform = 'translateY(-2px)';
            });
            
            link.addEventListener('mouseleave', (e) => {
                e.target.style.transform = '';
            });
        });

        // 图标悬停效果
        const icons = document.querySelectorAll('.fas, .far, .fab');
        icons.forEach(icon => {
            const parent = icon.closest('.btn, .nav-links a, .action-icon');
            if (parent) {
                parent.addEventListener('mouseenter', () => {
                    icon.style.transform = 'scale(1.2)';
                });
                
                parent.addEventListener('mouseleave', () => {
                    icon.style.transform = '';
                });
            }
        });
    }

    // 点击效果增强
    setupClickEffects() {
        // 为所有可点击元素添加点击反馈
        const clickableElements = document.querySelectorAll('a, button, .btn, .card, .list-item');
        
        clickableElements.forEach(element => {
            element.addEventListener('click', (e) => {
                this.addClickFeedback(e.target);
            });
        });
    }

    addClickFeedback(element) {
        element.style.transform = 'scale(0.98)';
        element.style.transition = 'transform 0.1s ease';
        
        setTimeout(() => {
            element.style.transform = '';
        }, 100);
    }

    // 键盘交互增强
    setupKeyboardInteractions() {
        // 为可聚焦元素添加键盘导航增强
        const focusableElements = document.querySelectorAll('a, button, input, textarea, select, [tabindex]');
        
        focusableElements.forEach(element => {
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    this.addKeyboardActivation(element);
                }
            });
            
            element.addEventListener('focus', (e) => {
                this.addFocusIndicator(e.target);
            });
            
            element.addEventListener('blur', (e) => {
                this.removeFocusIndicator(e.target);
            });
        });
    }

    addKeyboardActivation(element) {
        element.style.transform = 'scale(0.95)';
        element.style.transition = 'transform 0.1s ease';
        
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    addFocusIndicator(element) {
        element.style.outline = '2px solid var(--primary-color)';
        element.style.outlineOffset = '2px';
        element.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.2)';
    }

    removeFocusIndicator(element) {
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.boxShadow = '';
    }

    // 工具方法
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 特殊效果类
class SpecialEffects {
    constructor() {
        this.init();
    }

    init() {
        this.setupParticleEffects();
        this.setupTypewriterEffect();
        this.setupCounterAnimation();
        this.setupProgressBars();
    }

    // 粒子效果
    setupParticleEffects() {
        const heroSection = document.querySelector('.hero-section, .page-header');
        if (heroSection) {
            this.createParticles(heroSection);
        }
    }

    createParticles(container) {
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                pointer-events: none;
                animation: float ${3 + Math.random() * 4}s infinite ease-in-out;
                animation-delay: ${Math.random() * 2}s;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
            `;
            
            container.style.position = 'relative';
            container.appendChild(particle);
        }
    }

    // 打字机效果
    setupTypewriterEffect() {
        const typewriterElements = document.querySelectorAll('[data-typewriter]');
        
        typewriterElements.forEach(element => {
            const text = element.textContent;
            element.textContent = '';
            this.typeWriter(element, text, 0);
        });
    }

    typeWriter(element, text, i) {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            setTimeout(() => this.typeWriter(element, text, i + 1), 100);
        }
    }

    // 计数动画
    setupCounterAnimation() {
        const counters = document.querySelectorAll('[data-counter]');
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateCounter(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            });

            counters.forEach(counter => observer.observe(counter));
        }
    }

    animateCounter(element) {
        const target = parseInt(element.dataset.counter);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            element.textContent = Math.floor(current);
            
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            }
        }, 16);
    }

    // 进度条动画
    setupProgressBars() {
        const progressBars = document.querySelectorAll('.progress-bar');
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateProgressBar(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            });

            progressBars.forEach(bar => observer.observe(bar));
        }
    }

    animateProgressBar(progressBar) {
        const progress = progressBar.dataset.progress || 0;
        progressBar.style.width = '0%';
        
        setTimeout(() => {
            progressBar.style.width = `${progress}%`;
            progressBar.style.transition = 'width 1.5s ease-in-out';
        }, 100);
    }
}

// 添加必要的CSS动画
const animationStyles = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes float {
        0%, 100% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-20px);
        }
    }
`;

// 将样式添加到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// 初始化交互增强
document.addEventListener('DOMContentLoaded', () => {
    new InteractionEnhancer();
    new SpecialEffects();
});

// 导出类以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        InteractionEnhancer,
        SpecialEffects
    };
}