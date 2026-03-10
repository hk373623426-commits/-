const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    // Vercel 环境强制使用 /tmp，避免在只读文件系统上创建目录
    // process.env.VERCEL 存在表示在 Vercel 环境，忽略其他配置
    const dbPath = process.env.VERCEL
      ? '/tmp/jingtian.db'
      : (process.env.DB_PATH || './database/jingtian.db');

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
      } else {
        console.log('数据库连接成功，路径:', dbPath);
      }
    });
  }

  // 初始化数据库表
  async initializeDatabase() {
    await this.createUsersTable();
    await this.createProductsTable();
    await this.createCategoriesTable();
    await this.createCartTable();
    await this.createOrdersTable();
    await this.createOrderItemsTable();
    await this.createOrdersV2Table();
    await this.createOrderItemsV2Table();
    await this.createAdminUser();
  }

  async createUsersTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          is_admin BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createProductsTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category_id INTEGER,
          image_url TEXT,
          stock INTEGER DEFAULT 100,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `;
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createCategoriesTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          // 插入默认分类
          this.insertDefaultCategories();
          resolve();
        }
      });
    });
  }

  async createCartTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS cart (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `;
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createOrdersTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT UNIQUE NOT NULL,
          user_id INTEGER NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status TEXT DEFAULT 'pending',
          shipping_address TEXT NOT NULL,
          contact_phone TEXT NOT NULL,
          payment_method TEXT DEFAULT 'cash',
          payment_status TEXT DEFAULT 'unpaid',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `;
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createOrderItemsTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `;
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async insertDefaultCategories() {
    const categories = [
      { name: '桶装水', description: '各种规格的桶装矿泉水' },
      { name: '瓶装水', description: '便携式瓶装矿泉水' },
      { name: '饮水机', description: '配套饮水设备' },
      { name: '水票套餐', description: '优惠套餐组合' }
    ];

    return Promise.all(categories.map(category => {
      return new Promise((resolve, reject) => {
        this.db.run(
          'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
          [category.name, category.description],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }));
  }

  async createAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@jingtian.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    return new Promise((resolve, reject) => {
      // 先检查是否已存在管理员账号
      this.db.get(
        'SELECT * FROM users WHERE email = ? AND is_admin = 1',
        [adminEmail],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            // 不存在则创建
            this.db.run(
              `INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)`,
              ['admin', adminEmail, hashedPassword, 1],
              (err) => {
                if (err) {
                  console.error('创建管理员账号失败:', err);
                  reject(err);
                } else {
                  console.log('✓ 管理员账号创建成功:', adminEmail);
                  resolve();
                }
              }
            );
          } else {
            console.log('✓ 管理员账号已存在:', adminEmail);
            resolve();
          }
        }
      );
    });
  }

  async createOrdersV2Table() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS orders_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT UNIQUE NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status TEXT DEFAULT 'pending',
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          delivery_address TEXT NOT NULL,
          delivery_time TEXT DEFAULT 'asap',
          floor TEXT DEFAULT '1',
          remark TEXT,
          session_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createOrderItemsV2Table() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS order_items_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders_v2(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `;
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // 通用查询方法
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

module.exports = new Database();