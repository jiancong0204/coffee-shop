#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库路径
const DB_PATH = path.join(__dirname, '../database.sqlite');

// 获取命令行参数
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 快速密码重置工具

用法:
  node scripts/quick-reset-password.js <新密码> [用户名]
  
参数:
  <新密码>    必需 - 新的管理员密码 (至少6位字符)
  [用户名]    可选 - 管理员用户名 (默认: admin)

示例:
  node scripts/quick-reset-password.js myNewPassword123
  node scripts/quick-reset-password.js myNewPassword123 admin
  npm run quick-reset myNewPassword123

注意:
  - 密码至少需要6位字符
  - 此工具只能重置管理员账户的密码
  - 操作会立即生效
  - 为了安全，建议使用交互式版本: npm run reset-password
`);
  process.exit(0);
}

const newPassword = args[0];
const username = args[1] || 'admin';

// 密码验证
if (newPassword.length < 6) {
  console.error('❌ 密码至少需要6位字符');
  process.exit(1);
}

console.log('🔧 正在重置管理员密码...');

// 连接数据库
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
});

// 检查用户是否存在
db.get('SELECT * FROM users WHERE username = ? AND role = ?', [username, 'admin'], async (err, user) => {
  if (err) {
    console.error('❌ 查询用户失败:', err.message);
    db.close();
    process.exit(1);
  }
  
  if (!user) {
    console.log(`❌ 管理员用户 "${username}" 不存在`);
    db.close();
    process.exit(1);
  }
  
  try {
    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    db.run('UPDATE users SET password = ? WHERE username = ? AND role = ?', 
      [hashedPassword, username, 'admin'], 
      function(err) {
        if (err) {
          console.error('❌ 密码更新失败:', err.message);
          db.close();
          process.exit(1);
        }
        
        if (this.changes === 0) {
          console.log(`❌ 未找到管理员用户 "${username}"`);
        } else {
          console.log(`✅ 管理员 "${username}" 的密码已成功重置`);
          console.log('🔐 新密码已生效，请使用新密码登录');
        }
        
        db.close();
        process.exit(0);
      }
    );
  } catch (error) {
    console.error('❌ 密码加密失败:', error.message);
    db.close();
    process.exit(1);
  }
}); 