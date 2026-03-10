const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/images/products');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件（JPG、PNG、GIF、WebP）'));
    }
  }
});

// 中间件：检查管理员权限
const requireAdmin = (req, res, next) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.redirect('/auth/login');
  }
  next();
};

// 后台登录页面
router.get('/login', (req, res) => {
  if (req.session.user && req.session.user.is_admin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', {
    title: '后台登录',
    layout: false
  });
});

// 后台登录处理
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证输入
    if (!email || !password) {
      return res.render('admin/login', {
        title: '后台登录',
        layout: false,
        message: {
          type: 'danger',
          text: '请输入邮箱和密码'
        }
      });
    }

    console.log('[Admin Login] 尝试登录:', email);

    // 确保管理员账号存在（Vercel Serverless 每次请求都可能重置数据库）
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@jingtian.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // 检查是否存在管理员账号
    let adminUser = await db.get('SELECT * FROM users WHERE email = ? AND is_admin = 1', [adminEmail]);

    if (!adminUser) {
      console.log('[Admin Login] 管理员账号不存在，创建默认管理员账号');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await db.run(
        'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
        ['admin', adminEmail, hashedPassword, 1]
      );
      adminUser = await db.get('SELECT * FROM users WHERE email = ? AND is_admin = 1', [adminEmail]);
      console.log('[Admin Login] 管理员账号创建成功:', adminEmail);
    }

    // 查找登录用户
    const user = await db.get(
      'SELECT * FROM users WHERE email = ? AND is_admin = 1',
      [email]
    );

    console.log('[Admin Login] 查询结果:', user ? '找到用户' : '未找到用户');

    if (!user) {
      console.log('[Admin Login] 管理员账户不存在:', email);
      return res.render('admin/login', {
        title: '后台登录',
        layout: false,
        message: {
          type: 'danger',
          text: '管理员账户不存在'
        }
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('[Admin Login] 密码验证:', isValidPassword ? '成功' : '失败');

    if (!isValidPassword) {
      return res.render('admin/login', {
        title: '后台登录',
        layout: false,
        message: {
          type: 'danger',
          text: '密码错误'
        }
      });
    }

    // 设置会话
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin
    };

    console.log('[Admin Login] 登录成功，设置 session:', req.session.user);
    res.redirect('/admin/dashboard');

  } catch (error) {
    console.error('后台登录失败:', error);
    res.render('admin/login', {
      title: '后台登录',
      layout: false,
      message: {
        type: 'danger',
        text: '登录失败，请稍后重试'
      }
    });
  }
});

// 仪表盘
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // 获取统计数据
    const stats = {
      totalOrders: 0,
      totalUsers: 0,
      totalProducts: 0,
      totalRevenue: 0,
      orderStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0
      }
    };

    // 获取订单统计
    const orderStats = await db.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as revenue
      FROM orders
    `);

    if (orderStats[0]) {
      stats.totalOrders = orderStats[0].total_orders || 0;
      stats.orderStatus.pending = orderStats[0].pending || 0;
      stats.orderStatus.processing = orderStats[0].processing || 0;
      stats.orderStatus.completed = orderStats[0].completed || 0;
      stats.orderStatus.cancelled = orderStats[0].cancelled || 0;
      stats.totalRevenue = orderStats[0].revenue || 0;
    }

    // 获取用户统计
    const userStats = await db.query('SELECT COUNT(*) as total FROM users');
    stats.totalUsers = userStats[0]?.total || 0;

    // 获取产品统计
    const productStats = await db.query('SELECT COUNT(*) as total FROM products WHERE is_active = 1');
    stats.totalProducts = productStats[0]?.total || 0;

    // 获取最近订单
    const recentOrders = await db.query(`
      SELECT o.*, u.username
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // 获取月度收入
    const monthlyRevenue = await db.query(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        SUM(total_amount) as revenue
      FROM orders
      WHERE status = 'completed'
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 6
    `);

    // 获取热门产品
    const topProducts = await db.query(`
      SELECT
        p.id,
        p.name,
        p.price,
        SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      GROUP BY p.id, p.name, p.price
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    res.render('admin/dashboard', {
      title: '仪表盘',
      currentPage: 'dashboard',
      user: req.session.user,
      stats: stats,
      recentOrders: recentOrders,
      monthlyRevenue: {
        labels: monthlyRevenue.map(item => item.month),
        data: monthlyRevenue.map(item => item.revenue || 0)
      },
      topProducts: topProducts
    });

  } catch (error) {
    console.error('加载仪表盘失败:', error);
    res.status(500).render('admin/error', {
      title: '服务器错误',
      currentPage: 'dashboard',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 订单管理
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    // 获取订单总数
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // 获取订单列表
    const orders = await db.query(`
      SELECT o.*, u.username, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // 获取订单状态统计
    const statusStats = await db.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    res.render('admin/orders/list', {
      title: '订单管理',
      currentPage: 'orders',
      user: req.session.user,
      orders: orders,
      status: status || 'all',
      statusStats: statusStats,
      currentPageNum: parseInt(page),
      totalPages: totalPages
    });

  } catch (error) {
    console.error('加载订单管理失败:', error);
    res.status(500).render('admin/error', {
      title: '服务器错误',
      currentPage: 'orders',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 订单详情
router.get('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;

    // 获取订单信息
    const order = await db.get(`
      SELECT o.*, u.username, u.email, u.phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId]);

    if (!order) {
      return res.status(404).render('admin/404', {
        title: '订单不存在',
        currentPage: 'orders',
        user: req.session.user
      });
    }

    // 获取订单商品
    const orderItems = await db.query(`
      SELECT oi.*, p.name, p.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    res.render('admin/orders/detail', {
      title: '订单详情',
      currentPage: 'orders',
      user: req.session.user,
      order: order,
      orderItems: orderItems
    });

  } catch (error) {
    console.error('加载订单详情失败:', error);
    res.status(500).render('admin/error', {
      title: '服务器错误',
      currentPage: 'orders',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 更新订单状态
router.post('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.json({
        success: false,
        message: '无效的订单状态'
      });
    }

    await db.run(
      'UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?',
      [status, orderId]
    );

    res.json({
      success: true,
      message: '订单状态已更新'
    });

  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.json({
      success: false,
      message: '更新失败，请稍后重试'
    });
  }
});

// 产品管理
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 获取产品总数
    const countResult = await db.query('SELECT COUNT(*) as total FROM products');
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // 获取产品列表
    const products = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    // 获取分类
    const categories = await db.query('SELECT * FROM categories ORDER BY name');

    res.render('admin/products/list', {
      title: '产品管理',
      currentPage: 'products',
      user: req.session.user,
      products: products,
      categories: categories,
      currentPageNum: parseInt(page),
      totalPages: totalPages
    });

  } catch (error) {
    console.error('加载产品管理失败:', error);
    res.status(500).render('admin/error', {
      title: '服务器错误',
      currentPage: 'products',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 添加产品页面
router.get('/products/new', requireAdmin, async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM categories ORDER BY name');

    res.render('admin/products/form', {
      title: '添加产品',
      currentPage: 'products',
      user: req.session.user,
      product: null,
      categories: categories,
      action: '/admin/products'
    });

  } catch (error) {
    console.error('加载添加产品页面失败:', error);
    res.status(500).render('admin/error', {
      title: '服务器错误',
      currentPage: 'products',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 编辑产品页面
router.get('/products/:id/edit', requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (!product) {
      return res.status(404).render('admin/404', {
        title: '产品不存在',
        currentPage: 'products',
        user: req.session.user
      });
    }

    const categories = await db.query('SELECT * FROM categories ORDER BY name');

    res.render('admin/products/form', {
      title: '编辑产品',
      currentPage: 'products',
      user: req.session.user,
      product: product,
      categories: categories,
      action: `/admin/products/${productId}`
    });

  } catch (error) {
    console.error('加载编辑产品页面失败:', error);
    res.status(500).render('admin/error', {
      title: '服务器错误',
      currentPage: 'products',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 添加/更新产品
router.post('/products/:id?', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category_id, stock, is_active } = req.body;
    const productId = req.params.id;
    let imageUrl = req.body.existing_image_url || '';

    // 处理新上传的图片
    if (req.file) {
      imageUrl = `/images/products/${req.file.filename}`;
      console.log('[Product Save] 图片上传成功:', imageUrl);
    }

    // 验证输入
    if (!name || !price) {
      req.session.message = {
        type: 'danger',
        text: '产品名称和价格不能为空'
      };
      return res.redirect(productId ? `/admin/products/${productId}/edit` : '/admin/products/new');
    }

    if (productId) {
      // 更新产品
      await db.run(
        `UPDATE products SET
          name = ?, description = ?, price = ?, category_id = ?,
          stock = ?, is_active = ?, image_url = ?, updated_at = datetime("now")
         WHERE id = ?`,
        [name, description || null, price, category_id || null, stock || 0, is_active ? 1 : 0, imageUrl, productId]
      );

      req.session.message = {
        type: 'success',
        text: '产品更新成功'
      };
    } else {
      // 添加产品
      await db.run(
        `INSERT INTO products (
          name, description, price, category_id, stock, is_active, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, description || null, price, category_id || null, stock || 0, is_active ? 1 : 0, imageUrl]
      );

      req.session.message = {
        type: 'success',
        text: '产品添加成功'
      };
    }

    res.redirect('/admin/products');

  } catch (error) {
    console.error('保存产品失败:', error);
    req.session.message = {
      type: 'danger',
      text: '保存失败，请稍后重试'
    };
    res.redirect(productId ? `/admin/products/${productId}/edit` : '/admin/products/new');
  }
});

// 删除产品
router.post('/products/:id/delete', requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;

    // 检查产品是否有订单
    const orderItems = await db.query(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
      [productId]
    );

    if (orderItems[0]?.count > 0) {
      // 如果有订单，则禁用产品而不是删除
      await db.run(
        'UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?',
        [productId]
      );

      req.session.message = {
        type: 'warning',
        text: '产品已被禁用（存在相关订单）'
      };
    } else {
      // 删除产品
      await db.run('DELETE FROM products WHERE id = ?', [productId]);

      req.session.message = {
        type: 'success',
        text: '产品删除成功'
      };
    }

    res.redirect('/admin/products');

  } catch (error) {
    console.error('删除产品失败:', error);
    req.session.message = {
      type: 'danger',
      text: '删除失败，请稍后重试'
    };
    res.redirect('/admin/products');
  }
});

// 用户管理
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 获取用户总数
    const countResult = await db.query('SELECT COUNT(*) as total FROM users');
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // 获取用户列表
    const users = await db.query(`
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    res.render('admin/users/list', {
      title: '用户管理',
      currentPage: 'users',
      user: req.session.user,
      users: users,
      currentPageNum: parseInt(page),
      totalPages: totalPages
    });

  } catch (error) {
    console.error('加载用户管理失败:', error);
    res.status(500).render('admin/error', {
      title: '服务器错误',
      currentPage: 'users',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 分类管理
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const categories = await db.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.name
    `);

    res.render('admin/categories/list', {
      title: '分类管理',
      currentPage: 'categories',
      user: req.session.user,
      categories: categories
    });

  } catch (error) {
    console.error('加载分类管理失败:', error);
    res.status(500).render('admin/error', {
      title: '服务器错误',
      currentPage: 'categories',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 系统设置
router.get('/settings', requireAdmin, (req, res) => {
  res.render('admin/settings', {
    title: '系统设置',
    currentPage: 'settings',
    user: req.session.user
  });
});

module.exports = router;