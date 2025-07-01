# 咖啡点单系统 Docker 部署指南

## 📋 目录

- [概述](#概述)
- [前置要求](#前置要求)
- [快速部署](#快速部署)
- [配置选项](#配置选项)
- [管理命令](#管理命令)
- [管理员密码管理](#管理员密码管理)
- [数据持久化](#数据持久化)
- [生产环境配置](#生产环境配置)
- [故障排除](#故障排除)

## 📖 概述

本项目提供了完整的 Docker 部署方案，将前后端打包成一个容器，方便在任何支持 Docker 的服务器上部署。

### 🏗️ 架构特点

- **多阶段构建**: 分离前端构建和运行环境，减小镜像体积
- **单容器部署**: 前后端在同一容器中，简化部署流程
- **数据持久化**: 使用 Docker Volumes 持久化数据库和上传文件
- **健康检查**: 内置健康检查机制，确保服务可用性
- **安全优化**: 使用非 root 用户运行，提高安全性

## 🔧 前置要求

### 系统要求

- **操作系统**: Linux、macOS 或 Windows
- **内存**: 至少 1GB RAM
- **存储**: 至少 2GB 可用空间
- **网络**: 端口 5000 可用

### 软件依赖

- **Docker**: 版本 20.10 或更高
- **Docker Compose**: 版本 1.29 或更高

### 安装 Docker

#### Ubuntu/Debian
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### CentOS/RHEL
```bash
sudo yum install -y docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

#### macOS
```bash
brew install docker docker-compose
```

## 🚀 快速部署

### 1. 克隆代码

```bash
git clone <repository-url>
cd coffee-shop
```

### 2. 一键部署

```bash
# 给部署脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

### 3. 验证部署

部署成功后，访问以下地址：

- **应用主页**: http://localhost:5000
- **健康检查**: http://localhost:5000/api/health
- **管理后台**: http://localhost:5000 (使用 admin/admin123 登录)

## ⚙️ 配置选项

### 环境变量

可以通过修改 `docker-compose.yml` 中的环境变量来配置应用：

```yaml
environment:
  - NODE_ENV=production          # 运行环境
  - PORT=5000                   # 应用端口
  - DB_PATH=/app/data/database.sqlite  # 数据库路径
```

### 端口配置

默认端口为 5000，可以通过修改 `docker-compose.yml` 更改：

```yaml
ports:
  - "8080:5000"  # 将容器的5000端口映射到主机的8080端口
```

## 🛠️ 管理命令

### 使用部署脚本

```bash
# 完整部署
./deploy.sh deploy

# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看日志
./deploy.sh logs

# 查看状态
./deploy.sh status

# 清理所有数据
./deploy.sh clean

# 显示帮助
./deploy.sh help
```

### 使用 Docker Compose

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 进入容器
docker-compose exec coffee-shop sh
```

## 🔐 管理员密码管理

部署完成后，您可以使用以下方法修改管理员密码。

### 默认账户信息

- **默认用户名**: `admin`
- **默认密码**: `admin123`

### 方法1：交互式密码重置（推荐）

这是最安全的方法，密码输入时会被隐藏：

```bash
# 使用部署在80端口的应用
sudo docker exec -it coffee-shop-app npm run reset-password

# 或者如果使用其他端口
docker exec -it coffee-shop-app npm run reset-password
```

**使用流程**：
1. 运行命令后，提示输入管理员用户名（默认：admin）
2. 输入新密码（输入时显示为星号 `****`）
3. 再次输入密码进行确认
4. 系统验证并更新密码

### 方法2：快速密码重置

适合脚本化或快速重置场景：

```bash
# 语法：npm run quick-reset <新密码> [用户名]

# 重置默认admin用户的密码
sudo docker exec -it coffee-shop-app npm run quick-reset "newPassword123"

# 重置指定用户的密码
sudo docker exec -it coffee-shop-app npm run quick-reset "newPassword123" "admin"
```

### 密码要求

- 至少6位字符
- 建议使用强密码（包含字母、数字、特殊字符）
- 避免使用常见密码

### 验证密码重置

重置密码后，可以通过以下方式验证：

```bash
# 测试登录API
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"新密码"}'
```

成功返回示例：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### 故障排除

#### 常见错误：

1. **权限错误**
   ```bash
   # 确保使用正确的权限
   sudo docker exec -it coffee-shop-app npm run reset-password
   ```

2. **容器不存在**
   ```bash
   # 检查容器状态
   docker ps
   # 如果容器名称不同，使用正确的容器名
   docker exec -it <实际容器名> npm run reset-password
   ```

3. **数据库连接失败**
   ```bash
   # 检查容器日志
   docker logs coffee-shop-app
   # 确保数据库文件存在且有权限访问
   ```

### 安全建议

1. **定期更换密码**: 建议定期更换管理员密码
2. **使用强密码**: 密码应包含大小写字母、数字和特殊字符
3. **记录密码更改**: 在团队环境中，记录密码更改时间和人员
4. **备份前重置**: 在数据备份前，考虑重置为已知密码

## 💾 数据持久化

### Volume 说明

系统使用两个 Docker Volumes 来持久化数据：

- **coffee_data**: 存储 SQLite 数据库文件
- **coffee_uploads**: 存储用户上传的图片文件

### 数据备份

```bash
# 备份数据库
docker run --rm -v coffee_data:/data -v $(pwd):/backup alpine tar czf /backup/database-backup.tar.gz -C /data .

# 备份上传文件
docker run --rm -v coffee_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

### 数据恢复

```bash
# 恢复数据库
docker run --rm -v coffee_data:/data -v $(pwd):/backup alpine tar xzf /backup/database-backup.tar.gz -C /data

# 恢复上传文件
docker run --rm -v coffee_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

## 🏭 生产环境配置

### 使用 Nginx 反向代理

启用 Nginx 反向代理（可选）：

```bash
# 启动包含 Nginx 的完整服务
docker-compose --profile nginx up -d
```

### SSL/HTTPS 配置

1. 将 SSL 证书放在 `ssl/` 目录下
2. 修改 `nginx.conf` 中的 HTTPS 配置
3. 取消注释 HTTPS server 块

### 域名配置

修改 `nginx.conf` 中的 `server_name`：

```nginx
server_name your-domain.com;
```

### 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## 🔍 故障排除

### 常见问题

#### 1. 端口被占用

```bash
# 查看端口占用
sudo netstat -tlnp | grep :5000

# 更改端口
# 修改 docker-compose.yml 中的端口映射
```

#### 2. 权限问题

```bash
# 确保当前用户在 docker 组中
sudo usermod -aG docker $USER
newgrp docker
```

#### 3. 内存不足

```bash
# 查看系统资源
docker system df
docker system prune  # 清理未使用的资源
```

#### 4. 容器启动失败

```bash
# 查看详细日志
docker-compose logs coffee-shop

# 检查容器状态
docker-compose ps
```

### 调试命令

```bash
# 进入容器调试
docker-compose exec coffee-shop sh

# 查看容器资源使用
docker stats

# 查看镜像历史
docker history coffee-shop_coffee-shop

# 检查网络连接
docker network ls
docker network inspect coffee-shop_coffee-network
```

### 性能优化

#### 1. 镜像优化

```dockerfile
# 使用 .dockerignore 减少构建上下文
# 使用多阶段构建减小镜像体积
# 合并 RUN 命令减少层数
```

#### 2. 容器资源限制

```yaml
services:
  coffee-shop:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## 📞 技术支持

如遇到问题，请：

1. 查看容器日志：`docker-compose logs -f`
2. 检查健康状态：`curl http://localhost:5000/api/health`
3. 验证网络连接：`docker network inspect coffee-shop_coffee-network`

## 📄 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。 