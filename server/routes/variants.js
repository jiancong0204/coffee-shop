const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取所有细分类型
router.get('/types', (req, res) => {
  const sql = `
    SELECT * FROM product_variant_types 
    ORDER BY sort_order, display_name
  `;
  
  db.all(sql, [], (err, types) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    // 为每个类型获取选项
    const typePromises = types.map(type => {
      return new Promise((resolve, reject) => {
        const optionSql = `
          SELECT * FROM product_variant_options 
          WHERE variant_type_id = ? AND available = true
          ORDER BY sort_order, display_name
        `;
        
        db.all(optionSql, [type.id], (err, options) => {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              ...type, 
              options: options.map(option => ({
                ...option,
                available: Boolean(option.available)
              }))
            });
          }
        });
      });
    });
    
    Promise.all(typePromises)
      .then(typesWithOptions => {
        const formattedTypes = typesWithOptions.map(type => ({
          ...type,
          is_required: Boolean(type.is_required)
        }));
        res.json(formattedTypes);
      })
      .catch(err => {
        console.error('Database error:', err);
        res.status(500).json({ error: '服务器错误' });
      });
  });
});

// 获取商品的细分类型配置
router.get('/product/:productId', (req, res) => {
  const { productId } = req.params;
  
  const sql = `
    SELECT 
      vt.*,
      ptr.is_required as product_required,
      ptr.sort_order as product_sort_order
    FROM product_variant_types vt
    JOIN product_variant_type_relations ptr ON vt.id = ptr.variant_type_id
    WHERE ptr.product_id = ?
    ORDER BY ptr.sort_order, vt.sort_order, vt.display_name
  `;
  
  db.all(sql, [productId], (err, types) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    // 为每个类型获取选项（只获取该商品启用的选项）
    const typePromises = types.map(type => {
      return new Promise((resolve, reject) => {
        // 首先检查是否为该商品配置了具体的选项关系
        const checkConfigSql = `
          SELECT COUNT(*) as count 
          FROM product_variant_option_relations 
          WHERE product_id = ? AND variant_type_id = ?
        `;
        
        db.get(checkConfigSql, [productId, type.id], (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (result.count === 0) {
            // 没有配置具体选项，返回该类型的所有选项
            const allOptionsSql = `
              SELECT * FROM product_variant_options 
              WHERE variant_type_id = ? AND available = true
              ORDER BY sort_order, display_name
            `;
            
            db.all(allOptionsSql, [type.id], (err, allOptions) => {
              if (err) {
                reject(err);
              } else {
                resolve({ 
                  ...type,
                  is_required: Boolean(type.product_required),
                  sort_order: type.product_sort_order,
                  options: allOptions.map(option => ({
                    ...option,
                    available: Boolean(option.available),
                    product_enabled: true // 默认启用所有选项
                  }))
                });
              }
            });
          } else {
            // 已配置具体选项，只返回启用的选项
            const optionSql = `
              SELECT 
                vo.*,
                por.enabled as product_enabled,
                por.sort_order as product_sort_order
              FROM product_variant_options vo
              INNER JOIN product_variant_option_relations por 
                ON vo.id = por.variant_option_id 
                AND por.product_id = ? 
                AND por.variant_type_id = ?
              WHERE vo.variant_type_id = ? AND vo.available = true
              AND por.enabled = true
              ORDER BY COALESCE(por.sort_order, vo.sort_order), vo.display_name
            `;
            
            db.all(optionSql, [productId, type.id, type.id], (err, options) => {
              if (err) {
                reject(err);
              } else {
                resolve({ 
                  ...type,
                  is_required: Boolean(type.product_required),
                  sort_order: type.product_sort_order,
                  options: options.map(option => ({
                    ...option,
                    available: Boolean(option.available),
                    product_enabled: Boolean(option.product_enabled)
                  }))
                });
              }
            });
          }
        });
      });
    });
    
    Promise.all(typePromises)
      .then(typesWithOptions => {
        res.json(typesWithOptions);
      })
      .catch(err => {
        console.error('Database error:', err);
        res.status(500).json({ error: '服务器错误' });
      });
  });
});

// 创建细分类型（管理员）
router.post('/types', authenticateToken, requireAdmin, [
  body('name').notEmpty().withMessage('类型名称不能为空'),
  body('display_name').notEmpty().withMessage('显示名称不能为空')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, display_name, description, is_required = false, sort_order = 0 } = req.body;

  db.run(
    'INSERT INTO product_variant_types (name, display_name, description, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
    [name, display_name, description, is_required, sort_order],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      // 返回新创建的类型
      db.get('SELECT * FROM product_variant_types WHERE id = ?', [this.lastID], (err, type) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        res.status(201).json({
          ...type,
          is_required: Boolean(type.is_required),
          options: []
        });
      });
    }
  );
});

// 更新细分类型（管理员）
router.put('/types/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, display_name, description, is_required, sort_order } = req.body;

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
  if (is_required !== undefined) {
    updates.push('is_required = ?');
    params.push(is_required);
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?');
    params.push(sort_order);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有提供要更新的字段' });
  }

  params.push(id);
  const sql = `UPDATE product_variant_types SET ${updates.join(', ')} WHERE id = ?`;

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '细分类型不存在' });
    }

    // 返回更新后的类型
    db.get('SELECT * FROM product_variant_types WHERE id = ?', [id], (err, type) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      res.json({
        ...type,
        is_required: Boolean(type.is_required)
      });
    });
  });
});

// 删除细分类型（管理员）
router.delete('/types/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM product_variant_types WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '细分类型不存在' });
    }

    res.json({ message: '细分类型已删除' });
  });
});

// 创建细分选项（管理员）
router.post('/options', authenticateToken, requireAdmin, [
  body('variant_type_id').isInt({ min: 1 }).withMessage('细分类型ID必须是正整数'),
  body('name').notEmpty().withMessage('选项名称不能为空'),
  body('display_name').notEmpty().withMessage('显示名称不能为空'),
  body('price_adjustment').optional().isFloat().withMessage('价格调整必须是数字')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    variant_type_id, 
    name, 
    display_name, 
    price_adjustment = 0, 
    sort_order = 0,
    available = true 
  } = req.body;

  db.run(
    'INSERT INTO product_variant_options (variant_type_id, name, display_name, price_adjustment, sort_order, available) VALUES (?, ?, ?, ?, ?, ?)',
    [variant_type_id, name, display_name, price_adjustment, sort_order, available],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      // 返回新创建的选项
      db.get('SELECT * FROM product_variant_options WHERE id = ?', [this.lastID], (err, option) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        res.status(201).json({
          ...option,
          available: Boolean(option.available)
        });
      });
    }
  );
});

// 更新细分选项（管理员）
router.put('/options/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, display_name, price_adjustment, sort_order, available } = req.body;

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
  if (price_adjustment !== undefined) {
    updates.push('price_adjustment = ?');
    params.push(price_adjustment);
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?');
    params.push(sort_order);
  }
  if (available !== undefined) {
    updates.push('available = ?');
    params.push(available);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有提供要更新的字段' });
  }

  params.push(id);
  const sql = `UPDATE product_variant_options SET ${updates.join(', ')} WHERE id = ?`;

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '细分选项不存在' });
    }

    // 返回更新后的选项
    db.get('SELECT * FROM product_variant_options WHERE id = ?', [id], (err, option) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      res.json({
        ...option,
        available: Boolean(option.available)
      });
    });
  });
});

// 删除细分选项（管理员）
router.delete('/options/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  console.log(`[DELETE OPTION] Attempting to delete option with ID: ${id}`);

  // 先检查选项是否存在
  db.get('SELECT * FROM product_variant_options WHERE id = ?', [id], (err, option) => {
    if (err) {
      console.error('[DELETE OPTION] Database error checking option:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (!option) {
      console.log(`[DELETE OPTION] Option with ID ${id} not found`);
      return res.status(404).json({ error: '细分选项不存在' });
    }

    console.log(`[DELETE OPTION] Found option: ${option.display_name} (${option.name})`);

    // 检查是否有商品正在使用这个选项
    db.get(
      'SELECT COUNT(*) as count FROM product_variant_option_relations WHERE variant_option_id = ?',
      [id],
      (err, result) => {
        if (err) {
          console.error('[DELETE OPTION] Database error checking usage:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        console.log(`[DELETE OPTION] Option is used by ${result.count} product configurations`);

        // 执行删除（外键约束会自动处理关联记录）
        db.run('DELETE FROM product_variant_options WHERE id = ?', [id], function(err) {
          if (err) {
            console.error('[DELETE OPTION] Database error during deletion:', err);
            return res.status(500).json({ error: '删除失败：' + err.message });
          }

          if (this.changes === 0) {
            console.log(`[DELETE OPTION] No rows affected when deleting option ${id}`);
            return res.status(404).json({ error: '细分选项不存在' });
          }

          console.log(`[DELETE OPTION] Successfully deleted option ${id} (${option.display_name})`);
          res.json({ message: '细分选项已删除' });
        });
      }
    );
  });
});

// 为商品配置细分类型（管理员）
router.post('/product/:productId/types', authenticateToken, requireAdmin, [
  body('variant_type_id').isInt({ min: 1 }).withMessage('细分类型ID必须是正整数'),
  body('is_required').optional().isBoolean().withMessage('是否必选必须是布尔值'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序必须是非负整数')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { productId } = req.params;
  const { variant_type_id, is_required = false, sort_order = 0 } = req.body;

  db.run(
    'INSERT OR REPLACE INTO product_variant_type_relations (product_id, variant_type_id, is_required, sort_order) VALUES (?, ?, ?, ?)',
    [productId, variant_type_id, is_required, sort_order],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      res.json({ message: '商品细分类型配置已更新' });
    }
  );
});

// 移除商品的细分类型配置（管理员）
router.delete('/product/:productId/types/:variantTypeId', authenticateToken, requireAdmin, (req, res) => {
  const { productId, variantTypeId } = req.params;

  db.serialize(() => {
    // 先删除相关的选项配置
    db.run(
      'DELETE FROM product_variant_option_relations WHERE product_id = ? AND variant_type_id = ?',
      [productId, variantTypeId],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
      }
    );

    // 再删除类型配置
    db.run(
      'DELETE FROM product_variant_type_relations WHERE product_id = ? AND variant_type_id = ?',
      [productId, variantTypeId],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '配置不存在' });
        }

        res.json({ message: '商品细分类型配置已移除' });
      }
    );
  });
});

// 配置商品的细分选项（管理员）
router.post('/product/:productId/options', authenticateToken, requireAdmin, [
  body('variant_type_id').isInt({ min: 1 }).withMessage('细分类型ID必须是正整数'),
  body('enabled_options').isArray().withMessage('启用的选项必须是数组'),
  body('enabled_options.*').isInt({ min: 1 }).withMessage('选项ID必须是正整数')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { productId } = req.params;
  const { variant_type_id, enabled_options } = req.body;

  db.serialize(() => {
    // 先删除该商品该类型的所有选项配置
    db.run(
      'DELETE FROM product_variant_option_relations WHERE product_id = ? AND variant_type_id = ?',
      [productId, variant_type_id],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
      }
    );

    // 添加启用的选项配置
    if (enabled_options && enabled_options.length > 0) {
      let successCount = 0;
      let errorOccurred = false;

            // 获取每个选项的原始排序信息
      const optionOrderSql = `
        SELECT id, sort_order FROM product_variant_options 
        WHERE id IN (${enabled_options.map(() => '?').join(',')})
      `;
      
      db.all(optionOrderSql, enabled_options, (err, optionOrders) => {
        if (err) {
          console.error('Database error getting option orders:', err);
          return res.status(500).json({ error: '服务器错误' });
        }
        
        let successCount = 0;
        let errorOccurred = false;

        enabled_options.forEach((optionId, index) => {
          // 找到对应选项的信息，使用原始排序
          const optionInfo = optionOrders.find(opt => opt.id === optionId);
          const sortOrder = optionInfo ? optionInfo.sort_order : index;
          
          db.run(
            'INSERT INTO product_variant_option_relations (product_id, variant_type_id, variant_option_id, enabled, sort_order) VALUES (?, ?, ?, ?, ?)',
            [productId, variant_type_id, optionId, true, sortOrder],
            function(err) {
              if (err && !errorOccurred) {
                console.error('Database error:', err);
                errorOccurred = true;
                return res.status(500).json({ error: '服务器错误' });
              }

              successCount++;
              if (successCount === enabled_options.length && !errorOccurred) {
                res.json({ message: '商品细分选项配置已更新' });
              }
            }
          );
        });
      });
    } else {
      // 如果没有启用的选项，表示该商品在此类型下没有可选选项
      res.json({ message: '商品细分选项配置已更新（无可选选项）' });
    }
  });
});

// 获取商品的细分选项配置（管理员）
router.get('/product/:productId/options/:variantTypeId', authenticateToken, requireAdmin, (req, res) => {
  const { productId, variantTypeId } = req.params;

  const sql = `
    SELECT 
      vo.*,
      por.enabled as product_enabled,
      por.sort_order as product_sort_order
    FROM product_variant_options vo
    LEFT JOIN product_variant_option_relations por 
      ON vo.id = por.variant_option_id 
      AND por.product_id = ? 
      AND por.variant_type_id = ?
    WHERE vo.variant_type_id = ? AND vo.available = true
    ORDER BY 
      CASE WHEN por.sort_order IS NOT NULL THEN por.sort_order ELSE 999 END,
      vo.sort_order,
      vo.display_name
  `;

  db.all(sql, [productId, variantTypeId, variantTypeId], (err, options) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    // 检查是否有任何选项配置记录
    const hasConfig = options.some(option => option.product_enabled !== null);

    const formattedOptions = options.map(option => ({
      ...option,
      available: Boolean(option.available),
      // 如果没有配置记录，默认为true；如果有配置记录，则使用配置的值
      product_enabled: hasConfig ? Boolean(option.product_enabled) : true
    }));

    res.json(formattedOptions);
  });
});

module.exports = router; 