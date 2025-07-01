// 客户端配置
const config = {
  // API配置 (环境变量为空时使用默认值)
  apiUrl: process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api' : '/api'),
  
  // 服务器配置 (环境变量为空时使用默认值)
  serverUrl: process.env.REACT_APP_SERVER_URL || 'http://localhost:5000',
  
  // 应用配置
  title: process.env.REACT_APP_TITLE || '咖啡点单系统',
  
  // 环境配置
  env: process.env.REACT_APP_ENV || 'development',
  
  // 端口配置
  port: process.env.PORT || 3333,
  
  // 是否开发环境
  isDevelopment: process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENV === 'development',
  
  // 是否生产环境
  isProduction: process.env.NODE_ENV === 'production' || process.env.REACT_APP_ENV === 'production'
};

export default config; 