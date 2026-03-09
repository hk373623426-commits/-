const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// 登录页面
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('frontend/auth/login', {
    title: '用户登录',
    user: null,
    message: req.session.message
  });
  delete req.session.message;
});

// 登录处理
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证输入
    if (!email || !password) {
      req.session.message = {
        type: 'danger',
        text: '请输入邮箱和密码'
      };
      return res.redirect('/auth/login');
    }

    // 查找用户
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      req.session.message = {
        type: 'danger',
        text: '用户不存在'
      };
      return res.redirect('/auth/login');
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      req.session.message = {
        type: 'danger',
        text: '密码错误'
      };
      return res.redirect('/auth/login');
    }

    // 设置会话
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin
    };

    // 重定向到相应页面
    if (user.is_admin) {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/');
    }

  } catch (error) {
    console.error('登录失败:', error);
    req.session.message = {
      type: 'danger',
      text: '登录失败，请稍后重试'
    };
    res.redirect('/auth/login');
  }
});

// 注册页面
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('frontend/auth/register', {
    title: '用户注册',
    user: null,
    message: req.session.message
  });
  delete req.session.message;
});

// 注册处理
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, phone } = req.body;

    // 验证输入
    if (!username || !email || !password || !confirmPassword) {
      req.session.message = {
        type: 'danger',
        text: '请填写所有必填字段'
      };
      return res.redirect('/auth/register');
    }

    if (password !== confirmPassword) {
      req.session.message = {
        type: 'danger',
        text: '两次输入的密码不一致'
      };
      return res.redirect('/auth/register');
    }

    if (password.length < 6) {
      req.session.message = {
        type: 'danger',
        text: '密码长度至少6位'
      };
      return res.redirect('/auth/register');
    }

    // 检查用户是否已存在
    const existingUser = await db.get(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      req.session.message = {
        type: 'danger',
        text: '邮箱或用户名已被注册'
      };
      return res.redirect('/auth/register');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await db.run(
      `INSERT INTO users (username, email, password, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [username, email, hashedPassword, phone || null]
    );

    if (result.changes > 0) {
      // 自动登录
      const newUser = await db.get(
        'SELECT * FROM users WHERE id = ?',
        [result.id]
      );

      req.session.user = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        is_admin: newUser.is_admin
      };

      req.session.message = {
        type: 'success',
        text: '注册成功！欢迎使用景田天然矿泉水'
      };

      return res.redirect('/');
    } else {
      throw new Error('用户创建失败');
    }

  } catch (error) {
    console.error('注册失败:', error);
    req.session.message = {
      type: 'danger',
      text: '注册失败，请稍后重试'
    };
    res.redirect('/auth/register');
  }
});

// 退出登录
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('退出登录失败:', err);
    }
    res.redirect('/');
  });
});

// 个人资料页面
router.get('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  try {
    const user = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [req.session.user.id]
    );

    // 获取用户订单
    const orders = await db.query(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [req.session.user.id]);

    res.render('frontend/auth/profile', {
      title: '个人中心',
      user: req.session.user,
      userDetails: user,
      orders: orders
    });
  } catch (error) {
    console.error('加载个人资料失败:', error);
    res.status(500).render('frontend/error', {
      title: '服务器错误',
      user: req.session.user,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 更新个人资料
router.post('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  try {
    const { phone, address } = req.body;

    await db.run(
      `UPDATE users SET phone = ?, address = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [phone || null, address || null, req.session.user.id]
    );

    req.session.message = {
      type: 'success',
      text: '个人资料更新成功'
    };

    res.redirect('/auth/profile');
  } catch (error) {
    console.error('更新个人资料失败:', error);
    req.session.message = {
      type: 'danger',
      text: '更新失败，请稍后重试'
    };
    res.redirect('/auth/profile');
  }
});

// 修改密码
router.post('/change-password', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.session.message = {
        type: 'danger',
        text: '请填写所有密码字段'
      };
      return res.redirect('/auth/profile');
    }

    if (newPassword !== confirmPassword) {
      req.session.message = {
        type: 'danger',
        text: '两次输入的新密码不一致'
      };
      return res.redirect('/auth/profile');
    }

    if (newPassword.length < 6) {
      req.session.message = {
        type: 'danger',
        text: '新密码长度至少6位'
      };
      return res.redirect('/auth/profile');
    }

    // 获取当前用户
    const user = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [req.session.user.id]
    );

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      req.session.message = {
        type: 'danger',
        text: '当前密码错误'
      };
      return res.redirect('/auth/profile');
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await db.run(
      `UPDATE users SET password = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [hashedPassword, req.session.user.id]
    );

    req.session.message = {
      type: 'success',
      text: '密码修改成功'
    };

    res.redirect('/auth/profile');
  } catch (error) {
    console.error('修改密码失败:', error);
    req.session.message = {
      type: 'danger',
      text: '修改密码失败，请稍后重试'
    };
    res.redirect('/auth/profile');
  }
});

module.exports = router;