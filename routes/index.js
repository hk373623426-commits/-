const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 首页
router.get('/', async (req, res) => {
  try {
    // 获取热门产品
    const products = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.created_at DESC
      LIMIT 8
    `);

    // 获取购物车数量
    let cartCount = 0;
    if (req.session.user) {
      const cart = await db.query(
        'SELECT SUM(quantity) as total FROM cart WHERE user_id = ?',
        [req.session.user.id]
      );
      cartCount = cart[0]?.total || 0;
    }

    res.render('frontend/index', {
      title: '首页',
      user: req.session.user,
      products: products,
      cartCount: cartCount
    });
  } catch (error) {
    console.error('首页加载失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 产品列表页
router.get('/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12, sort = 'newest' } = req.query;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = 'WHERE p.is_active = 1';
    const params = [];

    if (category) {
      whereClause += ' AND p.category_id = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 构建排序
    let orderBy = 'ORDER BY p.created_at DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
        orderBy = 'ORDER BY p.price DESC';
        break;
      case 'name':
        orderBy = 'ORDER BY p.name ASC';
        break;
    }

    // 获取产品总数
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // 获取产品列表
    const products = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // 获取分类
    const categories = await db.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.name
    `);

    // 获取购物车数量
    let cartCount = 0;
    if (req.session.user) {
      const cart = await db.query(
        'SELECT SUM(quantity) as total FROM cart WHERE user_id = ?',
        [req.session.user.id]
      );
      cartCount = cart[0]?.total || 0;
    }

    res.render('frontend/products', {
      title: '产品中心',
      user: req.session.user,
      products: products,
      categories: categories,
      cartCount: cartCount,
      categoryId: category,
      currentPage: parseInt(page),
      totalPages: totalPages,
      search: search,
      sort: sort
    });
  } catch (error) {
    console.error('产品列表加载失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 产品详情页
router.get('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await db.get(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1
    `, [productId]);

    if (!product) {
      return res.status(404).render('frontend/404', {
        title: '产品不存在',
        user: req.session.user
      });
    }

    // 获取相关产品
    const relatedProducts = await db.query(`
      SELECT * FROM products
      WHERE category_id = ? AND id != ? AND is_active = 1
      ORDER BY RANDOM()
      LIMIT 4
    `, [product.category_id, productId]);

    // 获取购物车数量
    let cartCount = 0;
    if (req.session.user) {
      const cart = await db.query(
        'SELECT SUM(quantity) as total FROM cart WHERE user_id = ?',
        [req.session.user.id]
      );
      cartCount = cart[0]?.total || 0;
    }

    res.render('frontend/product-detail', {
      title: product.name,
      user: req.session.user,
      product: product,
      relatedProducts: relatedProducts,
      cartCount: cartCount
    });
  } catch (error) {
    console.error('产品详情加载失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 关于我们
router.get('/about', (req, res) => {
  res.render('frontend/about', {
    title: '关于我们',
    user: req.session.user
  });
});

// 联系我们
router.get('/contact', (req, res) => {
  res.render('frontend/contact', {
    title: '联系我们',
    user: req.session.user
  });
});

// 404页面
router.get('/404', (req, res) => {
  res.render('frontend/404', {
    title: '页面未找到',
    user: req.session.user
  });
});

module.exports = router;