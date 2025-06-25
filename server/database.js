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
    // 启用外键约束
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Error enabling foreign keys:', err);
      } else {
        console.log('Foreign keys enabled');
      }
    });
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

    // 分类表
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        emoji VARCHAR(10) DEFAULT '📦',
        sort_order INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating categories table:', err);
      } else {
        console.log('Categories table created successfully');
        // 检查是否需要添加emoji列到现有表
        addEmojiColumnIfNotExists();
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
        reservation_enabled BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating products table:', err);
      } else {
        console.log('Products table created successfully');
        // 为现有商品表添加预定控制字段
        addReservationEnabledColumnIfNotExists();
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
        pickup_number VARCHAR(20),
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
        // 为现有订单表添加备注字段
        addOrderNotesColumnIfNotExists();
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
      }
    });

    // 商品细分类型表（如温度、糖度等）
    db.run(`
      CREATE TABLE IF NOT EXISTS product_variant_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        emoji VARCHAR(10) DEFAULT '⚙️',
        is_required BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating product_variant_types table:', err);
      } else {
        console.log('Product_variant_types table created successfully');
        // 检查是否需要添加emoji列到现有表
        addVariantTypeEmojiColumnIfNotExists();
      }
    });

    // 商品细分选项表（如热的、冰的、三分糖等）
    db.run(`
      CREATE TABLE IF NOT EXISTS product_variant_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_type_id INTEGER,
        name VARCHAR(50) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        price_adjustment DECIMAL(10,2) DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        available BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (variant_type_id) REFERENCES product_variant_types (id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating product_variant_options table:', err);
      } else {
        console.log('Product_variant_options table created successfully');
      }
    });

    // 商品与细分类型关联表（哪些商品支持哪些细分类型）
    db.run(`
      CREATE TABLE IF NOT EXISTS product_variant_type_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        variant_type_id INTEGER,
        is_required BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (variant_type_id) REFERENCES product_variant_types (id) ON DELETE CASCADE,
        UNIQUE(product_id, variant_type_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating product_variant_type_relations table:', err);
      } else {
        console.log('Product_variant_type_relations table created successfully');
      }
    });

    // 商品与细分选项关联表（哪些商品的特定细分类型启用哪些选项）
    db.run(`
      CREATE TABLE IF NOT EXISTS product_variant_option_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        variant_type_id INTEGER,
        variant_option_id INTEGER,
        enabled BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (variant_type_id) REFERENCES product_variant_types (id) ON DELETE CASCADE,
        FOREIGN KEY (variant_option_id) REFERENCES product_variant_options (id) ON DELETE CASCADE,
        UNIQUE(product_id, variant_type_id, variant_option_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating product_variant_option_relations table:', err);
      } else {
        console.log('Product_variant_option_relations table created successfully');
      }
    });

    // 更新购物车表，添加选择的细分选项JSON字段
    db.run(`
      ALTER TABLE cart ADD COLUMN variant_selections TEXT DEFAULT NULL
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding variant_selections to cart table:', err);
      } else if (!err || !err.message?.includes('duplicate column')) {
        console.log('Added variant_selections column to cart table');
      }
    });

    // 更新订单详情表，添加选择的细分选项JSON字段
    db.run(`
      ALTER TABLE order_items ADD COLUMN variant_selections TEXT DEFAULT NULL
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding variant_selections to order_items table:', err);
      } else if (!err || !err.message?.includes('duplicate column')) {
        console.log('Added variant_selections column to order_items table');
      }
    });

    // 预定表
    db.run(`
      CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL DEFAULT 1,
        reservation_date DATE NOT NULL,
        variant_selections TEXT DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        total_amount DECIMAL(10,2) NOT NULL,
        is_paid BOOLEAN DEFAULT false,
        order_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating reservations table:', err);
      } else {
        console.log('Reservations table created successfully');
        // 为现有预定表添加新字段
        addReservationPaymentColumnsIfNotExists();
      }
    });

    // 所有表创建完成后，再执行数据初始化
    setTimeout(() => {
      createDefaultAdmin();
      addDefaultCategories();
      addSampleProducts();
      addDefaultVariantTypes();
      generatePickupNumbersForExistingOrders();
    }, 1000);
  });
}

// 为现有的categories表添加emoji列（如果不存在）
function addEmojiColumnIfNotExists() {
  db.all("PRAGMA table_info(categories)", (err, columns) => {
    if (err) {
      console.error('Error checking categories table structure:', err);
      return;
    }
    
    const hasEmojiColumn = columns.some(col => col.name === 'emoji');
    if (!hasEmojiColumn) {
      db.run("ALTER TABLE categories ADD COLUMN emoji VARCHAR(10) DEFAULT '📦'", (err) => {
        if (err) {
          console.error('Error adding emoji column:', err);
        } else {
          console.log('Added emoji column to categories table');
          // 更新现有分类的emoji
          updateExistingCategoriesEmoji();
        }
      });
    }
  });
}

// 更新现有分类的emoji
function updateExistingCategoriesEmoji() {
  const emojiUpdates = [
    { name: 'coffee', emoji: '🥤' },
    { name: 'tea', emoji: '🍵' },
    { name: 'dessert', emoji: '🧁' },
    { name: 'snack', emoji: '🍪' }
  ];
  
  emojiUpdates.forEach(update => {
    db.run('UPDATE categories SET emoji = ? WHERE name = ?', [update.emoji, update.name], (err) => {
      if (err) {
        console.error(`Error updating emoji for ${update.name}:`, err);
      } else {
        console.log(`Updated emoji for ${update.name}: ${update.emoji}`);
      }
    });
  });
}

// 为现有的product_variant_types表添加emoji列（如果不存在）
function addVariantTypeEmojiColumnIfNotExists() {
  db.all("PRAGMA table_info(product_variant_types)", (err, columns) => {
    if (err) {
      console.error('Error checking product_variant_types table structure:', err);
      return;
    }
    
    const hasEmojiColumn = columns.some(col => col.name === 'emoji');
    if (!hasEmojiColumn) {
      db.run("ALTER TABLE product_variant_types ADD COLUMN emoji VARCHAR(10) DEFAULT '⚙️'", (err) => {
        if (err) {
          console.error('Error adding emoji column to product_variant_types:', err);
        } else {
          console.log('Added emoji column to product_variant_types table');
          // 更新现有细分类型的emoji
          updateExistingVariantTypesEmoji();
        }
      });
    }
  });
}

// 为现有预定表添加支付相关字段
function addReservationPaymentColumnsIfNotExists() {
  // 添加total_amount字段
  db.run("ALTER TABLE reservations ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding total_amount to reservations table:', err);
    } else if (!err || !err.message?.includes('duplicate column')) {
      console.log('Added total_amount column to reservations table');
    }
  });

  // 添加is_paid字段
  db.run("ALTER TABLE reservations ADD COLUMN is_paid BOOLEAN DEFAULT false", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding is_paid to reservations table:', err);
    } else if (!err || !err.message?.includes('duplicate column')) {
      console.log('Added is_paid column to reservations table');
    }
  });

  // 添加order_id字段
  db.run("ALTER TABLE reservations ADD COLUMN order_id INTEGER DEFAULT NULL", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding order_id to reservations table:', err);
    } else if (!err || !err.message?.includes('duplicate column')) {
      console.log('Added order_id column to reservations table');
    }
  });
}

// 为现有订单表添加备注字段
function addOrderNotesColumnIfNotExists() {
  db.run("ALTER TABLE orders ADD COLUMN notes TEXT DEFAULT NULL", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding notes to orders table:', err);
    } else if (!err || !err.message?.includes('duplicate column')) {
      console.log('Added notes column to orders table');
    }
  });
}

// 为现有商品表添加预定控制字段
function addReservationEnabledColumnIfNotExists() {
  db.run("ALTER TABLE products ADD COLUMN reservation_enabled BOOLEAN DEFAULT true", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding reservation_enabled to products table:', err);
    } else if (!err || !err.message?.includes('duplicate column')) {
      console.log('Added reservation_enabled column to products table');
    }
  });
}



// 更新现有细分类型的emoji
function updateExistingVariantTypesEmoji() {
  const emojiUpdates = [
    { name: 'temperature', emoji: '🌡️' },
    { name: 'sweetness', emoji: '🍯' },
    { name: 'size', emoji: '📏' }
  ];
  
  emojiUpdates.forEach(update => {
    db.run('UPDATE product_variant_types SET emoji = ? WHERE name = ?', [update.emoji, update.name], (err) => {
      if (err) {
        console.error(`Error updating emoji for variant type ${update.name}:`, err);
      } else {
        console.log(`Updated emoji for variant type ${update.name}: ${update.emoji}`);
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

// 添加默认分类
function addDefaultCategories() {
  const defaultCategories = [
    { name: 'coffee', display_name: '咖啡', description: '各种口味的咖啡饮品', emoji: '🥤', sort_order: 1 },
    { name: 'tea', display_name: '茶饮', description: '传统茶饮和奶茶系列', emoji: '🍵', sort_order: 2 },
    { name: 'dessert', display_name: '甜品', description: '精美的蛋糕和甜点', emoji: '🧁', sort_order: 3 },
    { name: 'snack', display_name: '小食', description: '各种小食和轻食', emoji: '🍪', sort_order: 4 }
  ];

  defaultCategories.forEach(category => {
    db.get('SELECT * FROM categories WHERE name = ?', [category.name], (err, row) => {
      if (err) {
        console.error('Error checking category:', err);
        return;
      }
      
      if (!row) {
        db.run(
          'INSERT INTO categories (name, display_name, description, emoji, sort_order) VALUES (?, ?, ?, ?, ?)',
          [category.name, category.display_name, category.description, category.emoji, category.sort_order],
          (err) => {
            if (err) {
              console.error('Error adding default category:', err);
            } else {
              console.log(`Created default category: ${category.display_name} ${category.emoji}`);
            }
          }
        );
      }
    });
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

// 添加默认的商品细分类型
function addDefaultVariantTypes() {
  const defaultVariantTypes = [
    {
      name: 'temperature',
      display_name: '温度',
      description: '选择饮品温度',
      emoji: '🌡️',
      is_required: false,
      sort_order: 1,
      options: [
        { name: 'hot', display_name: '热', price_adjustment: 0, sort_order: 1 },
        { name: 'warm', display_name: '温', price_adjustment: 0, sort_order: 2 },
        { name: 'iced', display_name: '冰', price_adjustment: 0, sort_order: 3 },
        { name: 'extra_iced', display_name: '少冰', price_adjustment: 0, sort_order: 4 }
      ]
    },
    {
      name: 'sweetness',
      display_name: '糖度',
      description: '选择甜度',
      emoji: '🍯',
      is_required: false,
      sort_order: 2,
      options: [
        { name: 'no_sugar', display_name: '无糖', price_adjustment: 0, sort_order: 1 },
        { name: 'low_sugar', display_name: '三分糖', price_adjustment: 0, sort_order: 2 },
        { name: 'half_sugar', display_name: '五分糖', price_adjustment: 0, sort_order: 3 },
        { name: 'normal_sugar', display_name: '全糖', price_adjustment: 0, sort_order: 4 }
      ]
    },
    {
      name: 'size',
      display_name: '杯型',
      description: '选择杯型大小',
      emoji: '📏',
      is_required: false,
      sort_order: 3,
      options: [
        { name: 'small', display_name: '小杯', price_adjustment: -2, sort_order: 1 },
        { name: 'medium', display_name: '中杯', price_adjustment: 0, sort_order: 2 },
        { name: 'large', display_name: '大杯', price_adjustment: 3, sort_order: 3 },
        { name: 'extra_large', display_name: '超大杯', price_adjustment: 6, sort_order: 4 }
      ]
    }
  ];

  defaultVariantTypes.forEach(variantType => {
    // 检查类型是否已存在
    db.get('SELECT * FROM product_variant_types WHERE name = ?', [variantType.name], (err, row) => {
      if (err) {
        console.error('Error checking variant type:', err);
        return;
      }
      
      if (!row) {
        // 创建细分类型
        db.run(
          'INSERT INTO product_variant_types (name, display_name, description, emoji, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [variantType.name, variantType.display_name, variantType.description, variantType.emoji, variantType.is_required, variantType.sort_order],
          function(err) {
            if (err) {
              console.error('Error adding variant type:', err);
              return;
            }

            const variantTypeId = this.lastID;
            console.log(`Created variant type: ${variantType.display_name} (ID: ${variantTypeId})`);

            // 添加选项
            variantType.options.forEach(option => {
              db.run(
                'INSERT INTO product_variant_options (variant_type_id, name, display_name, price_adjustment, sort_order) VALUES (?, ?, ?, ?, ?)',
                [variantTypeId, option.name, option.display_name, option.price_adjustment, option.sort_order],
                (err) => {
                  if (err) {
                    console.error('Error adding variant option:', err);
                  } else {
                    console.log(`  Added option: ${option.display_name}`);
                  }
                }
              );
            });
          }
        );
      }
    });
  });
}

// 为现有订单生成取单号（按日期递增）
function generatePickupNumbersForExistingOrders() {
  db.all('SELECT id, created_at FROM orders WHERE pickup_number IS NULL ORDER BY created_at ASC', (err, orders) => {
    if (err) {
      console.error('Error fetching orders without pickup numbers:', err);
      return;
    }

    if (orders.length === 0) {
      return;
    }

    // 按日期分组处理订单
    const ordersByDate = {};
    orders.forEach(order => {
      const date = order.created_at.split('T')[0]; // 获取日期部分 YYYY-MM-DD
      if (!ordersByDate[date]) {
        ordersByDate[date] = [];
      }
      ordersByDate[date].push(order);
    });

    // 为每个日期的订单生成递增的取单号
    Object.keys(ordersByDate).forEach(date => {
      const dateOrders = ordersByDate[date];
      
      // 查询该日期已有的最大取单号
      db.get(
        'SELECT MAX(CAST(pickup_number AS INTEGER)) as max_pickup_number FROM orders WHERE DATE(created_at) = ? AND pickup_number IS NOT NULL',
        [date],
        (err, row) => {
          if (err) {
            console.error('Error getting max pickup number for date', date, ':', err);
            return;
          }

          let nextNumber = (row && row.max_pickup_number) ? row.max_pickup_number + 1 : 1;
          
          // 为该日期的订单按顺序分配取单号
          dateOrders.forEach(order => {
            const pickupNumber = nextNumber.toString().padStart(4, '0');
            db.run('UPDATE orders SET pickup_number = ? WHERE id = ?', [pickupNumber, order.id], (err) => {
              if (err) {
                console.error('Error updating pickup number for order', order.id, ':', err);
              }
            });
            nextNumber++;
          });
          
          console.log(`Generated ${dateOrders.length} pickup numbers for date ${date}, starting from ${nextNumber - dateOrders.length}`);
        }
      );
    });

    console.log(`Processing pickup numbers for ${orders.length} existing orders across ${Object.keys(ordersByDate).length} dates`);
  });
}

module.exports = db; 