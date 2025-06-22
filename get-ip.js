#!/usr/bin/env node

const os = require('os');

console.log('🌐 本机网络地址信息:\n');

const networkInterfaces = os.networkInterfaces();

Object.keys(networkInterfaces).forEach((interfaceName) => {
  const interfaces = networkInterfaces[interfaceName];
  
  interfaces.forEach((interface) => {
    if (interface.family === 'IPv4' && !interface.internal) {
      console.log(`📡 ${interfaceName}:`);
      console.log(`   IP地址: ${interface.address}`);
      console.log(`   前端访问: http://${interface.address}:3333`);
      console.log(`   后端API: http://${interface.address}:5000`);
      console.log('');
    }
  });
});

console.log('💡 提示:');
console.log('1. 确保防火墙允许这些端口访问');
console.log('2. 其他设备需要连接到同一个WiFi网络');
console.log('3. 如果无法访问，请检查路由器设置'); 