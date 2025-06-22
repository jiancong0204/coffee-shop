const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const config = require('../../config');

const router = express.Router();

// 登录
router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 对于管理员，验证密码
    if (user.role === 'admin') {
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Password compare error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        if (!isMatch) {
          return res.status(401).json({ error: '用户名或密码错误' });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          config.jwtSecret,
          { expiresIn: '24h' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      });
    } else {
      // 对于普通用户（顾客），不需要密码验证
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    }
  });
});

// 顾客注册/设置用户名
router.post('/guest-login', [
  body('username').notEmpty().withMessage('用户名不能为空')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username } = req.body;

  // 检查用户名是否已存在
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (existingUser) {
      // 如果用户存在且是普通用户，直接登录
      if (existingUser.role === 'customer') {
        const token = jwt.sign(
          { id: existingUser.id, username: existingUser.username, role: existingUser.role },
          config.jwtSecret,
          { expiresIn: '24h' }
        );

        return res.json({
          token,
          user: {
            id: existingUser.id,
            username: existingUser.username,
            role: existingUser.role
          }
        });
      } else {
        return res.status(400).json({ error: '用户名已被占用' });
      }
    }

    // 创建新的顾客用户
    db.run(
      'INSERT INTO users (username, role) VALUES (?, ?)',
      [username, 'customer'],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        const token = jwt.sign(
          { id: this.lastID, username: username, role: 'customer' },
          config.jwtSecret,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          token,
          user: {
            id: this.lastID,
            username: username,
            role: 'customer'
          }
        });
      }
    );
  });
});

// 修改管理员密码
router.put('/admin/change-password', authenticateToken, requireAdmin, [
  body('currentPassword').notEmpty().withMessage('当前密码不能为空'),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // 获取当前用户信息
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: '当前密码错误' });
      }

      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // 更新密码
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        res.json({ message: '密码修改成功' });
      });
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 注册新管理员（需要现有管理员审批）
router.post('/admin/register', authenticateToken, requireAdmin, [
  body('username').isLength({ min: 3 }).withMessage('用户名至少3位'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  const createdBy = req.user.id;

  try {
    // 检查用户名是否已存在
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, existingUser) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (existingUser) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建新管理员
      db.run(
        'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [username, hashedPassword, 'admin'],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: '服务器错误' });
          }

          // 记录操作日志（可选）
          console.log(`新管理员 ${username} 由管理员 ${req.user.username} (ID: ${createdBy}) 创建`);

          res.status(201).json({ 
            message: '管理员账号创建成功',
            adminId: this.lastID,
            username: username
          });
        }
      );
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取所有管理员列表
router.get('/admin/list', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    'SELECT id, username, created_at FROM users WHERE role = ? ORDER BY created_at DESC',
    ['admin'],
    (err, admins) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      res.json(admins);
    }
  );
});

// 删除管理员（超级管理员功能，可选）
router.delete('/admin/:adminId', authenticateToken, requireAdmin, (req, res) => {
  const { adminId } = req.params;
  const currentUserId = req.user.id;

  // 防止删除自己
  if (parseInt(adminId) === currentUserId) {
    return res.status(400).json({ error: '不能删除自己的账号' });
  }

  // 防止删除默认管理员（username为admin的账号）
  db.get('SELECT * FROM users WHERE id = ? AND role = ?', [adminId, 'admin'], (err, admin) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '服务器错误' });
    }

    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    if (admin.username === 'admin') {
      return res.status(400).json({ error: '不能删除默认管理员账号' });
    }

    // 删除管理员
    db.run('DELETE FROM users WHERE id = ? AND role = ?', [adminId, 'admin'], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '管理员不存在' });
      }

      console.log(`管理员 ${admin.username} (ID: ${adminId}) 被管理员 ${req.user.username} (ID: ${currentUserId}) 删除`);
      res.json({ message: '管理员删除成功' });
    });
  });
});

module.exports = router; 