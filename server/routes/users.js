const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 获取所有顾客用户列表 (仅管理员)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const sql = `
    SELECT 
      id,
      username,
      role,
      created_at,
      (SELECT COUNT(*) FROM orders WHERE user_id = users.id AND status = 'completed') as total_orders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = users.id AND status = 'completed') as total_spent
    FROM users 
    WHERE role = 'customer'
    ORDER BY created_at DESC
  `;
  
  db.all(sql, [], (err, users) => {
    if (err) {
      console.error('获取用户列表失败:', err);
      return res.status(500).json({ error: '获取用户列表失败' });
    }
    
    res.json({
      success: true,
      data: users
    });
  });
});

// 获取指定用户的详细信息和订单历史 (仅管理员)
router.get('/:userId', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.userId;
  
  // 获取用户基本信息
  const userSql = `
    SELECT 
      id,
      username,
      role,
      created_at
    FROM users 
    WHERE id = ? AND role = 'customer'
  `;
  
  db.get(userSql, [userId], (err, user) => {
    if (err) {
      console.error('获取用户信息失败:', err);
      return res.status(500).json({ error: '获取用户信息失败' });
    }
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 获取用户的订单历史（包含细分选项）
    const ordersSql = `
      SELECT 
        o.id,
        o.pickup_number,
        o.total_amount,
        o.status,
        o.created_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
    
    db.all(ordersSql, [userId], async (err, orders) => {
      if (err) {
        console.error('获取用户订单失败:', err);
        return res.status(500).json({ error: '获取用户订单失败' });
      }
      
      // 为每个订单获取详细的商品信息（包括细分选项）
      const processedOrders = [];
      
      for (const order of orders || []) {
        const itemsSql = `
          SELECT 
            oi.quantity,
            oi.price,
            oi.variant_selections,
            p.name as product_name
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
        `;
        
        try {
          const items = await new Promise((resolve, reject) => {
            db.all(itemsSql, [order.id], (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
          
          // 格式化商品信息，包括细分选项
          const formattedItems = [];
          
          for (const item of items) {
            let itemText = `${item.product_name}`;
            
            // 解析细分选项
            if (item.variant_selections) {
              try {
                const selections = JSON.parse(item.variant_selections);
                const variantTexts = [];
                
                for (const [typeId, selectionData] of Object.entries(selections)) {
                  // 检查数据格式：如果是新格式（包含完整信息），直接使用
                  if (typeof selectionData === 'object' && selectionData.option_display_name) {
                    variantTexts.push(selectionData.option_display_name);
                  } else {
                    // 如果是老格式（只有optionId），查询数据库获取详细信息
                    const optionId = selectionData;
                    const optionSql = `
                      SELECT 
                        vt.display_name as type_name,
                        vo.display_name as option_name
                      FROM product_variant_options vo
                      LEFT JOIN product_variant_types vt ON vo.variant_type_id = vt.id
                      WHERE vo.id = ?
                    `;
                    
                    // 同步查询选项名称
                    const optionInfo = await new Promise((resolve, reject) => {
                      db.get(optionSql, [optionId], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                      });
                    });
                    
                    if (optionInfo) {
                      variantTexts.push(optionInfo.option_name);
                    }
                  }
                }
                
                if (variantTexts.length > 0) {
                  itemText += `(${variantTexts.join(', ')})`;
                }
              } catch (e) {
                console.error('解析细分选项失败:', e);
              }
            }
            
            itemText += ` x${item.quantity}`;
            formattedItems.push(itemText);
          }
          
          processedOrders.push({
            ...order,
            items: formattedItems.join(', ')
          });
        } catch (error) {
          console.error('处理订单商品失败:', error);
          processedOrders.push({
            ...order,
            items: '获取商品信息失败'
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          user,
          orders: processedOrders
        }
      });
    });
  });
});

// 获取所有历史订单 (仅管理员)
router.get('/history/orders', authenticateToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const status = req.query.status;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  
  let whereClause = '1=1';
  let params = [];
  
  // 状态筛选
  if (status && status !== 'all') {
    whereClause += ' AND o.status = ?';
    params.push(status);
  }
  
  // 日期筛选
  if (startDate) {
    whereClause += ' AND DATE(o.created_at) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND DATE(o.created_at) <= ?';
    params.push(endDate);
  }
  
  // 获取总数
  const countSql = `
    SELECT COUNT(*) as total
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE ${whereClause}
  `;
  
  db.get(countSql, params, (err, countResult) => {
    if (err) {
      console.error('获取订单总数失败:', err);
      return res.status(500).json({ error: '获取订单总数失败' });
    }
    
    // 获取分页数据
    const dataSql = `
      SELECT 
        o.id,
        o.pickup_number,
        o.total_amount,
        o.status,
        o.created_at,
        u.username as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...params, limit, offset];
    
    db.all(dataSql, dataParams, async (err, orders) => {
      if (err) {
        console.error('获取订单列表失败:', err);
        return res.status(500).json({ error: '获取订单列表失败' });
      }
      
      // 为每个订单获取详细的商品信息（包括细分选项）
      const processedOrders = [];
      
      for (const order of orders || []) {
        const itemsSql = `
          SELECT 
            oi.quantity,
            oi.price,
            oi.variant_selections,
            p.name as product_name
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
        `;
        
        try {
          const items = await new Promise((resolve, reject) => {
            db.all(itemsSql, [order.id], (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
          
          // 格式化商品信息，包括细分选项
          const formattedItems = [];
          
          for (const item of items) {
            let itemText = `${item.product_name}`;
            
            // 解析细分选项
            if (item.variant_selections) {
              try {
                const selections = JSON.parse(item.variant_selections);
                const variantTexts = [];
                
                for (const [typeId, selectionData] of Object.entries(selections)) {
                  // 检查数据格式：如果是新格式（包含完整信息），直接使用
                  if (typeof selectionData === 'object' && selectionData.option_display_name) {
                    variantTexts.push(selectionData.option_display_name);
                  } else {
                    // 如果是老格式（只有optionId），查询数据库获取详细信息
                    const optionId = selectionData;
                    const optionSql = `
                      SELECT 
                        vt.display_name as type_name,
                        vo.display_name as option_name
                      FROM product_variant_options vo
                      LEFT JOIN product_variant_types vt ON vo.variant_type_id = vt.id
                      WHERE vo.id = ?
                    `;
                    
                    // 同步查询选项名称
                    const optionInfo = await new Promise((resolve, reject) => {
                      db.get(optionSql, [optionId], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                      });
                    });
                    
                    if (optionInfo) {
                      variantTexts.push(optionInfo.option_name);
                    }
                  }
                }
                
                if (variantTexts.length > 0) {
                  itemText += `(${variantTexts.join(', ')})`;
                }
              } catch (e) {
                console.error('解析细分选项失败:', e);
              }
            }
            
            itemText += ` x${item.quantity}`;
            formattedItems.push(itemText);
          }
          
          processedOrders.push({
            ...order,
            items: formattedItems.join(', ')
          });
        } catch (error) {
          console.error('处理订单商品失败:', error);
          processedOrders.push({
            ...order,
            items: '获取商品信息失败'
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          orders: processedOrders,
          pagination: {
            current: page,
            pageSize: limit,
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / limit)
          }
        }
      });
    });
  });
});

// 获取当前用户的统计信息
router.get('/profile/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // 获取用户的统计信息
  const statsSql = `
    SELECT 
      (SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'completed') as completed_orders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = ? AND status = 'completed') as total_spent
  `;
  
  db.get(statsSql, [userId, userId], (err, stats) => {
    if (err) {
      console.error('获取用户统计信息失败:', err);
      return res.status(500).json({ error: '获取统计信息失败' });
    }
    
    // 计算平均订单金额
    const averageAmount = stats.completed_orders > 0 
      ? (stats.total_spent / stats.completed_orders) 
      : 0;
    
    res.json({
      success: true,
      data: {
        completed_orders: stats.completed_orders,
        total_spent: parseFloat(stats.total_spent) || 0,
        average_amount: parseFloat(averageAmount.toFixed(2))
      }
    });
  });
});

// 用户修改自己的用户名
router.put('/profile/username', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { username } = req.body;
  
  // 验证输入
  if (!username || !username.trim()) {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  
  const trimmedUsername = username.trim();
  
  // 检查用户名长度
  if (trimmedUsername.length < 2 || trimmedUsername.length > 20) {
    return res.status(400).json({ error: '用户名长度必须在2-20个字符之间' });
  }
  
  // 首先获取当前用户信息
  db.get('SELECT username, role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('查询用户失败:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.role !== 'customer') {
      return res.status(400).json({ error: '只有顾客用户可以修改用户名' });
    }
    
    // 检查新用户名是否已被使用（排除当前用户）
    db.get('SELECT id FROM users WHERE username = ? AND id != ?', [trimmedUsername, userId], (err, existingUser) => {
      if (err) {
        console.error('检查用户名重复失败:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      if (existingUser) {
        return res.status(400).json({ error: '用户名已被使用' });
      }
      
      // 更新用户名
      db.run('UPDATE users SET username = ? WHERE id = ?', [trimmedUsername, userId], function(err) {
        if (err) {
          console.error('更新用户名失败:', err);
          return res.status(500).json({ error: '更新用户名失败' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({
          success: true,
          message: `用户名已从 "${user.username}" 更改为 "${trimmedUsername}"`,
          data: {
            id: userId,
            oldUsername: user.username,
            newUsername: trimmedUsername
          }
        });
      });
    });
  });
});

// 更新顾客用户名 (仅管理员)
router.put('/:userId/username', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.userId;
  const { username } = req.body;
  
  // 验证输入
  if (!username || !username.trim()) {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  
  const trimmedUsername = username.trim();
  
  // 检查用户名长度
  if (trimmedUsername.length < 2 || trimmedUsername.length > 20) {
    return res.status(400).json({ error: '用户名长度必须在2-20个字符之间' });
  }
  
  // 首先检查目标用户是否存在且为顾客
  db.get('SELECT id, username, role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('查询用户失败:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.role !== 'customer') {
      return res.status(400).json({ error: '只能修改顾客用户名' });
    }
    
    // 检查新用户名是否已被使用（排除当前用户）
    db.get('SELECT id FROM users WHERE username = ? AND id != ?', [trimmedUsername, userId], (err, existingUser) => {
      if (err) {
        console.error('检查用户名重复失败:', err);
        return res.status(500).json({ error: '服务器错误' });
      }
      
      if (existingUser) {
        return res.status(400).json({ error: '用户名已被使用' });
      }
      
      // 更新用户名
      db.run('UPDATE users SET username = ? WHERE id = ?', [trimmedUsername, userId], function(err) {
        if (err) {
          console.error('更新用户名失败:', err);
          return res.status(500).json({ error: '更新用户名失败' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({
          success: true,
          message: `用户名已从 "${user.username}" 更改为 "${trimmedUsername}"`,
          data: {
            id: userId,
            oldUsername: user.username,
            newUsername: trimmedUsername
          }
        });
      });
    });
  });
});

// 删除顾客账号 (仅管理员)
router.delete('/:userId', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.userId;
  
  // 首先检查是否为管理员账号
  db.get('SELECT role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('查询用户失败:', err);
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ error: '不能删除管理员账号' });
    }
    
    // 开始事务删除用户及相关数据
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // 删除用户的购物车
      db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
        if (err) {
          console.error('删除购物车失败:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: '删除用户数据失败' });
        }
        
        // 删除用户的订单项
        db.run(`DELETE FROM order_items WHERE order_id IN 
                (SELECT id FROM orders WHERE user_id = ?)`, [userId], (err) => {
          if (err) {
            console.error('删除订单项失败:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: '删除用户数据失败' });
          }
          
          // 删除用户的订单
          db.run('DELETE FROM orders WHERE user_id = ?', [userId], (err) => {
            if (err) {
              console.error('删除订单失败:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: '删除用户数据失败' });
            }
            
            // 最后删除用户
            db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
              if (err) {
                console.error('删除用户失败:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: '删除用户失败' });
              }
              
              if (this.changes === 0) {
                db.run('ROLLBACK');
                return res.status(404).json({ error: '用户不存在' });
              }
              
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('提交事务失败:', err);
                  return res.status(500).json({ error: '删除操作失败' });
                }
                
                res.json({ 
                  success: true, 
                  message: '用户账号及相关数据已删除' 
                });
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router; 