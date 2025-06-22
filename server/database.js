const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created database directory: ${dbDir}`);
}

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// 初始化数据库表
function initDatabase() {
  // 使用 serialize 确保所有表创建语句按顺序执行
  db.serialize(() => {
    // 用户表
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
      } else {
        console.log('Users table created successfully');
      }
    });

    // 商品表
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image_url VARCHAR(255),
        category VARCHAR(50),
        available BOOLEAN DEFAULT true,
        available_num INTEGER DEFAULT 100,
        unlimited_supply BOOLEAN DEFAULT false,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating products table:', err);
      } else {
        console.log('Products table created successfully');
      }
    });

    // 购物车表
    db.run(`
      CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating cart table:', err);
      } else {
        console.log('Cart table created successfully');
      }
    });

    // 订单表
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        pickup_number VARCHAR(20) UNIQUE,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating orders table:', err);
      } else {
        console.log('Orders table created successfully');
      }
    });

    // 订单详情表
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating order_items table:', err);
      } else {
        console.log('Order_items table created successfully');
      }
    });

    // 标签表
    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(20) UNIQUE NOT NULL,
        color VARCHAR(20) DEFAULT 'gold',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating tags table:', err);
      } else {
        console.log('Tags table created successfully');
      }
    });

    // 商品标签关联表
    db.run(`
      CREATE TABLE IF NOT EXISTS product_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        tag_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
        UNIQUE(product_id, tag_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating product_tags table:', err);
      } else {
        console.log('Product_tags table created successfully');
        // 所有表创建完成后，再执行数据初始化
        setTimeout(() => {
          createDefaultAdmin();
          addSampleProducts();
          generatePickupNumbersForExistingOrders();
        }, 500);
      }
    });
  });
}

// 创建默认管理员账户
function createDefaultAdmin() {
  const adminPassword = bcrypt.hashSync('admin123', 10);
  
  db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err);
      return;
    }
    
    if (!row) {
      db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', adminPassword, 'admin'],
        (err) => {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Default admin user created (username: admin, password: admin123)');
          }
        }
      );
    }
  });
}

// 添加示例商品
function addSampleProducts() {
  const sampleProducts = [
  ];

  sampleProducts.forEach(product => {
    db.get('SELECT * FROM products WHERE name = ?', [product.name], (err, row) => {
      if (err) {
        console.error('Error checking product:', err);
        return;
      }
      
      if (!row) {
        db.run(
          'INSERT INTO products (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)',
          [product.name, product.description, product.price, product.category, product.image_url],
          (err) => {
            if (err) {
              console.error('Error adding sample product:', err);
            }
          }
        );
      }
    });
  });
}

// 为现有订单生成取单号
function generatePickupNumbersForExistingOrders() {
  db.all('SELECT id FROM orders WHERE pickup_number IS NULL', (err, orders) => {
    if (err) {
      console.error('Error fetching orders without pickup numbers:', err);
      return;
    }

    orders.forEach(order => {
      const pickupNumber = Math.floor(100000 + Math.random() * 900000).toString();
      db.run('UPDATE orders SET pickup_number = ? WHERE id = ?', [pickupNumber, order.id], (err) => {
        if (err) {
          console.error('Error updating pickup number for order', order.id, ':', err);
        }
      });
    });

    if (orders.length > 0) {
      console.log(`Generated pickup numbers for ${orders.length} existing orders`);
    }
  });
}



module.exports = db; 