// 智能指纹前端增强脚本
// 配合后端智能指纹验证系统

class SmartFingerprintClient {
    constructor() {
        this.fingerprintInfo = {};
        this.initialized = false;
        this.collectFingerprint();
    }

    // 收集指纹信息
    collectFingerprint() {
        try {
            this.fingerprintInfo = {
                // 屏幕信息
                screen: this.getScreenInfo(),
                
                // 时区信息
                timezone: this.getTimezoneInfo(),
                
                // 浏览器特性
                features: this.getBrowserFeatures(),
                
                // 语言信息
                language: this.getLanguageInfo(),
                
                // 硬件信息
                hardware: this.getHardwareInfo()
            };
            
            this.initialized = true;
            
            // 立即发送指纹信息到后端
            this.sendFingerprintToBackend();
            
        } catch (error) {
            console.warn('[Smart Fingerprint] Collection failed:', error);
        }
    }

    // 获取屏幕信息
    getScreenInfo() {
        const screen = window.screen;
        return {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            orientation: screen.orientation ? screen.orientation.type : 'unknown',
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }

    // 获取时区信息
    getTimezoneInfo() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const offset = new Date().getTimezoneOffset();
            
            return {
                timezone: timezone,
                offset: offset,
                locale: Intl.DateTimeFormat().resolvedOptions().locale
            };
        } catch (error) {
            return {
                timezone: 'unknown',
                offset: 0,
                locale: 'unknown'
            };
        }
    }

    // 获取浏览器特性
    getBrowserFeatures() {
        return {
            // 存储支持
            localStorage: typeof localStorage !== 'undefined',
            sessionStorage: typeof sessionStorage !== 'undefined',
            indexedDB: typeof indexedDB !== 'undefined',
            
            // API支持
            webGL: this.hasWebGL(),
            webRTC: this.hasWebRTC(),
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            
            // 硬件访问
            geolocation: 'geolocation' in navigator,
            camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            
            // 其他特性
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            onLine: navigator.onLine
        };
    }

    // 获取语言信息
    getLanguageInfo() {
        return {
            language: navigator.language,
            languages: navigator.languages || [navigator.language],
            platformLanguage: navigator.systemLanguage || navigator.userLanguage
        };
    }

    // 获取硬件信息
    getHardwareInfo() {
        return {
            // CPU信息
            hardwareConcurrency: navigator.hardwareConcurrency || 1,
            
            // 内存信息（如果支持）
            deviceMemory: navigator.deviceMemory || 'unknown',
            
            // 平台信息
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            
            // 网络信息（如果支持）
            connection: this.getConnectionInfo()
        };
    }

    // 检查WebGL支持
    hasWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (error) {
            return false;
        }
    }

    // 检查WebRTC支持
    hasWebRTC() {
        return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
    }

    // 获取网络连接信息
    getConnectionInfo() {
        if (navigator.connection) {
            return {
                effectiveType: navigator.connection.effectiveType,
                type: navigator.connection.type,
                saveData: navigator.connection.saveData,
                rtt: navigator.connection.rtt,
                downlink: navigator.connection.downlink
            };
        }
        return 'unknown';
    }

    // 生成指纹头部
    generateFingerprintHeaders() {
        if (!this.initialized) return {};

        const headers = {};

        // 屏幕信息头部
        const screenInfo = this.fingerprintInfo.screen;
        headers['X-Screen-Info'] = `${screenInfo.width}x${screenInfo.height}:${screenInfo.colorDepth}:${screenInfo.devicePixelRatio}`;

        // 时区头部
        const timezoneInfo = this.fingerprintInfo.timezone;
        headers['X-Timezone'] = timezoneInfo.timezone;
        headers['X-Timezone-Offset'] = timezoneInfo.offset.toString();

        // 硬件信息头部
        const hardwareInfo = this.fingerprintInfo.hardware;
        headers['X-Hardware-Concurrency'] = hardwareInfo.hardwareConcurrency.toString();
        if (hardwareInfo.deviceMemory !== 'unknown') {
            headers['X-Device-Memory'] = hardwareInfo.deviceMemory.toString();
        }

        // 特性支持头部
        const features = this.fingerprintInfo.features;
        const supportedFeatures = Object.keys(features).filter(key => features[key]);
        headers['X-Browser-Features'] = supportedFeatures.join(',');

        return headers;
    }

    // 发送指纹信息到后端
    sendFingerprintToBackend() {
        // 将指纹信息存储到localStorage，供后续请求使用
        localStorage.setItem('smartFingerprint', JSON.stringify({
            info: this.fingerprintInfo,
            timestamp: Date.now(),
            version: '2.0'
        }));
    }

    // 获取指纹信息用于API调用
    getFingerprintForAPI() {
        return this.generateFingerprintHeaders();
    }

    // 更新现有的fetch请求
    enhanceFetch(originalFetch) {
        const self = this;
        return function(url, options = {}) {
            // 添加指纹头部
            if (self.initialized) {
                const fingerprintHeaders = self.generateFingerprintHeaders();
                options.headers = {
                    ...options.headers,
                    ...fingerprintHeaders
                };
            }

            return originalFetch(url, options);
        };
    }
}

// 全局实例
let smartFingerprintClient = null;

// 初始化智能指纹客户端
function initSmartFingerprint() {
    if (!smartFingerprintClient) {
        smartFingerprintClient = new SmartFingerprintClient();
        
        // 增强全局fetch
        if (typeof window !== 'undefined' && window.fetch) {
            window.originalFetch = window.fetch;
            window.fetch = smartFingerprintClient.enhanceFetch(window.originalFetch);
        }
    }
    return smartFingerprintClient;
}

// 获取指纹信息的便捷函数
function getFingerprintHeaders() {
    if (!smartFingerprintClient) {
        initSmartFingerprint();
    }
    return smartFingerprintClient ? smartFingerprintClient.getFingerprintForAPI() : {};
}

// 手动发送指纹信息的函数
function sendFingerprintInfo(apiUrl, token) {
    if (!smartFingerprintClient) return;

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...smartFingerprintClient.generateFingerprintHeaders()
    };

    fetch(`${apiUrl}/fingerprint`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(smartFingerprintClient.fingerprintInfo)
    }).catch(error => {
        console.warn('[Smart Fingerprint] Send failed:', error);
    });
}

// 监听窗口变化，更新指纹信息
window.addEventListener('resize', () => {
    if (smartFingerprintClient) {
        smartFingerprintClient.collectFingerprint();
    }
});

// 监听网络状态变化
window.addEventListener('online', () => {
    if (smartFingerprintClient) {
        smartFingerprintClient.collectFingerprint();
    }
});

window.addEventListener('offline', () => {
    if (smartFingerprintClient) {
        smartFingerprintClient.collectFingerprint();
    }
});

// 导出全局函数
window.initSmartFingerprint = initSmartFingerprint;
window.getFingerprintHeaders = getFingerprintHeaders;
window.sendFingerprintInfo = sendFingerprintInfo;
window.SmartFingerprintClient = SmartFingerprintClient;

// 自动初始化
document.addEventListener('DOMContentLoaded', initSmartFingerprint);

// 如果XSS保护已加载，与其协同工作
if (window.xssProtection) {
    // 扩展XSS保护的安全Ajax方法
    const originalSafeAjax = window.xssProtection.safeAjax;
    window.xssProtection.safeAjax = function(options) {
        // 添加指纹头部
        const fingerprintHeaders = getFingerprintHeaders();
        options.headers = {
            ...options.headers,
            ...fingerprintHeaders
        };
        
        return originalSafeAjax.call(this, options);
    };
} 