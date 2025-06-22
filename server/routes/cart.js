const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取购物车
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      c.id as cart_id,
      c.quantity,
      p.id as product_id,
      p.name,
      p.description,
      p.price,
      p.image_url,
      p.category,
      (p.price * c.quantity) as total_price
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ? AND p.available = true
    ORDER BY c.created_at DESC
  `;

  db.all(sql, [userId], (err, cartItems) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    res.json({
      items: cartItems,
      totalAmount: totalAmount,
      itemCount: cartItems.length
    });
  });
});

// 添加商品到购物车
router.post('/add', authenticateToken, [
  body('product_id').isInt({ min: 1 }).withMessage('商品ID必须是正整数'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('数量必须是正整数')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { product_id, quantity = 1 } = req.body;

  // 检查商品是否存在且可用
  db.get('SELECT * FROM products WHERE id = ? AND available = true', [product_id], (err, product) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (!product) {
      return res.status(404).json({ error: '商品不存在或不可用' });
    }

    // 检查购物车中是否已有该商品
    db.get('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, product_id], (err, existingItem) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (existingItem) {
        // 更新数量
        const newQuantity = existingItem.quantity + quantity;
        db.run(
          'UPDATE cart SET quantity = ? WHERE id = ?',
          [newQuantity, existingItem.id],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: '服务器错误' });
            }
            res.json({ message: '商品已添加到购物车', cart_id: existingItem.id });
          }
        );
      } else {
        // 新增商品
        db.run(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [userId, product_id, quantity],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: '服务器错误' });
            }
            res.status(201).json({ message: '商品已添加到购物车', cart_id: this.lastID });
          }
        );
      }
    });
  });
});

// 更新购物车商品数量
router.put('/:cart_id', authenticateToken, [
  body('quantity').isInt({ min: 1 }).withMessage('数量必须是正整数')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { cart_id } = req.params;
  const { quantity } = req.body;

  db.run(
    'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
    [quantity, cart_id, userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '购物车项目不存在' });
      }

      res.json({ message: '数量已更新' });
    }
  );
});

// 从购物车删除商品
router.delete('/:cart_id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { cart_id } = req.params;

  db.run(
    'DELETE FROM cart WHERE id = ? AND user_id = ?',
    [cart_id, userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '购物车项目不存在' });
      }

      res.json({ message: '商品已从购物车删除' });
    }
  );
});

// 清空购物车
router.delete('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.run('DELETE FROM cart WHERE user_id = ?', [userId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    res.json({ message: '购物车已清空' });
  });
});

module.exports = router; 