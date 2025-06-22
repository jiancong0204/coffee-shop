const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有标签（管理员专用）
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM tags ORDER BY name', [], (err, tags) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    res.json(tags);
  });
});

// 创建标签（管理员专用）
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().trim().isLength({ max: 20 }).withMessage('标签名称不能为空且不超过20字符')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, color = 'gold' } = req.body;

  db.run('INSERT INTO tags (name, color) VALUES (?, ?)', [name, color], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: '标签名称已存在' });
      }
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    db.get('SELECT * FROM tags WHERE id = ?', [this.lastID], (err, tag) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      res.status(201).json(tag);
    });
  });
});

// 删除标签（管理员专用）
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // 先删除商品标签关联
  db.run('DELETE FROM product_tags WHERE tag_id = ?', [id], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    // 再删除标签
    db.run('DELETE FROM tags WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '标签不存在' });
      }

      res.json({ message: '标签已删除' });
    });
  });
});

// 获取商品的标签
router.get('/product/:productId', (req, res) => {
  const { productId } = req.params;
  
  const sql = `
    SELECT t.*, pt.sort_order 
    FROM tags t 
    JOIN product_tags pt ON t.id = pt.tag_id 
    WHERE pt.product_id = ? 
    ORDER BY pt.sort_order, t.name
  `;
  
  db.all(sql, [productId], (err, tags) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    res.json(tags);
  });
});

// 设置商品标签（管理员专用）
router.put('/product/:productId', authenticateToken, requireAdmin, (req, res) => {
  const { productId } = req.params;
  const { tagIds } = req.body; // 标签ID数组，最多3个

  if (!Array.isArray(tagIds) || tagIds.length > 3) {
    return res.status(400).json({ error: '标签数量不能超过3个' });
  }

  // 先删除商品的所有标签
  db.run('DELETE FROM product_tags WHERE product_id = ?', [productId], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    // 添加新的标签关联
    const promises = tagIds.map((tagId, index) => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO product_tags (product_id, tag_id, sort_order) VALUES (?, ?, ?)',
          [productId, tagId, index],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });

    Promise.all(promises)
      .then(() => {
        res.json({ message: '商品标签已更新' });
      })
      .catch((err) => {
        console.error('Database error:', err);
        res.status(500).json({ error: '服务器错误' });
      });
  });
});

module.exports = router; 