// seo-config.js - SEO配置文件

const SEO_CONFIG = {
    // 网站基本信息
    site: {
        name: '创作空间',
        url: 'https://wengguodong.com',
        logo: 'https://wengguodong.com/assets/logo/ed3ac818-534b-4963-b114-b814a0a43304%20(1).png',
        description: '创作空间是一个专注于内容创作和分享的平台，提供精选文章、精美相册，激发创意思维，记录美好瞬间。'
    },
    
    // 页面SEO配置
    pages: {
        home: {
            title: '创作空间 - 探索精彩内容，分享创意灵感',
            description: '创作空间是一个专注于内容创作和分享的平台，提供精选文章、精美相册，激发创意思维，记录美好瞬间。',
            keywords: '创作空间,内容创作,文章分享,相册展示,创意灵感,视觉艺术',
            priority: 1.0,
            changefreq: 'weekly'
        },
        articles: {
            title: '文章精选 - 创作空间 | 发现精彩内容，启发创意思维',
            description: '浏览创作空间精选文章，涵盖各种主题和分类，发现优质内容，启发创意思维，提升知识储备。',
            keywords: '文章精选,内容创作,知识分享,创意思维,阅读推荐,创作空间',
            priority: 0.9,
            changefreq: 'daily'
        },
        albums: {
            title: '相册集锦 - 创作空间 | 记录美好瞬间，分享视觉盛宴',
            description: '浏览创作空间精美相册，记录美好瞬间，分享视觉盛宴，感受艺术魅力，激发创作灵感。',
            keywords: '相册集锦,视觉艺术,图片展示,美好瞬间,艺术创作,创作空间',
            priority: 0.9,
            changefreq: 'daily'
        }
    },
    
    // 分类SEO配置
    categories: {
        'cat_article_1': {
            name: '技术分享',
            description: '技术文章分享，涵盖编程、开发、设计等领域的专业知识和经验分享。',
            keywords: '技术分享,编程开发,设计经验,技术文章'
        },
        'cat_article_2': {
            name: '生活随笔',
            description: '生活感悟和随笔，记录日常生活中的思考和感悟，分享人生智慧。',
            keywords: '生活随笔,人生感悟,生活思考,随笔文章'
        },
        'cat_article_3': {
            name: '学习笔记',
            description: '学习过程中的笔记和总结，分享学习方法和知识要点。',
            keywords: '学习笔记,学习方法,知识总结,学习经验'
        },
        'cat_article_4': {
            name: '项目展示',
            description: '个人或团队项目的展示和介绍，分享项目经验和成果。',
            keywords: '项目展示,项目经验,作品展示,项目介绍'
        },
        'cat_album_1': {
            name: '风景摄影',
            description: '自然风景摄影作品，展现大自然的美丽和壮观。',
            keywords: '风景摄影,自然风光,摄影作品,风景图片'
        },
        'cat_album_2': {
            name: '人像摄影',
            description: '人像摄影作品，捕捉人物的表情和情感瞬间。',
            keywords: '人像摄影,人物写真,表情捕捉,人像作品'
        },
        'cat_album_3': {
            name: '美食摄影',
            description: '美食摄影作品，展现食物的美感和诱人之处。',
            keywords: '美食摄影,食物图片,美食展示,摄影艺术'
        },
        'cat_album_4': {
            name: '旅行记录',
            description: '旅行过程中的摄影记录，分享旅途中的美好瞬间。',
            keywords: '旅行记录,旅行摄影,旅途瞬间,旅行分享'
        },
        'cat_album_5': {
            name: '工作日常',
            description: '工作场景和日常工作的摄影记录，展现工作生活的真实状态。',
            keywords: '工作日常,工作场景,职场生活,工作记录'
        }
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEO_CONFIG;
}
