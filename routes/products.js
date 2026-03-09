const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 获取所有产品
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // 获取总数
    const countSql = sql.replace('SELECT p.*, c.name as category_name', 'SELECT COUNT(*) as total');
    const countResult = await db.get(countSql, params);

    // 添加排序和分页
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = await db.query(sql, params);

    res.json({
      success: true,
      data: products,
      pagination: {
        total: countResult.total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    res.status(500).json({ success: false, message: '获取产品列表失败' });
  }
});

// 获取单个产品详情
router.get('/:id', async (req, res) => {
  try {
    const product = await db.get(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1
    `, [req.params.id]);

    if (!product) {
      return res.status(404).json({ success: false, message: '产品不存在' });
    }

    // 获取相关产品（同分类）
    const relatedProducts = await db.query(`
      SELECT * FROM products
      WHERE category_id = ? AND id != ? AND is_active = 1
      ORDER BY RANDOM() LIMIT 4
    `, [product.category_id, product.id]);

    res.json({
      success: true,
      data: {
        ...product,
        related_products: relatedProducts
      }
    });
  } catch (error) {
    console.error('获取产品详情失败:', error);
    res.status(500).json({ success: false, message: '获取产品详情失败' });
  }
});

// 获取所有分类
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({ success: false, message: '获取分类失败' });
  }
});

// 获取热门产品
router.get('/featured/products', async (req, res) => {
  try {
    const products = await db.query(`
      SELECT * FROM products
      WHERE is_active = 1
      ORDER BY RANDOM()
      LIMIT 8
    `);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('获取热门产品失败:', error);
    res.status(500).json({ success: false, message: '获取热门产品失败' });
  }
});

// 前台页面路由
router.get('/list', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM categories ORDER BY name');
    const products = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.created_at DESC
      LIMIT 12
    `);

    res.render('frontend/products', {
      title: '产品列表 - 景田天然矿泉水',
      categories,
      products,
      user: req.session.user
    });
  } catch (error) {
    console.error('渲染产品列表页面失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      message: '加载产品列表失败，请稍后重试'
    });
  }
});

router.get('/detail/:id', async (req, res) => {
  try {
    const product = await db.get(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1
    `, [req.params.id]);

    if (!product) {
      return res.status(404).render('frontend/error', {
        title: '产品不存在',
        message: '您查找的产品不存在或已下架'
      });
    }

    // 获取相关产品
    const relatedProducts = await db.query(`
      SELECT * FROM products
      WHERE category_id = ? AND id != ? AND is_active = 1
      ORDER BY RANDOM() LIMIT 4
    `, [product.category_id, product.id]);

    res.render('frontend/product-detail', {
      title: `${product.name} - 景田天然矿泉水`,
      product,
      relatedProducts,
      user: req.session.user
    });
  } catch (error) {
    console.error('渲染产品详情页面失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      message: '加载产品详情失败，请稍后重试'
    });
  }
});

module.exports = router;