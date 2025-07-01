const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有分类（公开API）
router.get('/', (req, res) => {
  db.all(
    'SELECT * FROM categories WHERE enabled = true ORDER BY sort_order, display_name',
    [],
    (err, categories) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      const formattedCategories = categories.map(category => ({
        ...category,
        enabled: Boolean(category.enabled)
      }));
      
      res.json({
        success: true,
        data: formattedCategories
      });
    }
  );
});

// 获取所有分类（管理员API，包括禁用的）
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    'SELECT * FROM categories ORDER BY sort_order, display_name',
    [],
    (err, categories) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      const formattedCategories = categories.map(category => ({
        ...category,
        enabled: Boolean(category.enabled)
      }));
      
      res.json({
        success: true,
        data: formattedCategories
      });
    }
  );
});

// 创建新分类（仅管理员）
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().withMessage('分类名称不能为空')
    .isLength({ min: 1, max: 50 }).withMessage('分类名称长度必须在1-50字符之间')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('分类名称只能包含字母、数字、下划线和连字符'),
  body('display_name').notEmpty().withMessage('显示名称不能为空')
    .isLength({ min: 1, max: 100 }).withMessage('显示名称长度必须在1-100字符之间'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述长度不能超过500字符'),
  body('emoji').optional().isLength({ min: 1, max: 10 }).withMessage('Emoji长度必须在1-10字符之间'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序顺序必须是非负整数')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, display_name, description, emoji = '📦', sort_order = 0 } = req.body;

  // 检查分类名称是否已存在
  db.get('SELECT id FROM categories WHERE name = ?', [name], (err, existingCategory) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (existingCategory) {
      return res.status(400).json({ error: '分类名称已存在' });
    }

    // 创建新分类
    db.run(
      'INSERT INTO categories (name, display_name, description, emoji, sort_order) VALUES (?, ?, ?, ?, ?)',
      [name, display_name, description || '', emoji, sort_order],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        // 返回新创建的分类
        db.get('SELECT * FROM categories WHERE id = ?', [this.lastID], (err, category) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          const formattedCategory = {
            ...category,
            enabled: Boolean(category.enabled)
          };
          
          res.status(201).json({
            success: true,
            message: '分类创建成功',
            data: formattedCategory
          });
        });
      }
    );
  });
});

// 更新分类（仅管理员）
router.put('/:id', authenticateToken, requireAdmin, [
  body('name').optional().notEmpty().withMessage('分类名称不能为空')
    .isLength({ min: 1, max: 50 }).withMessage('分类名称长度必须在1-50字符之间')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('分类名称只能包含字母、数字、下划线和连字符'),
  body('display_name').optional().notEmpty().withMessage('显示名称不能为空')
    .isLength({ min: 1, max: 100 }).withMessage('显示名称长度必须在1-100字符之间'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述长度不能超过500字符'),
  body('emoji').optional().isLength({ min: 1, max: 10 }).withMessage('Emoji长度必须在1-10字符之间'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序顺序必须是非负整数'),
  body('enabled').optional().isBoolean().withMessage('启用状态必须是布尔值')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, display_name, description, emoji, sort_order, enabled } = req.body;

  // 检查分类是否存在
  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, category) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 如果要更新名称，检查新名称是否与其他分类冲突
    if (name && name !== category.name) {
      db.get('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id], (err, existingCategory) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        if (existingCategory) {
          return res.status(400).json({ error: '分类名称已被使用' });
        }

        // 执行更新
        updateCategory();
      });
    } else {
      // 直接更新
      updateCategory();
    }

    function updateCategory() {
      const updates = [];
      const params = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (display_name !== undefined) {
        updates.push('display_name = ?');
        params.push(display_name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (emoji !== undefined) {
        updates.push('emoji = ?');
        params.push(emoji);
      }
      if (sort_order !== undefined) {
        updates.push('sort_order = ?');
        params.push(sort_order);
      }
      if (enabled !== undefined) {
        updates.push('enabled = ?');
        params.push(enabled);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: '没有提供要更新的字段' });
      }

      params.push(id);
      const sql = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;

      db.run(sql, params, function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        // 如果更新了分类名称，同时更新所有使用该分类的商品
        if (name && name !== category.name) {
          db.run(
            'UPDATE products SET category = ? WHERE category = ?',
            [name, category.name],
            (err) => {
              if (err) {
                console.error('Error updating products category:', err);
                // 不返回错误，因为分类已经更新成功
              } else {
                console.log(`Updated products from category "${category.name}" to "${name}"`);
              }
            }
          );
        }

        // 返回更新后的分类
        db.get('SELECT * FROM categories WHERE id = ?', [id], (err, updatedCategory) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: '服务器错误' });
          }
          
          const formattedCategory = {
            ...updatedCategory,
            enabled: Boolean(updatedCategory.enabled)
          };
          
          res.json({
            success: true,
            message: '分类更新成功',
            data: formattedCategory
          });
        });
      });
    }
  });
});

// 删除分类（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // 检查分类是否存在
  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, category) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 检查是否有商品使用此分类
    db.get('SELECT COUNT(*) as count FROM products WHERE category = ?', [category.name], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (result.count > 0) {
        return res.status(400).json({ 
          error: `无法删除分类，还有 ${result.count} 个商品使用此分类`,
          hasProducts: true,
          productCount: result.count
        });
      }

      // 删除分类
      db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        res.json({
          success: true,
          message: '分类已删除'
        });
      });
    });
  });
});

// 获取分类使用统计（仅管理员）
router.get('/:id/stats', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // 获取分类信息
  db.get('SELECT * FROM categories WHERE id = ?', [id], (err, category) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 获取使用统计
    db.get(
      'SELECT COUNT(*) as product_count FROM products WHERE category = ?',
      [category.name],
      (err, stats) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        res.json({
          success: true,
          data: {
            category: {
              ...category,
              enabled: Boolean(category.enabled)
            },
            stats: {
              product_count: stats.product_count
            }
          }
        });
      }
    );
  });
});

module.exports = router; 