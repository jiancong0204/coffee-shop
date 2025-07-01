require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

// 初始化数据库
const db = require('./server/database');

// 导入路由
const authRoutes = require('./server/routes/auth');
const productRoutes = require('./server/routes/products');
const cartRoutes = require('./server/routes/cart');
const orderRoutes = require('./server/routes/orders');

const app = express();
const PORT = process.env.PORT || 5555;

// CORS配置 - 特别针对IPv6优化
const corsOptions = {
  origin: function (origin, callback) {
    // 允许任何来源，包括IPv6地址
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/images', express.static(path.join(__dirname, 'server/uploads')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  res.json({ 
    status: 'ok', 
    message: '咖啡点单系统运行正常 (IPv6优化版)',
    timestamp: new Date().toISOString(),
    domain: 'localhost',
    port: PORT,
    ipv6_support: true,
    client_ip: clientIP
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 创建HTTP服务器，明确支持IPv6
const server = http.createServer(app);

// 监听所有接口（IPv4和IPv6）
server.listen(PORT, '::', () => {
  console.log('🚀 咖啡点单系统服务器启动 (IPv6优化版)');
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`🔗 IPv4访问: http://localhost:${PORT}`);
  console.log(`🔗 IPv6访问: http://[::1]:${PORT}`);
  console.log(`🌐 域名访问: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`👤 默认管理员: admin / admin123`);
  console.log('✅ IPv6 完全支持');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
}); 