const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入配置
const config = require('../config');

// 初始化数据库
const db = require('./database');

// 导入路由
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/users');
const tagRoutes = require('./routes/tags');
const variantRoutes = require('./routes/variants');
const categoryRoutes = require('./routes/categories');
const reservationRoutes = require('./routes/reservations');

const app = express();
const PORT = config.port;

// CORS配置 - 生产环境简化配置
const corsOptions = {
  origin: function (origin, callback) {
    // 生产环境暂时允许所有origin以解决问题
    if (config.nodeEnv === 'production') {
      return callback(null, true);
    }
    
    // 允许无origin的请求（如移动应用、Postman等）
    if (!origin) return callback(null, true);
    
    // 允许的源列表
    const allowedOrigins = [
      ...config.corsOrigins,
      config.clientUrl,
      `http://[::1]:3333`, // IPv6 localhost (开发环境)
      `http://${config.serverDomain}:3333`, // 自定义域名前端 (开发环境)
      `http://${config.serverHost}:3333`, // 自定义主机前端 (开发环境)
      `http://localhost:${PORT}`, // 生产环境同端口访问
      `http://127.0.0.1:${PORT}`, // 生产环境同端口访问
      `http://${config.serverHost}:${PORT}`, // 生产环境自定义主机
      `http://${config.serverDomain}:${PORT}`, // 生产环境自定义域名
      `http://localhost`, // 生产环境80端口访问
      `http://127.0.0.1`, // 生产环境80端口访问
      `http://${config.serverHost}`, // 生产环境80端口自定义主机
      `http://${config.serverDomain}` // 生产环境80端口自定义域名
    ].filter(Boolean);
    
    // 检查是否为允许的源
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 允许局域网IP访问（192.168.x.x, 10.x.x.x, 172.16-31.x.x）
    const localNetworkRegex = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|localhost|127\.0\.0\.1)/;
    if (localNetworkRegex.test(origin)) {
      return callback(null, true);
    }
    
    // 其他情况拒绝
    console.log('CORS rejected origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/images', express.static(path.join(__dirname, 'uploads')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reservations', reservationRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '咖啡点单系统运行正常',
    timestamp: new Date().toISOString(),
    domain: config.serverDomain,
    host: config.serverHost,
    port: PORT,
    server_url: config.getServerUrl(),
    client_url: config.clientUrl,
    ipv6_support: config.enableIpv6,
    environment: config.nodeEnv
  });
});

// 如果是生产环境，提供静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动服务器 - 监听所有网络接口，支持局域网访问
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 咖啡点单系统服务器运行在端口 ${PORT}`);
  console.log(`🔗 本地访问 (IPv4): http://localhost:${PORT}`);
  console.log(`🔗 本地访问 (IPv6): http://[::1]:${PORT}`);
  console.log(`🌐 域名访问: ${config.getServerUrl()}`);
  console.log(`📊 API健康检查: ${config.getServerUrl()}/api/health`);
  console.log(`👤 默认管理员账号: admin / admin123`);
  console.log(`🌍 客户端地址: ${config.clientUrl}`);
  console.log(`⚙️  环境: ${config.nodeEnv}`);
  console.log(`🔧 IPv6支持: ${config.enableIpv6 ? '启用' : '禁用'}`);
  
  // 获取本机IP地址用于局域网访问
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  console.log('\n🌐 局域网访问地址:');
  
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`   📱 ${interfaceName}: http://${interface.address}:${PORT}`);
      }
    });
  });
  
  console.log('\n💡 提示: 确保防火墙允许端口访问，其他设备可通过上述IP地址访问');
}); 