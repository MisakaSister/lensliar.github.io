// worker/src/file-validator.js

import { createError } from './error-handler.js';

// 文件类型魔数签名
const FILE_SIGNATURES = {
    // 图片格式
    'image/jpeg': [
        [0xFF, 0xD8, 0xFF],  // JPEG
        [0xFF, 0xD8, 0xFF, 0xE0],  // JPEG/JFIF
        [0xFF, 0xD8, 0xFF, 0xE1],  // JPEG/EXIF
        [0xFF, 0xD8, 0xFF, 0xE8],  // JPEG/SPIFF
    ],
    'image/png': [
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]  // PNG
    ],
    'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],  // GIF87a
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]   // GIF89a
    ],
    'image/webp': [
        [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]  // RIFF....WEBP
    ],
    'image/bmp': [
        [0x42, 0x4D]  // BM
    ],
    'image/tiff': [
        [0x49, 0x49, 0x2A, 0x00],  // TIFF little-endian
        [0x4D, 0x4D, 0x00, 0x2A]   // TIFF big-endian
    ],
    'image/svg+xml': [
        [0x3C, 0x73, 0x76, 0x67]  // <svg
    ]
};

// 允许的文件类型和大小限制
const FILE_LIMITS = {
    'image/jpeg': { maxSize: 10 * 1024 * 1024, minSize: 100 }, // 10MB
    'image/png': { maxSize: 10 * 1024 * 1024, minSize: 100 },  // 10MB
    'image/gif': { maxSize: 5 * 1024 * 1024, minSize: 100 },   // 5MB
    'image/webp': { maxSize: 10 * 1024 * 1024, minSize: 100 }, // 10MB
    'image/bmp': { maxSize: 20 * 1024 * 1024, minSize: 100 },  // 20MB
    'image/tiff': { maxSize: 20 * 1024 * 1024, minSize: 100 }, // 20MB
    'image/svg+xml': { maxSize: 1 * 1024 * 1024, minSize: 10 } // 1MB
};

// 危险文件扩展名
const DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.vbe', '.js', '.jse',
    '.wsh', '.wsf', '.wsc', '.msi', '.msp', '.dll', '.app', '.deb', '.rpm',
    '.dmg', '.pkg', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1'
];

// 检查文件扩展名
function checkFileExtension(filename) {
    if (!filename || typeof filename !== 'string') {
        return false;
    }
    
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return !DANGEROUS_EXTENSIONS.includes(ext);
}

// 读取文件头部字节
function readFileHeader(buffer, length = 12) {
    const bytes = new Uint8Array(buffer.slice(0, length));
    return Array.from(bytes);
}

// 检查文件签名
function checkFileSignature(buffer, mimeType) {
    const signatures = FILE_SIGNATURES[mimeType];
    if (!signatures) {
        return false;
    }
    
    const header = readFileHeader(buffer);
    
    return signatures.some(signature => {
        return signature.every((byte, index) => {
            return byte === null || header[index] === byte;
        });
    });
}

// 验证图片文件
export function validateImageFile(file, mimeType) {
    // 检查文件名
    if (!checkFileExtension(file.name)) {
        throw createError('VALIDATION_ERROR', 'Invalid file extension');
    }
    
    // 检查MIME类型
    if (!FILE_LIMITS[mimeType]) {
        throw createError('VALIDATION_ERROR', 'Unsupported file type');
    }
    
    // 检查文件大小
    const limits = FILE_LIMITS[mimeType];
    if (file.size > limits.maxSize) {
        throw createError('VALIDATION_ERROR', `File size too large. Maximum: ${Math.round(limits.maxSize / 1024 / 1024)}MB`);
    }
    
    if (file.size < limits.minSize) {
        throw createError('VALIDATION_ERROR', `File size too small. Minimum: ${limits.minSize} bytes`);
    }
    
    return true;
}

// 验证文件内容
export async function validateFileContent(file, declaredMimeType) {
    try {
        // 读取文件内容
        const buffer = await file.arrayBuffer();
        
        // 验证文件签名
        if (!checkFileSignature(buffer, declaredMimeType)) {
            throw createError('VALIDATION_ERROR', 'File content does not match declared type');
        }
        
        // 特殊检查SVG文件
        if (declaredMimeType === 'image/svg+xml') {
            const content = new TextDecoder().decode(buffer);
            if (!validateSVGContent(content)) {
                throw createError('VALIDATION_ERROR', 'Invalid or potentially dangerous SVG content');
            }
        }
        
        return true;
        
    } catch (error) {
        if (error.code === 'VALIDATION_ERROR') {
            throw error;
        }
        throw createError('VALIDATION_ERROR', 'Failed to validate file content');
    }
}

// 验证SVG内容
function validateSVGContent(content) {
    // 检查是否包含危险标签或属性
    const dangerousPatterns = [
        /<script[^>]*>/i,
        /<iframe[^>]*>/i,
        /<object[^>]*>/i,
        /<embed[^>]*>/i,
        /<link[^>]*>/i,
        /<meta[^>]*>/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /<foreignobject[^>]*>/i,
        /<use[^>]*href\s*=\s*["']data:/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(content));
}

// 验证文件名
export function validateFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        throw createError('VALIDATION_ERROR', 'Invalid filename');
    }
    
    // 检查文件名长度
    if (filename.length > 255) {
        throw createError('VALIDATION_ERROR', 'Filename too long');
    }
    
    // 检查是否包含危险字符
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) {
        throw createError('VALIDATION_ERROR', 'Filename contains invalid characters');
    }
    
    // 检查是否为保留名称
    const reservedNames = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.') || filename.length);
    if (reservedNames.includes(nameWithoutExt.toUpperCase())) {
        throw createError('VALIDATION_ERROR', 'Filename is reserved');
    }
    
    return true;
}

// 生成安全的文件名
export function generateSafeFilename(originalName) {
    if (!originalName) {
        return `file_${Date.now()}.tmp`;
    }
    
    // 移除危险字符
    let safeName = originalName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    
    // 限制长度
    if (safeName.length > 255) {
        const ext = safeName.substring(safeName.lastIndexOf('.'));
        const nameWithoutExt = safeName.substring(0, safeName.lastIndexOf('.'));
        safeName = nameWithoutExt.substring(0, 255 - ext.length) + ext;
    }
    
    // 添加时间戳以避免重复
    const timestamp = Date.now();
    const ext = safeName.substring(safeName.lastIndexOf('.'));
    const nameWithoutExt = safeName.substring(0, safeName.lastIndexOf('.'));
    
    return `${nameWithoutExt}_${timestamp}${ext}`;
}

// 验证文件完整性
export function validateFileIntegrity(file, expectedSize, expectedHash = null) {
    if (file.size !== expectedSize) {
        throw createError('VALIDATION_ERROR', 'File size mismatch');
    }
    
    // 如果提供了期望的哈希值，可以进行进一步验证
    if (expectedHash) {
        // 这里可以添加哈希验证逻辑
        // 由于在Worker环境中计算大文件哈希可能会影响性能，
        // 通常在客户端计算哈希并传递给服务器
    }
    
    return true;
}

// 检查文件是否为空
export function isEmptyFile(file) {
    return file.size === 0;
}

// 获取文件基本信息
export function getFileInfo(file) {
    const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
    
    return {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: ext,
        lastModified: file.lastModified || Date.now(),
        isImage: file.type.startsWith('image/'),
        isSupported: !!FILE_LIMITS[file.type]
    };
}

// 批量验证文件
export async function validateFiles(files, options = {}) {
    const results = [];
    const maxFiles = options.maxFiles || 10;
    const maxTotalSize = options.maxTotalSize || 50 * 1024 * 1024; // 50MB
    
    if (files.length > maxFiles) {
        throw createError('VALIDATION_ERROR', `Too many files. Maximum: ${maxFiles}`);
    }
    
    let totalSize = 0;
    
    for (const file of files) {
        totalSize += file.size;
        
        if (totalSize > maxTotalSize) {
            throw createError('VALIDATION_ERROR', `Total file size too large. Maximum: ${Math.round(maxTotalSize / 1024 / 1024)}MB`);
        }
        
        try {
            validateFilename(file.name);
            validateImageFile(file, file.type);
            await validateFileContent(file, file.type);
            
            results.push({
                filename: file.name,
                valid: true,
                info: getFileInfo(file)
            });
        } catch (error) {
            results.push({
                filename: file.name,
                valid: false,
                error: error.message,
                info: getFileInfo(file)
            });
        }
    }
    
    return results;
}

// 获取支持的文件类型
export function getSupportedFileTypes() {
    return Object.keys(FILE_LIMITS);
}

// 获取文件类型限制
export function getFileTypeLimits(mimeType) {
    return FILE_LIMITS[mimeType] || null;
} 