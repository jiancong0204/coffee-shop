# 后台出餐功能说明

## 功能概述

我们为咖啡店系统添加了完整的后台出餐功能，包括：

1. **订单接收** - 接收客户的订单
2. **取单号生成** - 为每个订单生成当日递增的取单号
3. **出餐确认** - 管理员可以管理订单状态并确认出餐
4. **顾客取消订单** - 顾客可以在接单前取消订单

## 主要功能

### 1. 订单创建与取单号生成

- 客户下单后，系统自动生成当日递增的取单号（如：001、002、003）
- 取单号每天从001开始重新计数，确保简洁易读
- 取单号保证同一天内唯一性，避免重复
- 下单成功后，客户会看到明显的取单号显示

### 2. 订单状态管理

订单有以下状态：
- `pending` - 待接单（橙色标签）
- `preparing` - 制作中（蓝色标签）
- `ready` - 待取餐（绿色标签）
- `completed` - 已完成（灰色标签）
- `cancelled` - 已取消（红色标签）

### 3. 顾客取消订单功能 🆕

- **权限控制**：只有处于"待接单"状态的订单才能被顾客取消
- **库存恢复**：取消订单时自动恢复相关商品的库存
- **操作简便**：在"我的订单"页面直接点击"取消订单"按钮
- **确认提示**：取消前会显示确认对话框，避免误操作

### 4. 管理员后台

管理员可以通过后台系统：
- 查看所有订单列表
- 实时查看待接单、制作中、待取餐的订单数量
- 查看订单详情（包括客户信息、商品清单）
- 管理订单状态（接单 → 制作完成 → 确认取餐）
- 取消订单（仅限待接单和制作中状态）

## 操作流程

### 客户端流程

1. 客户浏览商品并添加到购物车
2. 点击结账，系统创建订单
3. 显示取单号，客户记录取单号
4. 客户可以在"我的订单"页面查看订单状态
5. **🆕 如果订单状态为"待接单"，客户可以点击"取消订单"**

### 管理员流程

1. 登录管理员账户（用户名：admin，密码：admin123）
2. 进入"订单管理"标签页
3. 查看新订单并点击"接单"
4. 开始制作后点击"制作完成"
5. 客户取餐时点击"确认取餐"

## 取消订单业务规则

### 顾客取消规则
- ✅ **可以取消**：订单状态为"待接单"时
- ❌ **不能取消**：订单已被店家接单（制作中、待取餐、已完成状态）
- 🔄 **自动恢复**：取消时自动恢复商品库存

### 店家取消规则
- ✅ **可以取消**：待接单、制作中状态的订单
- ❌ **不能取消**：已完成的订单
- 🔄 **库存处理**：取消时自动恢复商品库存

## 技术实现

### 数据库更新

- 在`orders`表中的`pickup_number`字段改为当日递增模式
- 自动为现有订单按日期分组生成递增取单号
- 保证取单号的唯一性约束

### API接口

订单管理接口：
- `GET /api/orders` - 获取所有订单（管理员）
- `GET /api/orders/admin/:order_id` - 获取订单详情（管理员）
- `PUT /api/orders/:order_id/status` - 更新订单状态（管理员）
- `PUT /api/orders/:order_id/cancel` - 用户取消订单 🆕

### 前端功能

- 在"我的订单"页面为待接单订单显示"取消订单"按钮
- 取消操作带有确认提示，防止误操作
- 取消成功后自动刷新订单列表
- 优化订单状态显示文本，更加清晰易懂

## 用户体验优化

1. **状态标识清楚**：使用不同颜色的标签标识订单状态
2. **操作反馈及时**：取消成功后立即显示成功消息
3. **防误操作**：取消前必须确认，避免意外取消
4. **库存自动处理**：无需手动处理库存，系统自动恢复
5. **权限控制严格**：只有符合条件的订单才能被取消

## 注意事项

- 取单号每天重置，建议店家按日期查看订单
- 顾客取消订单后库存会立即恢复，不影响其他客户下单
- 管理员仍可在后台取消任何未完成的订单
- 已完成的订单无法被任何人取消

## 使用说明

1. **启动系统**：
   ```bash
   # 启动服务器
   npm start
   
   # 启动客户端
   cd client && npm start
   ```

2. **访问地址**：
   - 客户端：http://localhost:3000
   - 管理员：http://localhost:3000 (使用admin账户登录)

3. **测试流程**：
   - 注册普通用户账户
   - 下单并记录取单号
   - 使用admin账户登录查看订单管理
   - 测试订单状态流转

## 扩展功能建议

1. 添加订单打印功能
2. 支持订单备注
3. 添加预计完成时间
4. 短信或邮件通知客户
5. 订单统计和报表功能 