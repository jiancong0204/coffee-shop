# 多阶段构建 Dockerfile
# 阶段1: 构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# 复制前端依赖文件
COPY client/package*.json ./

# 安装前端依赖
RUN npm install

# 复制前端源代码
COPY client/ ./

# 构建前端应用
RUN npm run build

# 阶段2: 构建最终镜像
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache sqlite

# 复制后端依赖文件
COPY package*.json ./

# 安装后端依赖
RUN npm ci --only=production

# 复制后端源代码
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY config.js ./
COPY start-ipv6.js ./
COPY get-ip.js ./

# 从前端构建阶段复制构建产物
COPY --from=frontend-builder /app/client/build ./client/build

# 创建数据目录
RUN mkdir -p /app/data

# 创建上传目录
RUN mkdir -p /app/server/uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/data/database.sqlite

# 暴露端口
EXPOSE 5000

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S coffee-app -u 1001 -G nodejs

# 设置目录权限
RUN chown -R coffee-app:nodejs /app

# 切换到非root用户
USER coffee-app

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
CMD ["node", "server/index.js"] 