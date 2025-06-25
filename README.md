# 🏪 咖啡点单系统

一个完整的咖啡店点单系统，包含用户点餐、购物车管理、订单处理和管理员后台功能。

## 🚀 功能特性

### 👥 用户功能
- **顾客登录**: 输入用户名即可开始点餐，无需注册
- **商品浏览**: 按分类浏览咖啡、茶饮、甜品等商品
- **购物车管理**: 添加商品到购物车，调整数量，删除商品
- **订单管理**: 查看订单历史和状态

### 👨‍💼 管理员功能
- **商品管理**: 添加、编辑、删除商品
- **分类管理**: 管理商品分类
- **订单监控**: 查看和更新订单状态

## 🛠️ 技术栈

### 后端
- **Node.js** + **Express**: 服务器框架
- **SQLite**: 轻量级数据库
- **JWT**: 身份认证
- **bcryptjs**: 密码加密
- **express-validator**: 数据验证

### 前端
- **React 18**: UI框架
- **Ant Design**: UI组件库
- **React Router**: 路由管理
- **Axios**: HTTP客户端
- **Context API**: 状态管理

## 📦 安装和运行

### 1. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client && npm install
```

### 2. 启动项目

#### 开发模式（推荐）
```bash
# 在项目根目录运行（同时启动前后端）
npm run dev
```

#### 分别启动
```bash
# 启动后端（端口5000）
npm run server

# 启动前端（端口3333）
npm run client
```

### 3. 访问系统

#### 本地访问
- **前端应用**: http://localhost:3333
- **后端API**: http://localhost:5000
- **健康检查**: http://localhost:5000/api/health

#### 局域网访问
```bash
# 获取本机IP地址
npm run get-ip

# 其他设备通过显示的IP地址访问，例如：
# http://192.168.1.100:3333 (前端)
# http://192.168.1.100:5000 (后端API)
```

**注意事项**：
- 确保所有设备连接到同一WiFi网络
- 检查防火墙是否允许端口3333和5000的访问
- 如果仍无法访问，可能需要配置路由器设置

## 👤 默认账号

### 管理员账号
- **用户名**: admin
- **密码**: admin123

### 顾客登录
- 输入任意用户名即可开始点餐

## 📁 项目结构

```
coffee-shop/
├── server/                 # 后端代码
│   ├── routes/            # API路由
│   │   ├── auth.js        # 认证相关
│   │   ├── products.js    # 商品管理
│   │   ├── cart.js        # 购物车
│   │   └── orders.js      # 订单管理
│   ├── middleware/        # 中间件
│   │   └── auth.js        # JWT认证中间件
│   ├── database.js        # 数据库配置和初始化
│   └── index.js           # 服务器入口
├── client/                # 前端代码
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── contexts/      # Context
│   │   └── services/      # API服务
│   └── public/
├── package.json           # 项目配置
└── README.md             # 说明文档
```

## 🔄 API接口

### 认证接口
- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/guest-login` - 顾客登录

### 商品接口
- `GET /api/products` - 获取商品列表
- `POST /api/products` - 添加商品（需管理员权限）
- `PUT /api/products/:id` - 更新商品（需管理员权限）
- `DELETE /api/products/:id` - 删除商品（需管理员权限）

### 购物车接口
- `GET /api/cart` - 获取购物车
- `POST /api/cart/add` - 添加商品到购物车
- `PUT /api/cart/:id` - 更新购物车商品数量
- `DELETE /api/cart/:id` - 删除购物车商品

### 订单接口
- `POST /api/orders/checkout` - 创建订单（结账）
- `GET /api/orders/my-orders` - 获取用户订单
- `GET /api/orders` - 获取所有订单（需管理员权限）

## 🎯 使用流程

### 顾客点餐流程
1. 访问首页，点击"开始点餐"
2. 输入用户名进行顾客登录
3. 浏览商品，按分类查看
4. 点击"加入购物车"添加商品
5. 查看购物车，调整数量
6. 点击"结账"完成订单
7. 在"我的订单"中查看订单状态

### 管理员管理流程
1. 使用管理员账号登录
2. 进入管理后台
3. 添加/编辑/删除商品
4. 查看和管理订单

## 🔒 安全特性

- JWT令牌认证
- 管理员密码加密存储
- API权限控制
- 输入数据验证
- SQL注入防护

## 📱 响应式设计

系统支持桌面和移动设备，采用响应式设计，在各种屏幕尺寸下都能良好显示。

## 🚀 部署说明

### 生产环境部署
1. 设置环境变量 `NODE_ENV=production`
2. 构建前端: `cd client && npm run build`
3. 启动服务: `npm start`

### 环境变量配置

系统支持通过环境变量进行自定义配置。参考 `env-template.txt` 文件创建 `.env` 配置文件。

#### 基本配置
```bash
# 复制模板文件内容到 .env 文件
cp env-template.txt .env
# 编辑 .env 文件进行自定义配置
```

#### 主要环境变量

**服务器端 (.env)**
```bash
# 端口配置 (默认: 5000)
PORT=

# 域名配置 (默认: localhost)
SERVER_DOMAIN=
SERVER_HOST=

# 客户端URL (默认: http://localhost:3333)
CLIENT_URL=

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# IPv6支持 (默认: true)
ENABLE_IPV6=true
```

**客户端 (client/.env)**
```bash
# 端口配置 (默认: 3333)
PORT=

# API配置 (默认: /api)
REACT_APP_API_URL=

# 服务器URL (默认: http://localhost:5000)
REACT_APP_SERVER_URL=

# 应用标题
REACT_APP_TITLE=咖啡点单系统
```

#### 自定义域名配置示例
```bash
# 如果你想使用自定义域名，可以这样配置:
SERVER_DOMAIN=coffee.mysite.com
SERVER_HOST=coffee.mysite.com
CLIENT_URL=http://coffee.mysite.com:3333
REACT_APP_SERVER_URL=http://coffee.mysite.com:5000
```

**注意**: 如果环境变量为空或未设置，系统会自动使用默认值，无需担心配置错误！

## 🔧 故障排除

### 常见问题
1. **端口占用**: 修改.env文件中的PORT值
2. **数据库文件**: SQLite数据库文件会自动创建
3. **依赖安装**: 确保Node.js版本 >= 14

### 重置数据库
删除根目录下的 `database.sqlite` 文件，重启服务器会重新创建。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

---

**开发完成时间**: 2025年
**技术支持**: 基于现代Web技术栈构建 