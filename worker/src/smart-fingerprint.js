// 智能会话指纹验证系统
// 版本：v2.0 - 智能化、可配置、用户友好

export class SmartFingerprintValidator {
    constructor(env) {
        this.env = env;
        this.config = {
            // 指纹组件权重
            weights: {
                browser: 0.4,      // 浏览器类型权重
                language: 0.3,     // 语言设置权重
                timezone: 0.2,     // 时区权重
                screen: 0.1        // 屏幕分辨率权重
            },
            
            // 安全阈值
            thresholds: {
                safe: 0.8,         // 安全阈值：相似度 > 0.8 直接通过
                suspicious: 0.6,   // 可疑阈值：0.6-0.8 记录但通过
                dangerous: 0.4     // 危险阈值：< 0.4 拒绝访问
            },
            
            // 操作风险等级
            riskLevels: {
                low: ['GET:/content', 'GET:/images'],           // 低风险：查看内容
                medium: ['POST:/content', 'POST:/images'],       // 中风险：创建内容
                high: ['PUT:/content', 'DELETE:/content'],       // 高风险：修改删除
                critical: ['POST:/upload', 'DELETE:/images']     // 关键：文件操作
            },
            
            // 学习模式
            learningMode: true,    // 是否学习用户行为模式
            maxHistorySize: 10,    // 最大历史记录数
            
            // 响应策略
            responses: {
                log: true,         // 记录所有验证结果
                notify: true,      // 通知可疑活动
                block: true        // 阻止危险操作
            }
        };
    }

    // 生成智能指纹
    async generateSmartFingerprint(request) {
        const components = this.extractFingerprintComponents(request);
        
        return {
            id: await this.hashComponents(components),
            components: components,
            timestamp: Date.now(),
            metadata: {
                ip: request.headers.get('CF-Connecting-IP') || 'unknown',
                country: request.headers.get('CF-IPCountry') || 'unknown',
                ray: request.headers.get('CF-Ray') || 'unknown'
            }
        };
    }

    // 提取指纹组件
    extractFingerprintComponents(request) {
        const userAgent = request.headers.get('User-Agent') || '';
        const language = request.headers.get('Accept-Language') || '';
        
        return {
            // 浏览器信息（稳定部分）
            browser: this.normalizeBrowser(userAgent),
            
            // 语言设置
            language: this.normalizeLanguage(language),
            
            // 时区信息（从请求头推断）
            timezone: this.extractTimezone(request),
            
            // 屏幕信息（如果可用）
            screen: this.extractScreenInfo(request)
        };
    }

    // 标准化浏览器信息
    normalizeBrowser(userAgent) {
        // 提取浏览器类型和主版本号，忽略小版本
        const browsers = [
            { name: 'Chrome', pattern: /Chrome\/(\d+)/ },
            { name: 'Firefox', pattern: /Firefox\/(\d+)/ },
            { name: 'Safari', pattern: /Safari\/(\d+)/ },
            { name: 'Edge', pattern: /Edge\/(\d+)/ }
        ];

        for (const browser of browsers) {
            const match = userAgent.match(browser.pattern);
            if (match) {
                const majorVersion = Math.floor(parseInt(match[1]) / 10) * 10; // 取整到10
                return `${browser.name}/${majorVersion}`;
            }
        }

        return 'Unknown';
    }

    // 标准化语言设置
    normalizeLanguage(language) {
        if (!language) return 'unknown';
        
        // 只取主要语言，忽略地区变体
        const primaryLang = language.split(',')[0].split('-')[0];
        return primaryLang.toLowerCase();
    }

    // 提取时区信息
    extractTimezone(request) {
        // 从Cloudflare头部获取时区信息
        const timezone = request.headers.get('CF-Timezone') || 
                         request.headers.get('X-Timezone') || 
                         'unknown';
        return timezone;
    }

    // 提取屏幕信息
    extractScreenInfo(request) {
        // 从自定义头部获取屏幕信息（需要前端配合）
        const screenInfo = request.headers.get('X-Screen-Info') || 'unknown';
        return screenInfo;
    }

    // 计算指纹相似度
    calculateSimilarity(current, stored) {
        if (!current || !stored) return 0;

        let totalWeight = 0;
        let matchedWeight = 0;

        // 计算各组件相似度
        for (const [component, weight] of Object.entries(this.config.weights)) {
            totalWeight += weight;
            
            const currentValue = current.components[component];
            const storedValue = stored.components[component];
            
            if (currentValue === storedValue) {
                matchedWeight += weight;
            } else if (this.isPartialMatch(component, currentValue, storedValue)) {
                matchedWeight += weight * 0.5; // 部分匹配得一半分
            }
        }

        return matchedWeight / totalWeight;
    }

    // 部分匹配检查
    isPartialMatch(component, current, stored) {
        if (!current || !stored) return false;

        switch (component) {
            case 'browser':
                // 同品牌不同版本视为部分匹配
                return current.split('/')[0] === stored.split('/')[0];
            
            case 'language':
                // 同语言族视为部分匹配
                return current.substring(0, 2) === stored.substring(0, 2);
            
            default:
                return false;
        }
    }

    // 验证会话指纹
    async validateFingerprint(request, tokenData) {
        try {
            // 生成当前指纹
            const currentFingerprint = await this.generateSmartFingerprint(request);
            
            // 获取存储的指纹
            const storedFingerprint = tokenData.sessionFingerprint;
            
            if (!storedFingerprint) {
                return this.createResult('no_fingerprint', 1.0, 'No stored fingerprint');
            }

            // 计算相似度
            const similarity = this.calculateSimilarity(currentFingerprint, storedFingerprint);
            
            // 获取操作风险等级
            const riskLevel = this.getRiskLevel(request);
            
            // 做出决策
            const decision = this.makeDecision(similarity, riskLevel);
            
            // 学习用户行为
            if (this.config.learningMode) {
                await this.learnUserBehavior(tokenData.user, currentFingerprint, similarity);
            }

            // 记录验证结果
            await this.logValidation(request, tokenData, currentFingerprint, similarity, decision);

            return this.createResult(decision.action, similarity, decision.reason, decision.details);

        } catch (error) {
            console.error('Fingerprint validation error:', error);
            return this.createResult('error', 0, 'Validation failed', { error: error.message });
        }
    }

    // 获取操作风险等级
    getRiskLevel(request) {
        const method = request.method;
        const url = new URL(request.url);
        const path = url.pathname;
        const operation = `${method}:${path}`;

        for (const [level, operations] of Object.entries(this.config.riskLevels)) {
            if (operations.some(op => operation.includes(op))) {
                return level;
            }
        }

        return 'low'; // 默认低风险
    }

    // 智能决策
    makeDecision(similarity, riskLevel) {
        const thresholds = this.config.thresholds;
        
        // 根据风险等级调整阈值
        const adjustedThresholds = this.adjustThresholds(thresholds, riskLevel);

        if (similarity >= adjustedThresholds.safe) {
            return {
                action: 'allow',
                reason: 'High similarity, safe to proceed',
                details: { similarity, riskLevel, threshold: adjustedThresholds.safe }
            };
        }

        if (similarity >= adjustedThresholds.suspicious) {
            return {
                action: 'allow_with_warning',
                reason: 'Moderate similarity, proceed with caution',
                details: { similarity, riskLevel, threshold: adjustedThresholds.suspicious }
            };
        }

        if (similarity >= adjustedThresholds.dangerous) {
            return {
                action: riskLevel === 'critical' ? 'block' : 'allow_with_warning',
                reason: 'Low similarity, potential security risk',
                details: { similarity, riskLevel, threshold: adjustedThresholds.dangerous }
            };
        }

        return {
            action: 'block',
            reason: 'Very low similarity, likely session hijacking',
            details: { similarity, riskLevel, threshold: adjustedThresholds.dangerous }
        };
    }

    // 根据风险等级调整阈值
    adjustThresholds(base, riskLevel) {
        const adjustments = {
            low: { safe: -0.1, suspicious: -0.1, dangerous: -0.1 },
            medium: { safe: 0, suspicious: 0, dangerous: 0 },
            high: { safe: 0.1, suspicious: 0.1, dangerous: 0.1 },
            critical: { safe: 0.2, suspicious: 0.15, dangerous: 0.1 }
        };

        const adjustment = adjustments[riskLevel] || adjustments.medium;
        
        return {
            safe: Math.min(1.0, base.safe + adjustment.safe),
            suspicious: Math.min(1.0, base.suspicious + adjustment.suspicious),
            dangerous: Math.min(1.0, base.dangerous + adjustment.dangerous)
        };
    }

    // 学习用户行为
    async learnUserBehavior(username, fingerprint, similarity) {
        if (!this.config.learningMode) return;

        const key = `fingerprint_history:${username}`;
        const history = await this.env.AUTH_KV.get(key, 'json') || [];
        
        // 添加新记录
        history.push({
            fingerprint: fingerprint,
            similarity: similarity,
            timestamp: Date.now()
        });

        // 保持历史记录大小
        if (history.length > this.config.maxHistorySize) {
            history.shift();
        }

        await this.env.AUTH_KV.put(key, JSON.stringify(history), { expirationTtl: 2592000 }); // 30天
    }

    // 记录验证结果
    async logValidation(request, tokenData, fingerprint, similarity, decision) {
        if (!this.config.responses.log) return;

        const logEntry = {
            timestamp: Date.now(),
            user: tokenData.user,
            ip: request.headers.get('CF-Connecting-IP'),
            method: request.method,
            path: new URL(request.url).pathname,
            fingerprint: fingerprint,
            similarity: similarity,
            decision: decision,
            userAgent: request.headers.get('User-Agent')
        };

        // 存储到KV（可以考虑使用专门的日志服务）
        const logKey = `security_log:${Date.now()}:${crypto.randomUUID()}`;
        await this.env.AUTH_KV.put(logKey, JSON.stringify(logEntry), { expirationTtl: 604800 }); // 7天

        // 如果是可疑活动，发送通知
        if (decision.action === 'block' && this.config.responses.notify) {
            await this.notifySuspiciousActivity(logEntry);
        }
    }

    // 通知可疑活动
    async notifySuspiciousActivity(logEntry) {
        // 这里可以集成邮件、Slack、webhooks等通知方式
        console.warn('SECURITY ALERT: Suspicious activity detected', {
            user: logEntry.user,
            ip: logEntry.ip,
            similarity: logEntry.similarity,
            timestamp: new Date(logEntry.timestamp).toISOString()
        });

        // 存储到高优先级日志
        const alertKey = `security_alert:${Date.now()}`;
        await this.env.AUTH_KV.put(alertKey, JSON.stringify({
            type: 'fingerprint_mismatch',
            severity: 'high',
            ...logEntry
        }), { expirationTtl: 2592000 }); // 30天
    }

    // 创建验证结果
    createResult(action, similarity, reason, details = {}) {
        return {
            action,           // 'allow', 'allow_with_warning', 'block', 'error'
            similarity,       // 0-1 相似度分数
            reason,           // 决策原因
            details,          // 额外详情
            timestamp: Date.now()
        };
    }

    // 生成组件哈希
    async hashComponents(components) {
        const data = JSON.stringify(components);
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
        const hashArray = new Uint8Array(hashBuffer);
        return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
    }

    // 获取用户指纹历史
    async getUserFingerprintHistory(username) {
        const key = `fingerprint_history:${username}`;
        return await this.env.AUTH_KV.get(key, 'json') || [];
    }

    // 获取安全日志
    async getSecurityLogs(limit = 50) {
        // 这里需要实现日志查询功能
        // 由于KV的限制，可能需要使用其他存储方案
        return [];
    }
}

// 使用示例
export async function validateSessionWithSmartFingerprint(request, tokenData, env) {
    const validator = new SmartFingerprintValidator(env);
    const result = await validator.validateFingerprint(request, tokenData);
    
    switch (result.action) {
        case 'allow':
            return { success: true, warning: null };
        
        case 'allow_with_warning':
            return { 
                success: true, 
                warning: `Security notice: ${result.reason} (similarity: ${result.similarity.toFixed(2)})` 
            };
        
        case 'block':
            return { 
                success: false, 
                error: 'Session security validation failed',
                details: result.reason
            };
        
        case 'error':
            return { 
                success: false, 
                error: 'Session validation error',
                details: result.details
            };
        
        default:
            return { success: false, error: 'Unknown validation result' };
    }
} 