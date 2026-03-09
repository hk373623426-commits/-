const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieSession = require('cookie-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 使用 cookie-session（无状态，适合 Serverless）
app.use(cookieSession({
  name: 'jingtian_session',
  keys: [process.env.SESSION_SECRET || 'jingtian-water-secret-key-2024'],
  maxAge: 24 * 60 * 60 * 1000, // 24 小时
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
}));

// 兼容性：支持 req.session.user
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
});

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Vercel 环境优化：使用临时目录存储数据库
// Vercel 环境中，/var/task 是只读的，必须使用 /tmp
const isVercel = !!process.env.VERCEL;

// Vercel 环境下强制使用 /tmp，忽略 .env 中的 DB_PATH 配置
if (isVercel) {
  process.env.DB_PATH = '/tmp/jingtian.db';
  process.env.NODE_ENV = 'production';
} else {
  // 本地开发环境才使用 .env 中的配置
  process.env.DB_PATH = process.env.DB_PATH || './database/jingtian.db';
}

// 数据库初始化（延迟初始化，确保 Vercel 环境正确）
const db = require('./config/database');
if (isVercel) {
  // Vercel 每次请求都需要重新初始化
  db.initializeDatabase();
} else {
  db.initializeDatabase();
}

// 路由
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).render('frontend/404', {
    title: '页面未找到',
    user: req.session.user
  });
});

// Vercel 导出
module.exports = app;

// 本地运行时启动服务器
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`景田天然矿泉水网站运行在 http://localhost:${PORT}`);
    console.log(`后台管理地址：http://localhost:${PORT}/admin/login`);
    console.log(`网络访问地址：http://127.0.0.1:${PORT}`);
  });
}
