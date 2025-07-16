-- 初始化分类数据

-- 文章分类
INSERT OR IGNORE INTO article_categories (id, name, description, color, sort_order, created_at, updated_at) VALUES
('cat_article_1', '技术分享', '技术相关文章', '#007bff', 1, datetime('now'), datetime('now')),
('cat_article_2', '生活随笔', '日常生活感悟', '#28a745', 2, datetime('now'), datetime('now')),
('cat_article_3', '学习笔记', '学习心得和笔记', '#ffc107', 3, datetime('now'), datetime('now')),
('cat_article_4', '项目展示', '项目介绍和展示', '#dc3545', 4, datetime('now'), datetime('now'));

-- 相册分类
INSERT OR IGNORE INTO album_categories (id, name, description, color, sort_order, created_at, updated_at) VALUES
('cat_album_1', '风景摄影', '自然风景照片', '#28a745', 1, datetime('now'), datetime('now')),
('cat_album_2', '人像摄影', '人物肖像照片', '#007bff', 2, datetime('now'), datetime('now')),
('cat_album_3', '美食摄影', '美食和料理照片', '#ffc107', 3, datetime('now'), datetime('now')),
('cat_album_4', '旅行记录', '旅行中的照片', '#dc3545', 4, datetime('now'), datetime('now')),
('cat_album_5', '工作日常', '工作相关照片', '#6c757d', 5, datetime('now'), datetime('now')); 