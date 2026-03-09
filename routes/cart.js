const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 获取购物车数量
router.get('/count', async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const cart = await db.query(
      'SELECT SUM(quantity) as total FROM cart WHERE session_id = ?',
      [sessionId]
    );

    const count = cart[0]?.total || 0;

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('获取购物车数量失败:', error);
    res.json({
      success: false,
      count: 0
    });
  }
});

// 添加商品到购物车
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const sessionId = req.sessionID;

    if (!productId) {
      return res.json({
        success: false,
        message: '商品 ID 不能为空'
      });
    }

    // 检查商品是否存在且库存充足
    const product = await db.get(
      'SELECT * FROM products WHERE id = ? AND is_active = 1',
      [productId]
    );

    if (!product) {
      return res.json({
        success: false,
        message: '商品不存在'
      });
    }

    if (product.stock < quantity) {
      return res.json({
        success: false,
        message: '库存不足'
      });
    }

    // 检查购物车中是否已有该商品
    const existingCartItem = await db.get(
      'SELECT * FROM cart WHERE session_id = ? AND product_id = ?',
      [sessionId, productId]
    );

    if (existingCartItem) {
      // 更新数量
      const newQuantity = existingCartItem.quantity + quantity;

      if (product.stock < newQuantity) {
        return res.json({
          success: false,
          message: '库存不足'
        });
      }

      await db.run(
        'UPDATE cart SET quantity = ?, created_at = datetime("now") WHERE id = ?',
        [newQuantity, existingCartItem.id]
      );
    } else {
      // 添加新商品
      await db.run(
        'INSERT INTO cart (session_id, product_id, quantity) VALUES (?, ?, ?)',
        [sessionId, productId, quantity]
      );
    }

    // 获取更新后的购物车数量
    const cart = await db.query(
      'SELECT SUM(quantity) as total FROM cart WHERE session_id = ?',
      [sessionId]
    );

    const cartCount = cart[0]?.total || 0;

    res.json({
      success: true,
      message: '商品已加入购物车',
      cartCount: cartCount
    });

  } catch (error) {
    console.error('添加购物车失败:', error);
    res.json({
      success: false,
      message: '添加失败，请稍后重试'
    });
  }
});

// 更新购物车商品数量
router.post('/update', async (req, res) => {
  try {
    const { cartItemId, quantity } = req.body;
    const sessionId = req.sessionID;

    if (!cartItemId || !quantity) {
      return res.json({
        success: false,
        message: '参数错误'
      });
    }

    // 检查购物车项是否存在
    const cartItem = await db.get(`
      SELECT c.*, p.stock
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ? AND c.session_id = ?
    `, [cartItemId, sessionId]);

    if (!cartItem) {
      return res.json({
        success: false,
        message: '购物车项不存在'
      });
    }

    // 检查库存
    if (quantity > cartItem.stock) {
      return res.json({
        success: false,
        message: '库存不足'
      });
    }

    if (quantity <= 0) {
      // 删除商品
      await db.run(
        'DELETE FROM cart WHERE id = ? AND session_id = ?',
        [cartItemId, sessionId]
      );
    } else {
      // 更新数量
      await db.run(
        'UPDATE cart SET quantity = ? WHERE id = ? AND session_id = ?',
        [quantity, cartItemId, sessionId]
      );
    }

    // 获取更新后的购物车信息
    const cartItems = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.session_id = ?
    `, [sessionId]);

    // 计算总价
    let totalAmount = 0;
    cartItems.forEach(item => {
      totalAmount += item.price * item.quantity;
    });

    res.json({
      success: true,
      message: '购物车更新成功',
      cartItems: cartItems,
      totalAmount: totalAmount
    });

  } catch (error) {
    console.error('更新购物车失败:', error);
    res.json({
      success: false,
      message: '更新失败，请稍后重试'
    });
  }
});

// 删除购物车商品
router.post('/remove', async (req, res) => {
  try {
    const { cartItemId } = req.body;
    const sessionId = req.sessionID;

    if (!cartItemId) {
      return res.json({
        success: false,
        message: '参数错误'
      });
    }

    await db.run(
      'DELETE FROM cart WHERE id = ? AND session_id = ?',
      [cartItemId, sessionId]
    );

    // 获取更新后的购物车数量
    const cart = await db.query(
      'SELECT SUM(quantity) as total FROM cart WHERE session_id = ?',
      [sessionId]
    );

    const cartCount = cart[0]?.total || 0;

    res.json({
      success: true,
      message: '商品已从购物车移除',
      cartCount: cartCount
    });

  } catch (error) {
    console.error('删除购物车商品失败:', error);
    res.json({
      success: false,
      message: '删除失败，请稍后重试'
    });
  }
});

// 清空购物车
router.post('/clear', async (req, res) => {
  try {
    const sessionId = req.sessionID;

    await db.run(
      'DELETE FROM cart WHERE session_id = ?',
      [sessionId]
    );

    res.json({
      success: true,
      message: '购物车已清空'
    });

  } catch (error) {
    console.error('清空购物车失败:', error);
    res.json({
      success: false,
      message: '清空失败，请稍后重试'
    });
  }
});

module.exports = router;
