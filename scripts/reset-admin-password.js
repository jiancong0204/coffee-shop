#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

// 数据库路径
const DB_PATH = path.join(__dirname, '../database.sqlite');

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 隐藏密码输入
function hideInput() {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
}

function showInput() {
  process.stdin.setRawMode(false);
  process.stdin.pause();
}

// 安全的密码输入函数
function getPassword(prompt) {
  return new Promise((resolve) => {
    let password = '';
    
    process.stdout.write(prompt);
    hideInput();
    
    process.stdin.on('data', function(char) {
      char = char + '';
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          showInput();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          showInput();
          process.stdout.write('\n');
          process.exit();
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('\b*');
          break;
      }
    });
  });
}

// 普通输入函数
function getInput(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// 密码验证
function validatePassword(password) {
  if (password.length < 6) {
    return '密码至少需要6位字符';
  }
  return null;
}

// 重置管理员密码
async function resetAdminPassword() {
  console.log('🔧 管理员密码重置工具');
  console.log('=====================================');
  
  try {
    // 获取用户名
    const username = await getInput('请输入管理员用户名 (默认: admin): ') || 'admin';
    
    // 获取新密码
    const newPassword = await getPassword('请输入新密码: ');
    
    // 验证密码
    const validationError = validatePassword(newPassword);
    if (validationError) {
      console.log(`❌ ${validationError}`);
      process.exit(1);
    }
    
    // 确认密码
    const confirmPassword = await getPassword('请再次输入新密码: ');
    
    if (newPassword !== confirmPassword) {
      console.log('❌ 两次输入的密码不一致');
      process.exit(1);
    }
    
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
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 管理员密码重置工具

用法:
  node scripts/reset-admin-password.js [选项]

选项:
  -h, --help     显示帮助信息
  -u, --user     指定用户名 (可选，默认为 admin)

示例:
  node scripts/reset-admin-password.js
  npm run reset-password
  
注意:
  - 密码至少需要6位字符
  - 此工具只能重置管理员账户的密码
  - 操作会立即生效
`);
  process.exit(0);
}

// 启动密码重置流程
resetAdminPassword().catch((error) => {
  console.error('❌ 意外错误:', error.message);
  process.exit(1);
}); 