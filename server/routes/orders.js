const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const productRoutes = require('./products');

const router = express.Router();

// 创建订单（结账）
router.post('/checkout', authenticateToken, (req, res) => {
  const userId = req.user.id;

  // 生成同一天内递增的取单号
  const generatePickupNumber = async () => {
    return new Promise((resolve, reject) => {
      // 获取今天日期字符串 (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      
      // 查询今天最大的取单号
      const sql = `
        SELECT MAX(CAST(pickup_number AS INTEGER)) as max_pickup_number 
        FROM orders 
        WHERE DATE(created_at) = ? AND pickup_number IS NOT NULL
      `;
      
      db.get(sql, [today], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
          return;
        }
        
        // 如果今天还没有订单，从1开始；否则递增
        const nextNumber = (row && row.max_pickup_number) ? row.max_pickup_number + 1 : 1;
        
        // 确保是3位数，不足3位前面补0
        const pickupNumber = nextNumber.toString().padStart(3, '0');
        
        resolve(pickupNumber);
      });
    });
  };

  // 获取购物车商品
  const cartSql = `
    SELECT 
      c.product_id,
      c.quantity,
      c.variant_selections,
      p.price,
      p.name,
      p.available
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  db.all(cartSql, [userId], (err, cartItems) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (cartItems.length === 0) {
      return res.status(400).json({ error: '购物车为空' });
    }

    // 检查所有商品是否可用
    const unavailableItems = cartItems.filter(item => !item.available);
    if (unavailableItems.length > 0) {
      return res.status(400).json({ error: '购物车中有商品不可用，请刷新购物车' });
    }

    // 检查库存并预减库存
    const checkAndReserveStock = async () => {
      const stockChecks = [];
      const stockReservations = [];
      
      for (const item of cartItems) {
        try {
          // 检查库存
          const stockResult = await new Promise((resolve, reject) => {
            productRoutes.decreaseStock(item.product_id, item.quantity, (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
          
          stockChecks.push({ productId: item.product_id, quantity: item.quantity, result: stockResult });
          if (!stockResult.unlimited) {
            stockReservations.push({ productId: item.product_id, quantity: item.quantity });
          }
        } catch (error) {
          // 如果库存检查失败，恢复已减少的库存
          for (const reservation of stockReservations) {
            productRoutes.increaseStock(reservation.productId, reservation.quantity, () => {});
          }
          return res.status(400).json({ error: `商品 ${item.name} ${error.message}` });
        }
      }
      
      // 计算总金额
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // 生成唯一取单号
      const createOrderWithPickupNumber = async (retryCount = 0) => {
        if (retryCount > 10) {
          // 恢复库存
          for (const reservation of stockReservations) {
            productRoutes.increaseStock(reservation.productId, reservation.quantity, () => {});
          }
          return res.status(500).json({ error: '生成取单号失败，请重试' });
        }

        try {
          const pickupNumber = await generatePickupNumber();

          // 开始事务
          db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // 创建订单
            db.run(
              'INSERT INTO orders (user_id, pickup_number, total_amount, status) VALUES (?, ?, ?, ?)',
              [userId, pickupNumber, totalAmount, 'pending'],
              function(err) {
                if (err) {
                  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    // 取单号重复，重新生成
                    db.run('ROLLBACK');
                    return createOrderWithPickupNumber(retryCount + 1);
                  }
                  console.error('Database error:', err);
                  db.run('ROLLBACK');
                  // 恢复库存
                  for (const reservation of stockReservations) {
                    productRoutes.increaseStock(reservation.productId, reservation.quantity, () => {});
                  }
                  return res.status(500).json({ error: '创建订单失败' });
                }

                const orderId = this.lastID;

                // 添加订单详情
                let itemsAdded = 0;
                let hasError = false;

                cartItems.forEach(item => {
                  if (hasError) return;

                  db.run(
                    'INSERT INTO order_items (order_id, product_id, quantity, price, variant_selections) VALUES (?, ?, ?, ?, ?)',
                    [orderId, item.product_id, item.quantity, item.price, item.variant_selections],
                    function(err) {
                      if (err) {
                        console.error('Database error:', err);
                        hasError = true;
                        db.run('ROLLBACK');
                        // 恢复库存
                        for (const reservation of stockReservations) {
                          productRoutes.increaseStock(reservation.productId, reservation.quantity, () => {});
                        }
                        return res.status(500).json({ error: '创建订单详情失败' });
                      }

                      itemsAdded++;
                      
                      if (itemsAdded === cartItems.length) {
                        // 清空购物车
                        db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
                          if (err) {
                            console.error('Database error:', err);
                            db.run('ROLLBACK');
                            // 恢复库存
                            for (const reservation of stockReservations) {
                              productRoutes.increaseStock(reservation.productId, reservation.quantity, () => {});
                            }
                            return res.status(500).json({ error: '清空购物车失败' });
                          }

                          db.run('COMMIT');
                          console.log(`订单 ${orderId} 创建成功，已减少相关商品库存`);
                          res.status(201).json({
                            message: '订单创建成功',
                            order: {
                              id: orderId,
                              pickup_number: pickupNumber,
                              total_amount: totalAmount,
                              status: 'pending',
                              items: cartItems
                            }
                          });
                        });
                      }
                    }
                  );
                });
              }
            );
          });
        } catch (error) {
          console.error('生成取单号失败:', error);
          // 恢复库存
          for (const reservation of stockReservations) {
            productRoutes.increaseStock(reservation.productId, reservation.quantity, () => {});
          }
          return res.status(500).json({ error: '生成取单号失败，请重试' });
        }
      };

      createOrderWithPickupNumber();
    };

    checkAndReserveStock();
  });
});

// 获取用户订单
router.get('/my-orders', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      o.id,
      o.pickup_number,
      o.total_amount,
      o.status,
      o.created_at,
      COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  try {
    const orders = await new Promise((resolve, reject) => {
      db.all(sql, [userId], (err, orders) => {
        if (err) reject(err);
        else resolve(orders);
      });
    });

    // 为每个订单获取详细的商品信息
    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      const itemsSql = `
        SELECT 
          oi.quantity,
          oi.price,
          oi.variant_selections,
          p.name,
          p.description,
          p.image_url,
          p.category
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `;

      const items = await new Promise((resolve, reject) => {
        db.all(itemsSql, [order.id], (err, items) => {
          if (err) reject(err);
          else resolve(items);
        });
      });

      // 处理商品项目，包括细分选项的显示名称
      const processedItems = [];
      
      for (const item of items) {
        let processedItem = { ...item };
        
        // 解析和格式化 variant_selections
        if (item.variant_selections) {
          try {
            const selections = JSON.parse(item.variant_selections);
            const variantDisplays = [];
            
            for (const [typeId, selectionData] of Object.entries(selections)) {
              // 检查数据格式：如果是新格式（包含完整信息），直接使用
              if (typeof selectionData === 'object' && selectionData.type_display_name) {
                variantDisplays.push({
                  type_display_name: selectionData.type_display_name,
                  option_display_name: selectionData.option_display_name,
                  price_adjustment: selectionData.price_adjustment || 0
                });
              } else {
                // 如果是老格式（只有optionId），查询数据库获取详细信息
                const optionId = selectionData;
                const optionSql = `
                  SELECT 
                    vt.display_name as type_display_name,
                    vo.display_name as option_display_name,
                    vo.price_adjustment
                  FROM product_variant_options vo
                  LEFT JOIN product_variant_types vt ON vo.variant_type_id = vt.id
                  WHERE vo.id = ?
                `;
                
                try {
                  const optionInfo = await new Promise((resolve, reject) => {
                    db.get(optionSql, [optionId], (err, result) => {
                      if (err) reject(err);
                      else resolve(result);
                    });
                  });
                  
                  if (optionInfo) {
                    variantDisplays.push({
                      type_display_name: optionInfo.type_display_name,
                      option_display_name: optionInfo.option_display_name,
                      price_adjustment: optionInfo.price_adjustment
                    });
                  }
                } catch (error) {
                  console.error('查询细分选项失败:', error);
                }
              }
            }
            
            processedItem.variant_selections = variantDisplays;
          } catch (e) {
            console.error('解析细分选项失败:', e);
            processedItem.variant_selections = [];
          }
        } else {
          processedItem.variant_selections = [];
        }
        
        processedItems.push(processedItem);
      }

      return {
        ...order,
        items: processedItems
      };
    }));

    res.json(ordersWithDetails);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取订单详情
router.get('/:order_id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { order_id } = req.params;

  // 获取订单基本信息
  db.get(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [order_id, userId],
    (err, order) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (!order) {
        return res.status(404).json({ error: '订单不存在' });
      }

      // 获取订单详情
      const itemsSql = `
        SELECT 
          oi.quantity,
          oi.price,
          oi.variant_selections,
          p.name,
          p.description,
          p.image_url,
          p.category
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `;

      db.all(itemsSql, [order_id], async (err, items) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        // 处理商品项目，包括细分选项的显示名称
        const processedItems = [];
        
        for (const item of items) {
          let processedItem = { ...item };
          
          // 解析和格式化 variant_selections
          if (item.variant_selections) {
            try {
              const selections = JSON.parse(item.variant_selections);
              const variantDisplays = [];
              
              for (const [typeId, selectionData] of Object.entries(selections)) {
                // 检查数据格式：如果是新格式（包含完整信息），直接使用
                if (typeof selectionData === 'object' && selectionData.type_display_name) {
                  variantDisplays.push({
                    type_display_name: selectionData.type_display_name,
                    option_display_name: selectionData.option_display_name,
                    price_adjustment: selectionData.price_adjustment || 0
                  });
                } else {
                  // 如果是老格式（只有optionId），查询数据库获取详细信息
                  const optionId = selectionData;
                  const optionSql = `
                    SELECT 
                      vt.display_name as type_display_name,
                      vo.display_name as option_display_name,
                      vo.price_adjustment
                    FROM product_variant_options vo
                    LEFT JOIN product_variant_types vt ON vo.variant_type_id = vt.id
                    WHERE vo.id = ?
                  `;
                  
                  try {
                    const optionInfo = await new Promise((resolve, reject) => {
                      db.get(optionSql, [optionId], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                      });
                    });
                    
                    if (optionInfo) {
                      variantDisplays.push({
                        type_display_name: optionInfo.type_display_name,
                        option_display_name: optionInfo.option_display_name,
                        price_adjustment: optionInfo.price_adjustment
                      });
                    }
                  } catch (error) {
                    console.error('查询细分选项失败:', error);
                  }
                }
              }
              
              processedItem.variant_selections = variantDisplays;
            } catch (e) {
              console.error('解析细分选项失败:', e);
              processedItem.variant_selections = [];
            }
          } else {
            processedItem.variant_selections = [];
          }
          
          processedItems.push(processedItem);
        }

        res.json({
          ...order,
          items: processedItems
        });
      });
    }
  );
});

// 用户取消订单
router.put('/:order_id/cancel', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { order_id } = req.params;

  // 获取订单信息，验证订单归属和状态
  db.get(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [order_id, userId],
    (err, order) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (!order) {
        return res.status(404).json({ error: '订单不存在或无权限' });
      }

      // 只有待接单状态的订单才能被用户取消
      if (order.status !== 'pending') {
        return res.status(400).json({ error: '订单已被接单，无法取消' });
      }

      // 获取订单商品详情以恢复库存
      db.all(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [order_id],
        (err, orderItems) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: '服务器错误' });
          }

          // 恢复库存
          let itemsProcessed = 0;
          let hasError = false;

          if (orderItems.length === 0) {
            // 如果没有商品，直接更新状态
            updateOrderStatus();
            return;
          }

          const productRoutes = require('./products');
          
          orderItems.forEach(item => {
            if (hasError) return;

            productRoutes.increaseStock(item.product_id, item.quantity, (err, result) => {
              if (err) {
                console.error('Error restoring stock:', err);
                hasError = true;
                return res.status(500).json({ error: '恢复库存失败' });
              }

              itemsProcessed++;
              if (itemsProcessed === orderItems.length) {
                console.log(`用户取消订单 ${order_id}，已恢复相关商品库存`);
                updateOrderStatus();
              }
            });
          });

          function updateOrderStatus() {
            db.run(
              'UPDATE orders SET status = ? WHERE id = ?',
              ['cancelled', order_id],
              function(err) {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: '服务器错误' });
                }

                res.json({ message: '订单已取消，库存已恢复' });
              }
            );
          }
        }
      );
    }
  );
});

// 获取所有订单（仅管理员）
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      o.id,
      o.user_id,
      u.username,
      o.pickup_number,
      o.total_amount,
      o.status,
      o.created_at,
      COUNT(oi.id) as item_count
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
  `;

  const params = [];

  if (status) {
    sql += ' WHERE o.status = ?';
    params.push(status);
  }

  sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(sql, params, (err, orders) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    res.json(orders);
  });
});

// 获取订单详情（管理员）
router.get('/admin/:order_id', authenticateToken, requireAdmin, (req, res) => {
  const { order_id } = req.params;

  // 获取订单基本信息
  db.get(
    `SELECT 
      o.id,
      o.user_id,
      u.username,
      o.pickup_number,
      o.total_amount,
      o.status,
      o.created_at
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?`,
    [order_id],
    (err, order) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (!order) {
        return res.status(404).json({ error: '订单不存在' });
      }

      // 获取订单详情
      const itemsSql = `
        SELECT 
          oi.quantity,
          oi.price,
          oi.variant_selections,
          p.name,
          p.description,
          p.image_url,
          p.category
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `;

      db.all(itemsSql, [order_id], async (err, items) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        // 处理商品项目，包括细分选项的显示名称
        const processedItems = [];
        
        for (const item of items) {
          let processedItem = { ...item };
          
          // 解析和格式化 variant_selections
          if (item.variant_selections) {
            try {
              const selections = JSON.parse(item.variant_selections);
              const variantDisplays = [];
              
              for (const [typeId, selectionData] of Object.entries(selections)) {
                // 检查数据格式：如果是新格式（包含完整信息），直接使用
                if (typeof selectionData === 'object' && selectionData.type_display_name) {
                  variantDisplays.push({
                    type_display_name: selectionData.type_display_name,
                    option_display_name: selectionData.option_display_name,
                    price_adjustment: selectionData.price_adjustment || 0
                  });
                } else {
                  // 如果是老格式（只有optionId），查询数据库获取详细信息
                  const optionId = selectionData;
                  const optionSql = `
                    SELECT 
                      vt.display_name as type_display_name,
                      vo.display_name as option_display_name,
                      vo.price_adjustment
                    FROM product_variant_options vo
                    LEFT JOIN product_variant_types vt ON vo.variant_type_id = vt.id
                    WHERE vo.id = ?
                  `;
                  
                  try {
                    const optionInfo = await new Promise((resolve, reject) => {
                      db.get(optionSql, [optionId], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                      });
                    });
                    
                    if (optionInfo) {
                      variantDisplays.push({
                        type_display_name: optionInfo.type_display_name,
                        option_display_name: optionInfo.option_display_name,
                        price_adjustment: optionInfo.price_adjustment
                      });
                    }
                  } catch (error) {
                    console.error('查询细分选项失败:', error);
                  }
                }
              }
              
              processedItem.variant_selections = variantDisplays;
            } catch (e) {
              console.error('解析细分选项失败:', e);
              processedItem.variant_selections = null;
            }
          } else {
            processedItem.variant_selections = null;
          }
          
          processedItems.push(processedItem);
        }

        res.json({
          ...order,
          items: processedItems
        });
      });
    }
  );
});

// 更新订单状态（仅管理员）
router.put('/:order_id/status', authenticateToken, requireAdmin, (req, res) => {
  const { order_id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的订单状态' });
  }

  // 先获取当前订单状态和订单详情
  db.get('SELECT status FROM orders WHERE id = ?', [order_id], (err, currentOrder) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (!currentOrder) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 如果要取消订单，需要恢复库存
    if (status === 'cancelled' && currentOrder.status !== 'cancelled') {
      // 获取订单商品详情
      db.all(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [order_id],
        (err, orderItems) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: '服务器错误' });
          }

          // 恢复库存
          let itemsProcessed = 0;
          let hasError = false;

          if (orderItems.length === 0) {
            // 如果没有商品，直接更新状态
            updateOrderStatus();
            return;
          }

          orderItems.forEach(item => {
            if (hasError) return;

            productRoutes.increaseStock(item.product_id, item.quantity, (err, result) => {
              if (err) {
                console.error('Error restoring stock:', err);
                hasError = true;
                return res.status(500).json({ error: '恢复库存失败' });
              }

              itemsProcessed++;
              if (itemsProcessed === orderItems.length) {
                console.log(`订单 ${order_id} 取消，已恢复相关商品库存`);
                updateOrderStatus();
              }
            });
          });
        }
      );
    } else {
      // 其他状态变更直接更新
      updateOrderStatus();
    }

    function updateOrderStatus() {
      db.run(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, order_id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: '服务器错误' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: '订单不存在' });
          }

          res.json({ message: '订单状态已更新' });
        }
      );
    }
  });
});

module.exports = router; 