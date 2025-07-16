-- D1数据库表结构

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category TEXT DEFAULT '',
    tags TEXT DEFAULT '[]', -- JSON数组
    cover_image TEXT DEFAULT 'null', -- JSON对象
    images TEXT DEFAULT '[]', -- JSON数组
    attachments TEXT DEFAULT '[]', -- JSON数组
    author TEXT DEFAULT 'Admin',
    status TEXT DEFAULT 'published',
    visibility TEXT DEFAULT 'public',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT,
    seo_meta_title TEXT,
    seo_meta_description TEXT,
    seo_keywords TEXT DEFAULT '[]', -- JSON数组
    seo_slug TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0
);

-- 相册表
CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT '默认分类',
    tags TEXT DEFAULT '[]', -- JSON数组
    images TEXT DEFAULT '[]', -- JSON数组
    image_count INTEGER DEFAULT 0,
    cover_image TEXT DEFAULT 'null', -- JSON对象
    uploaded_by TEXT DEFAULT 'admin',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 文章分类表
CREATE TABLE IF NOT EXISTS article_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#007bff',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 相册分类表
CREATE TABLE IF NOT EXISTS album_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#28a745',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_articles_status_visibility ON articles(status, visibility);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_category ON albums(category);
CREATE INDEX IF NOT EXISTS idx_article_categories_sort ON article_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_album_categories_sort ON album_categories(sort_order); 