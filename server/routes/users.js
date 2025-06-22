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
      (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as total_orders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = users.id) as total_spent
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
    
    // 获取用户的订单历史
    const ordersSql = `
      SELECT 
        o.id,
        o.pickup_number,
        o.total_amount,
        o.status,
        o.created_at,
        GROUP_CONCAT(
          p.name || ' x' || oi.quantity,
          ', '
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    
    db.all(ordersSql, [userId], (err, orders) => {
      if (err) {
        console.error('获取用户订单失败:', err);
        return res.status(500).json({ error: '获取用户订单失败' });
      }
      
      res.json({
        success: true,
        data: {
          user,
          orders: orders || []
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
        u.username as customer_name,
        GROUP_CONCAT(
          p.name || ' x' || oi.quantity,
          ', '
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...params, limit, offset];
    
    db.all(dataSql, dataParams, (err, orders) => {
      if (err) {
        console.error('获取订单列表失败:', err);
        return res.status(500).json({ error: '获取订单列表失败' });
      }
      
      res.json({
        success: true,
        data: {
          orders: orders || [],
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

module.exports = router; 