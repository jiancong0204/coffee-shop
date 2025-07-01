const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 创建预定
router.post('/', authenticateToken, (req, res) => {
  const { product_id, quantity, reservation_date, variant_selections, notes } = req.body;
  const user_id = req.user.id;

  // 验证输入
  if (!product_id || !quantity || !reservation_date) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 验证预定日期（只能预定未来3天内，不能预定当天）
  const today = new Date();
  today.setHours(23, 59, 59, 999); // 设置为今天的最后一刻
  const reserveDate = new Date(reservation_date);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 3);
  maxDate.setHours(23, 59, 59, 999);
  
  if (reserveDate <= today || reserveDate > maxDate) {
    return res.status(400).json({ error: '预定日期必须在明天到未来3天内' });
  }

  // 验证数量
  if (quantity < 1 || quantity > 10) {
    return res.status(400).json({ error: '预定数量必须在1-10之间' });
  }

  // 验证备注长度
  if (notes && notes.length > 100) {
    return res.status(400).json({ error: '备注不能超过100字' });
  }

  // 检查商品是否存在且库存为0
  db.get(
    'SELECT * FROM products WHERE id = ?',
    [product_id],
    (err, product) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '数据库错误' });
      }

      if (!product) {
        return res.status(404).json({ error: '商品不存在' });
      }

      if (!product.available) {
        return res.status(400).json({ error: '商品已下架，无法预定' });
      }

      if (!product.reservation_enabled) {
        return res.status(400).json({ error: '该商品不支持预定' });
      }

      if (product.unlimited_supply || product.available_num > 0) {
        return res.status(400).json({ error: '商品有库存，无需预定' });
      }

      // 计算总价格（包括细分选项的价格调整）
      let totalAmount = product.price * quantity;
      
      if (variant_selections) {
        for (const [typeId, selectionData] of Object.entries(variant_selections)) {
          if (selectionData && selectionData.price_adjustment) {
            totalAmount += selectionData.price_adjustment * quantity;
          }
        }
      }

      // 创建预定（需要支付）
      const insertSql = `
        INSERT INTO reservations (user_id, product_id, quantity, reservation_date, variant_selections, notes, total_amount, is_paid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(
        insertSql,
        [user_id, product_id, quantity, reservation_date, JSON.stringify(variant_selections || {}), notes || '', totalAmount, true], // 直接设为已支付（简化支付流程）
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: '创建预定失败' });
          }

          // 获取创建的预定详情
          db.get(
            `SELECT r.*, p.name as product_name, p.price, p.image_url, u.username
             FROM reservations r
             JOIN products p ON r.product_id = p.id
             JOIN users u ON r.user_id = u.id
             WHERE r.id = ?`,
            [this.lastID],
            (err, reservation) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: '获取预定详情失败' });
              }

              // 解析variant_selections
              if (reservation.variant_selections) {
                try {
                  reservation.variant_selections = JSON.parse(reservation.variant_selections);
                } catch (e) {
                  reservation.variant_selections = {};
                }
              }

              res.json({
                message: '预定创建成功，支付完成',
                data: reservation
              });
            }
          );
        }
      );
    }
  );
});

// 获取用户的预定列表
router.get('/my', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  
  const sql = `
    SELECT r.*, p.name as product_name, p.price, p.image_url
    FROM reservations r
    JOIN products p ON r.product_id = p.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;
  
  db.all(sql, [user_id], (err, reservations) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '获取预定列表失败' });
    }

    // 解析variant_selections
    reservations.forEach(reservation => {
      if (reservation.variant_selections) {
        try {
          const parsed = JSON.parse(reservation.variant_selections);
          // 确保解析后的数据是对象类型
          reservation.variant_selections = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
        } catch (e) {
          console.error('Error parsing variant_selections:', e);
          reservation.variant_selections = {};
        }
      } else {
        // 如果为null或undefined，设置为空对象
        reservation.variant_selections = {};
      }
    });

    res.json({ data: reservations });
  });
});

// 取消预定
router.delete('/:id', authenticateToken, (req, res) => {
  const reservation_id = req.params.id;
  const user_id = req.user.id;
  
  // 检查预定是否存在且属于当前用户
  db.get(
    'SELECT * FROM reservations WHERE id = ? AND user_id = ?',
    [reservation_id, user_id],
    (err, reservation) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '数据库错误' });
      }

      if (!reservation) {
        return res.status(404).json({ error: '预定不存在或无权限' });
      }

      if (reservation.status !== 'pending') {
        return res.status(400).json({ error: '只能取消待处理的预定' });
      }

      // 删除预定
      db.run(
        'DELETE FROM reservations WHERE id = ?',
        [reservation_id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: '取消预定失败' });
          }

          res.json({ message: '预定已取消' });
        }
      );
    }
  );
});

// 管理员获取所有预定
router.get('/admin/all', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const { status, date } = req.query;
  let sql = `
    SELECT r.*, p.name as product_name, p.price, p.image_url, u.username
    FROM reservations r
    JOIN products p ON r.product_id = p.id
    JOIN users u ON r.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    sql += ' AND r.status = ?';
    params.push(status);
  }

  if (date) {
    sql += ' AND DATE(r.reservation_date) = ?';
    params.push(date);
  }

  sql += ' ORDER BY r.created_at DESC';

  db.all(sql, params, (err, reservations) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '获取预定列表失败' });
    }

    // 解析variant_selections
    reservations.forEach(reservation => {
      if (reservation.variant_selections) {
        try {
          const parsed = JSON.parse(reservation.variant_selections);
          // 确保解析后的数据是对象类型
          reservation.variant_selections = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
        } catch (e) {
          console.error('Error parsing variant_selections:', e);
          reservation.variant_selections = {};
        }
      } else {
        // 如果为null或undefined，设置为空对象
        reservation.variant_selections = {};
      }
    });

    res.json({ data: reservations });
  });
});

// 管理员更新预定状态
router.put('/admin/:id/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const reservation_id = req.params.id;
  const { status, notes } = req.body;

  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: '无效的状态' });
  }

  // 如果状态是确认，需要将预定转为订单
  if (status === 'confirmed') {
    // 先获取预定详情
    db.get(
      'SELECT * FROM reservations WHERE id = ?',
      [reservation_id],
      (err, reservation) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '获取预定信息失败' });
        }

        if (!reservation) {
          return res.status(404).json({ error: '预定不存在' });
        }

        if (reservation.status !== 'pending') {
          return res.status(400).json({ error: '只能确认待处理的预定' });
        }

        if (!reservation.is_paid) {
          return res.status(400).json({ error: '预定未支付，无法确认' });
        }

        // 生成取单号
        const generatePickupNumber = async () => {
          return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            
            // 使用更严格的查询，只考虑4位数的取单号
            const sql = `
              SELECT MAX(CAST(pickup_number AS INTEGER)) as max_pickup_number 
              FROM orders 
              WHERE DATE(created_at) = ? 
              AND pickup_number IS NOT NULL 
              AND LENGTH(pickup_number) = 4
              AND pickup_number GLOB '[0-9][0-9][0-9][0-9]'
            `;
            
            db.get(sql, [today], (err, row) => {
              if (err) {
                console.error('查询取单号失败:', err);
                reject(err);
                return;
              }
              
              const nextNumber = (row && row.max_pickup_number) ? row.max_pickup_number + 1 : 1;
              const pickupNumber = nextNumber.toString().padStart(4, '0');
              console.log(`生成取单号: ${pickupNumber} (今天最大号码: ${row?.max_pickup_number || 0})`);
              resolve(pickupNumber);
            });
          });
        };

        // 创建订单
        const createOrderFromReservation = async (retryCount = 0) => {
          if (retryCount > 10) {
            return res.status(500).json({ error: '生成取单号失败，请重试' });
          }

          try {
            const pickupNumber = await generatePickupNumber();

            db.serialize(() => {
              db.run('BEGIN TRANSACTION');

              // 创建订单，将预定备注传递给订单
              const orderNotes = reservation.notes || null;
              db.run(
                'INSERT INTO orders (user_id, pickup_number, total_amount, status, notes) VALUES (?, ?, ?, ?, ?)',
                [reservation.user_id, pickupNumber, reservation.total_amount, 'pending', orderNotes],
                function(err) {
                  if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT') {
                      // 取单号重复，重新生成
                      db.run('ROLLBACK');
                      return createOrderFromReservation(retryCount + 1);
                    }
                    console.error('创建订单失败:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: '创建订单失败' });
                  }

                  const orderId = this.lastID;

                  // 创建订单详情
                  db.run(
                    'INSERT INTO order_items (order_id, product_id, quantity, price, variant_selections) VALUES (?, ?, ?, ?, ?)',
                    [orderId, reservation.product_id, reservation.quantity, reservation.total_amount / reservation.quantity, reservation.variant_selections],
                    function(err) {
                      if (err) {
                        console.error('创建订单详情失败:', err);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: '创建订单详情失败' });
                      }

                      // 更新预定状态并关联订单
                      const updateSql = notes 
                        ? 'UPDATE reservations SET status = ?, notes = ?, order_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
                        : 'UPDATE reservations SET status = ?, order_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                      
                      const params = notes ? [status, notes, orderId, reservation_id] : [status, orderId, reservation_id];

                      db.run(updateSql, params, function(err) {
                        if (err) {
                          console.error('更新预定状态失败:', err);
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: '更新预定状态失败' });
                        }

                        db.run('COMMIT');
                        res.json({ 
                          message: '预定已确认并转为订单',
                          order: {
                            id: orderId,
                            pickup_number: pickupNumber,
                            total_amount: reservation.total_amount,
                            status: 'pending'
                          }
                        });
                      });
                    }
                  );
                }
              );
            });
          } catch (error) {
            console.error('生成取单号失败:', error);
            // 如果是生成取单号失败，也进行重试
            return createOrderFromReservation(retryCount + 1);
          }
        };

        createOrderFromReservation();
      }
    );
  } else {
    // 普通状态更新
    const updateSql = notes 
      ? 'UPDATE reservations SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      : 'UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    const params = notes ? [status, notes, reservation_id] : [status, reservation_id];

    db.run(updateSql, params, function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '更新预定状态失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '预定不存在' });
      }

      res.json({ message: '预定状态已更新' });
    });
  }
});

// 获取预定统计信息
router.get('/admin/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const sql = `
    SELECT 
      status,
      COUNT(*) as count,
      DATE(reservation_date) as date
    FROM reservations 
    WHERE reservation_date >= DATE('now')
    GROUP BY status, DATE(reservation_date)
    ORDER BY date, status
  `;

  db.all(sql, [], (err, stats) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '获取统计信息失败' });
    }

    res.json({ data: stats });
  });
});

module.exports = router; 