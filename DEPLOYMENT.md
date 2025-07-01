# 📋 部署指南 - 静态内容管理系统

## 🏗️ **系统架构**

```
用户界面 (GitHub Pages) ↔ Cloudflare Worker (API) ↔ 存储 (KV + R2)
```

- **前端**: GitHub Pages 托管静态网站
- **后端**: Cloudflare Worker 提供API服务
- **存储**: KV存储(内容数据) + R2存储(图片文件)

## 📝 **完整功能流程**

### **图片上传和保存流程**
```
1. 用户在admin页面选择图片 
2. 前端调用 POST /upload 
3. Worker验证权限和文件
4. 文件保存到R2存储桶
5. 返回公开访问URL
6. 前端将URL包含在内容数据中
7. 调用 POST /content 保存整个内容结构
8. Worker将内容数据保存到KV存储
```

### **内容读取和展示流程**
```
1. 用户访问index页面
2. 前端调用 GET /content
3. Worker从KV存储获取内容数据
4. 返回包含图片URL的内容结构
5. 前端渲染文章和图片（图片直接从R2 CDN加载）
```

## 🔧 **部署步骤**

### **1. Cloudflare配置**

#### **创建R2存储桶**
```bash
# 使用Cloudflare Dashboard或wrangler CLI
wrangler r2 bucket create lensliar-images
```

#### **创建KV命名空间**
```bash
wrangler kv:namespace create "CONTENT_KV"
wrangler kv:namespace create "AUTH_KV"
```

#### **设置环境变量**
在Cloudflare Dashboard中设置以下Secrets：
- `SECRET_ADMIN_USERNAME`: 管理员用户名
- `SECRET_ADMIN_PASSWORD_HASH`: 加密后的密码哈希
- `SECRET_PEPPER`: 密码加盐字符串

### **2. 更新Worker配置**

使用 `worker/wrangler.toml` 的配置（已更新），包含：
- KV命名空间绑定
- R2存储桶绑定  
- 环境变量配置

### **3. 部署Worker**
```bash
cd worker
wrangler deploy
```

### **4. 配置自定义域名**

#### **API域名** (worker.wengguodong.com)
- 在Cloudflare Dashboard中添加Worker自定义域名
- 确保API_BASE在前端指向正确的域名

#### **图片CDN域名** (images.wengguodong.com)  
- 为R2存储桶配置自定义域名
- 在upload.js中更新imageUrl构造逻辑

### **5. 部署前端**
```bash
# GitHub Pages会自动部署public/目录
git push origin main
```

## 📊 **数据结构**

### **KV存储结构** (CONTENT_KV)
```json
{
  "articles": [
    {
      "id": 1640995200000,
      "title": "文章标题",
      "content": "文章内容",
      "category": "分类",
      "image": "https://images.wengguodong.com/images/1640995200000-abc123.jpg",
      "date": "2021-12-31"
    }
  ],
  "images": [
    {
      "id": 1640995200000,
      "title": "图片标题", 
      "category": "分类",
      "url": "https://images.wengguodong.com/images/1640995200000-def456.jpg",
      "description": "图片描述",
      "date": "2021-12-31",
      "source": "upload"
    }
  ]
}
```

### **R2存储结构**
```
lensliar-images/
├── images/
│   ├── 1640995200000-abc123.jpg
│   ├── 1640995200000-def456.png
│   └── ...
```

## 🔐 **安全配置**

### **密码哈希生成**
```javascript
import bcrypt from 'bcryptjs';

const password = "your-admin-password";
const pepper = "your-secret-pepper";
const saltedPassword = password + pepper;
const hash = await bcrypt.hash(saltedPassword, 10);

console.log("设置以下环境变量:");
console.log("SECRET_ADMIN_PASSWORD_HASH =", hash);
console.log("SECRET_PEPPER =", pepper);
```

### **CORS配置**
确保 `ALLOWED_ORIGINS` 包含你的域名：
```
ALLOWED_ORIGINS = "https://wengguodong.com,https://www.wengguodong.com"
```

## 🚀 **API端点**

- `POST /auth/login` - 管理员登录
- `GET /content` - 获取内容数据  
- `POST /content` - 保存内容数据（需要认证）
- `POST /upload` - 上传图片文件（需要认证）

## 🔍 **测试验证**

### **1. 测试登录**
```bash
curl -X POST https://worker.wengguodong.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

### **2. 测试内容获取**
```bash
curl https://worker.wengguodong.com/content
```

### **3. 测试图片上传**
```bash
curl -X POST https://worker.wengguodong.com/upload \
  -H "Authorization: Bearer YOUR-TOKEN" \
  -F "file=@test-image.jpg"
```

## 📈 **性能优化**

- **CDN缓存**: R2图片自动通过Cloudflare CDN分发
- **浏览器缓存**: 图片设置1年缓存策略
- **压缩**: Cloudflare自动压缩静态资源
- **HTTP/2**: 支持多路复用加速加载

## 🐛 **故障排除**

### **常见问题**
1. **上传失败**: 检查R2存储桶配置和权限
2. **认证失败**: 验证环境变量和密码哈希
3. **CORS错误**: 确认ALLOWED_ORIGINS配置
4. **图片无法显示**: 检查自定义域名配置

### **调试工具**
- Cloudflare Workers日志
- 浏览器开发者工具
- wrangler tail (实时日志)

## 💡 **扩展建议**

- 添加图片压缩和缩略图生成
- 实现批量上传功能
- 添加内容搜索和分类过滤
- 集成富文本编辑器
- 添加访问统计和分析 