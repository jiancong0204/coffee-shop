const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有商品（公开）
router.get('/', (req, res) => {
  const { category } = req.query;
  
  // 修改查询条件：显示所有商品，但标记库存状态
  let sql = 'SELECT *, CASE WHEN unlimited_supply = 1 THEN 1 WHEN available_num > 0 THEN 1 ELSE 0 END as in_stock FROM products WHERE available = true';
  let params = [];
  
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  
  sql += ' ORDER BY category, name';
  
  db.all(sql, params, (err, products) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
        
    // 为每个商品获取标签
    const productPromises = products.map(product => {
      return new Promise((resolve, reject) => {
        const tagSql = `
          SELECT t.*, pt.sort_order 
          FROM tags t 
          JOIN product_tags pt ON t.id = pt.tag_id 
          WHERE pt.product_id = ? 
          ORDER BY pt.sort_order, t.name
        `;
        
        db.all(tagSql, [product.id], (err, tags) => {
          if (err) {
            console.error(`[PUBLIC API] Error fetching tags for product ${product.id} (${product.name}):`, err);
            reject(err);
          } else {
            resolve({ ...product, tags });
          }
        });
      });
    });
    
    Promise.all(productPromises)
      .then(productsWithTags => {
        // 确保布尔值类型正确转换
        const formattedProducts = productsWithTags.map(product => ({
          ...product,
          available: Boolean(product.available),
          unlimited_supply: Boolean(product.unlimited_supply)
        }));
        res.json(formattedProducts);
      })
      .catch(err => {
        console.error('Database error:', err);
        res.status(500).json({ error: '服务器错误' });
      });
  });
});

// 获取所有商品（管理员专用，包括不可用商品）
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  const { category } = req.query;
  
  let sql = 'SELECT * FROM products';
  let params = [];
  
  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }
  
  sql += ' ORDER BY category, name';
  
  db.all(sql, params, (err, products) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    
    // 为每个商品获取标签
    const productPromises = products.map(product => {
      return new Promise((resolve, reject) => {
        const tagSql = `
          SELECT t.*, pt.sort_order 
          FROM tags t 
          JOIN product_tags pt ON t.id = pt.tag_id 
          WHERE pt.product_id = ? 
          ORDER BY pt.sort_order, t.name
        `;
        
        db.all(tagSql, [product.id], (err, tags) => {
          if (err) {
            console.error(`[ADMIN API] Error fetching tags for product ${product.id} (${product.name}):`, err);
            reject(err);
          } else {
            resolve({ ...product, tags });
          }
        });
      });
    });
    
    Promise.all(productPromises)
      .then(productsWithTags => {
        // 确保布尔值类型正确转换
        const formattedProducts = productsWithTags.map(product => ({
          ...product,
          available: Boolean(product.available),
          unlimited_supply: Boolean(product.unlimited_supply)
        }));
        res.json(formattedProducts);
      })
      .catch(err => {
        console.error('Database error:', err);
        res.status(500).json({ error: '服务器错误' });
      });
  });
});

// 获取单个商品（公开）
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM products WHERE id = ? AND available = true', [id], (err, product) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 确保布尔值类型正确转换
    const formattedProduct = {
      ...product,
      available: Boolean(product.available),
      unlimited_supply: Boolean(product.unlimited_supply)
    };
    res.json(formattedProduct);
  });
});

// 添加商品（仅管理员）
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().withMessage('商品名称不能为空'),
  body('price').isFloat({ min: 0 }).withMessage('价格必须是大于等于0的数字'),
  body('category').notEmpty().withMessage('商品分类不能为空'),
  body('unlimited_supply').optional().isBoolean().withMessage('库存模式必须是布尔值'),
  body('available_num').optional().isInt({ min: 0 }).withMessage('库存数量必须是非负整数')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, 
    description, 
    price, 
    category, 
    image_url, 
    unlimited_supply = false, 
    available_num = 100 
  } = req.body;

  // 如果是不限量供应，available_num 设为 NULL
  const finalAvailableNum = unlimited_supply ? null : available_num;

  db.run(
    'INSERT INTO products (name, description, price, category, image_url, unlimited_supply, available_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, description || '', price, category, image_url || '', unlimited_supply, finalAvailableNum],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      // 返回新创建的商品
      db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, product) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        // 确保布尔值类型正确转换
        const formattedProduct = {
          ...product,
          available: Boolean(product.available),
          unlimited_supply: Boolean(product.unlimited_supply)
        };
        res.status(201).json(formattedProduct);
      });
    }
  );
});

// 更新商品（仅管理员）
router.put('/:id', authenticateToken, requireAdmin, [
  body('name').optional().notEmpty().withMessage('商品名称不能为空'),
  body('price').optional().isFloat({ min: 0 }).withMessage('价格必须是大于等于0的数字'),
  body('category').optional().notEmpty().withMessage('商品分类不能为空')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, description, price, category, image_url, available, available_num, unlimited_supply } = req.body;

  // 构建更新SQL
  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (price !== undefined) {
    updates.push('price = ?');
    params.push(price);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category);
  }
  if (image_url !== undefined) {
    updates.push('image_url = ?');
    params.push(image_url);
  }
  if (available !== undefined) {
    updates.push('available = ?');
    params.push(available);
  }
  if (available_num !== undefined) {
    updates.push('available_num = ?');
    params.push(available_num);
  }
  if (unlimited_supply !== undefined) {
    updates.push('unlimited_supply = ?');
    params.push(unlimited_supply);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有提供要更新的字段' });
  }

  params.push(id);
  const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '商品不存在' });
    }

    // 返回更新后的商品
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      // 确保布尔值类型正确转换
      const formattedProduct = {
        ...product,
        available: Boolean(product.available),
        unlimited_supply: Boolean(product.unlimited_supply)
      };
      res.json(formattedProduct);
    });
  });
});

// 删除商品（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '商品不存在' });
    }

    res.json({ message: '商品已删除' });
  });
});

// 获取商品分类（公开）
router.get('/categories/list', (req, res) => {
  db.all(
    'SELECT DISTINCT category FROM products WHERE available = true ORDER BY category',
    [],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      const categories = rows.map(row => row.category);
      res.json(categories);
    }
  );
});

// 减少商品库存（内部使用）
function decreaseStock(productId, quantity, callback) {
  // 首先检查商品是否为不限量供应
  db.get('SELECT unlimited_supply, available_num FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) {
      return callback(err, null);
    }
    
    if (!product) {
      return callback(new Error('商品不存在'), null);
    }
    
    // 如果是不限量供应，直接返回成功
    if (product.unlimited_supply) {
      return callback(null, { success: true, unlimited: true });
    }
    
    // 检查库存是否足够
    if (product.available_num < quantity) {
      return callback(new Error('库存不足'), null);
    }
    
    // 减少库存
    db.run(
      'UPDATE products SET available_num = available_num - ? WHERE id = ? AND available_num >= ?',
      [quantity, productId, quantity],
      function(err) {
        if (err) {
          return callback(err, null);
        }
        
        if (this.changes === 0) {
          return callback(new Error('库存不足或商品不存在'), null);
        }
        
        callback(null, { success: true, unlimited: false, newStock: product.available_num - quantity });
      }
    );
  });
}

// 增加商品库存（内部使用）
function increaseStock(productId, quantity, callback) {
  // 首先检查商品是否为不限量供应
  db.get('SELECT unlimited_supply, available_num FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) {
      return callback(err, null);
    }
    
    if (!product) {
      return callback(new Error('商品不存在'), null);
    }
    
    // 如果是不限量供应，直接返回成功
    if (product.unlimited_supply) {
      return callback(null, { success: true, unlimited: true });
    }
    
    // 增加库存
    db.run(
      'UPDATE products SET available_num = available_num + ? WHERE id = ?',
      [quantity, productId],
      function(err) {
        if (err) {
          return callback(err, null);
        }
        
        if (this.changes === 0) {
          return callback(new Error('商品不存在'), null);
        }
        
        callback(null, { success: true, unlimited: false, newStock: product.available_num + quantity });
      }
    );
  });
}

// 检查商品库存（公开API）
router.get('/:id/stock', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT id, name, available_num, unlimited_supply FROM products WHERE id = ? AND available = true', [id], (err, product) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    res.json({
      id: product.id,
      name: product.name,
      available_num: product.available_num,
      unlimited_supply: product.unlimited_supply,
      in_stock: product.unlimited_supply || product.available_num > 0
    });
  });
});

// 导出库存管理函数供其他模块使用
router.decreaseStock = decreaseStock;
router.increaseStock = increaseStock;

module.exports = router; 