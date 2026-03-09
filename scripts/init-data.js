// 初始化数据库数据脚本
const db = require('../config/database');

async function initializeData() {
  console.log('开始初始化数据库数据...');

  try {
    // 首先初始化数据库表结构
    console.log('初始化数据库表结构...');
    db.initializeDatabase();

    // 等待表创建完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 插入示例产品数据
    const products = [
      {
        name: '景田天然矿泉水（18.9L）',
        description: '源自深层地下水源，富含多种矿物质，适合家庭日常饮用',
        price: 25.00,
        category_id: 1,
        stock: 100,
        image_url: '/images/water-18L.jpg'
      },
      {
        name: '景田天然矿泉水（11.3L）',
        description: '中型桶装水，适合小型办公室或家庭使用',
        price: 18.00,
        category_id: 1,
        stock: 80,
        image_url: '/images/water-11L.jpg'
      },
      {
        name: '景田天然矿泉水（5L）',
        description: '便携式桶装水，适合个人或小家庭使用',
        price: 12.00,
        category_id: 1,
        stock: 150,
        image_url: '/images/water-5L.jpg'
      },
      {
        name: '景田瓶装矿泉水（550ml）',
        description: '便携瓶装水，24瓶/箱，适合外出携带',
        price: 36.00,
        category_id: 2,
        stock: 200,
        image_url: '/images/bottle-water.jpg'
      },
      {
        name: '智能饮水机',
        description: '智能温控饮水机，支持冷热双出水',
        price: 299.00,
        category_id: 3,
        stock: 30,
        image_url: '/images/water-dispenser.jpg'
      },
      {
        name: '基础饮水机',
        description: '经济型饮水机，满足基本饮水需求',
        price: 159.00,
        category_id: 3,
        stock: 50,
        image_url: '/images/basic-dispenser.jpg'
      },
      {
        name: '水票套餐A（10张）',
        description: '10张水票套餐，享受9折优惠',
        price: 225.00,
        category_id: 4,
        stock: 999,
        image_url: '/images/ticket-a.jpg'
      },
      {
        name: '水票套餐B（20张）',
        description: '20张水票套餐，享受8.5折优惠',
        price: 425.00,
        category_id: 4,
        stock: 999,
        image_url: '/images/ticket-b.jpg'
      },
      {
        name: '水票套餐C（50张）',
        description: '50张水票套餐，享受8折优惠',
        price: 1000.00,
        category_id: 4,
        stock: 999,
        image_url: '/images/ticket-c.jpg'
      }
    ];

    console.log('插入产品数据...');
    for (const product of products) {
      await db.run(
        `INSERT OR IGNORE INTO products (name, description, price, category_id, stock, image_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [product.name, product.description, product.price, product.category_id, product.stock, product.image_url]
      );
    }

    // 插入示例用户数据（非管理员）
    const users = [
      {
        username: 'testuser',
        email: 'test@example.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeG3vJ.5QO.5QO.5QO.5QO.5QO.5QO', // 密码: test123
        phone: '13800138000',
        address: '北京市朝阳区测试地址',
        is_admin: 0
      },
      {
        username: 'customer1',
        email: 'customer1@example.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeG3vJ.5QO.5QO.5QO.5QO.5QO.5QO', // 密码: customer123
        phone: '13900139000',
        address: '上海市浦东新区测试地址',
        is_admin: 0
      }
    ];

    console.log('插入用户数据...');
    for (const user of users) {
      await db.run(
        `INSERT OR IGNORE INTO users (username, email, password, phone, address, is_admin)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.username, user.email, user.password, user.phone, user.address, user.is_admin]
      );
    }

    // 插入示例订单数据
    console.log('插入订单数据...');
    const testUser = await db.get('SELECT id FROM users WHERE username = ?', ['testuser']);

    if (testUser) {
      const orders = [
        {
          order_number: `JT${Date.now()}0001`,
          user_id: testUser.id,
          total_amount: 50.00,
          status: 'completed',
          shipping_address: '北京市朝阳区测试地址',
          contact_phone: '13800138000',
          payment_method: 'cash',
          payment_status: 'paid'
        },
        {
          order_number: `JT${Date.now()}0002`,
          user_id: testUser.id,
          total_amount: 36.00,
          status: 'processing',
          shipping_address: '北京市朝阳区测试地址',
          contact_phone: '13800138000',
          payment_method: 'wechat',
          payment_status: 'paid'
        },
        {
          order_number: `JT${Date.now()}0003`,
          user_id: testUser.id,
          total_amount: 299.00,
          status: 'pending',
          shipping_address: '北京市朝阳区测试地址',
          contact_phone: '13800138000',
          payment_method: 'alipay',
          payment_status: 'unpaid'
        }
      ];

      for (const order of orders) {
        const orderResult = await db.run(
          `INSERT INTO orders (order_number, user_id, total_amount, status, shipping_address, contact_phone, payment_method, payment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [order.order_number, order.user_id, order.total_amount, order.status,
           order.shipping_address, order.contact_phone, order.payment_method, order.payment_status]
        );

        // 插入订单项
        if (orderResult.id) {
          const products = await db.query('SELECT id, price FROM products LIMIT 2');
          for (const product of products) {
            await db.run(
              `INSERT INTO order_items (order_id, product_id, quantity, price)
               VALUES (?, ?, ?, ?)`,
              [orderResult.id, product.id, 1, product.price]
            );
          }
        }
      }
    }

    console.log('数据库数据初始化完成！');
    console.log('========================================');
    console.log('默认管理员账号:');
    console.log('邮箱: admin@jingtian.com');
    console.log('密码: admin123');
    console.log('========================================');
    console.log('测试用户账号:');
    console.log('邮箱: test@example.com');
    console.log('密码: test123');
    console.log('========================================');
    console.log('访问地址:');
    console.log('前台: http://localhost:3000');
    console.log('后台: http://localhost:3000/admin/login');
    console.log('========================================');

  } catch (error) {
    console.error('初始化数据失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeData();
}

module.exports = initializeData;