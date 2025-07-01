require('dotenv').config();

// 服务器配置
const config = {
  // 端口配置 (环境变量为空时使用默认值)
  port: process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 5000),
  
  // 域名配置 (环境变量为空时使用默认值)
  serverDomain: process.env.SERVER_DOMAIN || 'localhost',
  serverHost: process.env.SERVER_HOST || 'localhost',
  
  // 客户端URL配置 (环境变量为空时使用默认值)
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3333',
  
  // 数据库配置
  dbPath: process.env.DB_PATH || './database.sqlite',
  
  // JWT配置
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-here',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // 文件上传配置
  uploadPath: process.env.UPLOAD_PATH || './server/uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  
  // IPv6支持配置
  enableIpv6: process.env.ENABLE_IPV6 === 'true' || true,
  
  // CORS配置
  corsOrigins: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['http://localhost:3333'],
  
  // 环境配置
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // 获取完整的服务器URL
  getServerUrl() {
    const protocol = 'http';
    return `${protocol}://${this.serverHost}:${this.port}`;
  },
  
  // 获取客户端配置
  getClientConfig() {
    return {
      apiUrl: process.env.REACT_APP_API_URL || '/api',
      serverUrl: process.env.REACT_APP_SERVER_URL || this.getServerUrl(),
      title: process.env.REACT_APP_TITLE || '咖啡点单系统',
      port: process.env.CLIENT_PORT || 3333
    };
  }
};

module.exports = config; 