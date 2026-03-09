const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 生成订单号
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `JT${timestamp}${random.toString().padStart(4, '0')}`;
}

// 购物车页面 - 从 session 获取
router.get('/cart', async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const cartItems = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.session_id = ? AND p.is_active = 1
    `, [sessionId]);

    let totalAmount = 0;
    cartItems.forEach(item => {
      totalAmount += item.price * item.quantity;
    });

    res.render('frontend/cart', {
      title: '购物车',
      user: null,
      cartItems: cartItems,
      totalAmount: totalAmount,
      cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (error) {
    console.error('加载购物车失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      user: null,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 结账页面
router.get('/checkout', async (req, res) => {
  try {
    const sessionId = req.sessionID;
    const cartItems = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.session_id = ? AND p.is_active = 1
    `, [sessionId]);

    if (cartItems.length === 0) {
      req.session.message = {
        type: 'warning',
        text: '购物车为空，请先添加商品'
      };
      return res.redirect('/cart');
    }

    // 检查库存
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        req.session.message = {
          type: 'danger',
          text: `商品 "${item.name}" 库存不足，当前库存：${item.stock}`
        };
        return res.redirect('/cart');
      }
    }

    let totalAmount = 0;
    let totalQuantity = 0;
    cartItems.forEach(item => {
      totalAmount += item.price * item.quantity;
      totalQuantity += item.quantity;
    });

    res.render('frontend/checkout', {
      title: '结账',
      user: null,
      cartItems: cartItems,
      totalAmount: totalAmount,
      totalQuantity: totalQuantity,
      cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (error) {
    console.error('加载结账页面失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      user: null,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 创建订单 - 免注册
router.post('/create', async (req, res) => {
  const sessionId = req.sessionID;

  try {
    const { name, phone, address, deliveryTime, floor, remark } = req.body;

    // 验证输入
    if (!name || !phone || !address) {
      return res.json({
        success: false,
        message: '请填写完整的收货信息'
      });
    }

    // 获取购物车商品
    const cartItems = await db.query(`
      SELECT c.*, p.name, p.price, p.stock
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.session_id = ? AND p.is_active = 1
    `, [sessionId]);

    if (cartItems.length === 0) {
      return res.json({
        success: false,
        message: '购物车为空'
      });
    }

    // 检查库存并计算总价
    let totalAmount = 0;
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        return res.json({
          success: false,
          message: `商品 "${item.name}" 库存不足，当前库存：${item.stock}`
        });
      }
      totalAmount += item.price * item.quantity;
    }

    // 开始事务
    await db.run('BEGIN TRANSACTION');

    try {
      // 创建订单
      const orderNumber = generateOrderNumber();
      const orderResult = await db.run(
        `INSERT INTO orders_v2 (
          order_number, total_amount, status,
          customer_name, customer_phone, delivery_address,
          delivery_time, floor, remark, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          totalAmount,
          'pending',
          name,
          phone,
          address,
          deliveryTime || 'asap',
          floor || '1',
          remark || '',
          sessionId
        ]
      );

      const orderId = orderResult.id;

      // 创建订单项并更新库存
      for (const item of cartItems) {
        // 添加订单项
        await db.run(
          `INSERT INTO order_items_v2 (order_id, product_id, product_name, quantity, price)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.product_id, item.name, item.quantity, item.price]
        );

        // 更新库存
        await db.run(
          'UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // 清空购物车
      await db.run(
        'DELETE FROM cart WHERE session_id = ?',
        [sessionId]
      );

      // 提交事务
      await db.run('COMMIT');

      res.json({
        success: true,
        orderId: orderId,
        orderNumber: orderNumber
      });

    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('创建订单失败:', error);
    res.json({
      success: false,
      message: '订单创建失败，请稍后重试'
    });
  }
});

// 订单成功页面
router.get('/:id/success', async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await db.get(`
      SELECT * FROM orders_v2 WHERE id = ?
    `, [orderId]);

    if (!order) {
      return res.status(404).render('frontend/404', {
        title: '订单未找到',
        user: null
      });
    }

    const orderItems = await db.query(`
      SELECT * FROM order_items_v2 WHERE order_id = ?
    `, [orderId]);

    order.items = orderItems;

    res.render('frontend/order-success', {
      title: '订单提交成功',
      user: null,
      order: order,
      cartCount: 0
    });
  } catch (error) {
    console.error('加载订单详情失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      user: null,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 订单查询页面
router.get('/track', (req, res) => {
  res.render('frontend/order-track', {
    title: '订单查询',
    user: null,
    cartCount: 0
  });
});

// 订单查询 API
router.get('/track-api', async (req, res) => {
  try {
    const { order_number, phone } = req.query;

    if (!order_number || !phone) {
      return res.json({
        success: false,
        message: '请输入订单号和手机号'
      });
    }

    const order = await db.get(`
      SELECT * FROM orders_v2
      WHERE order_number = ? AND customer_phone = ?
    `, [order_number, phone]);

    if (!order) {
      return res.json({
        success: false,
        message: '未找到订单，请检查订单号和手机号'
      });
    }

    const orderItems = await db.query(`
      SELECT * FROM order_items_v2 WHERE order_id = ?
    `, [order.id]);

    order.items = orderItems;

    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    res.json({
      success: false,
      message: '查询失败，请稍后重试'
    });
  }
});

module.exports = router;
