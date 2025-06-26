#!/bin/bash

# 咖啡点单系统 Docker 部署脚本
# 作者: AI Assistant
# 版本: 1.0

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_message $RED "❌ Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_message $RED "❌ Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_message $GREEN "✅ Docker 环境检查通过"
}

# 清理旧容器和镜像
cleanup() {
    print_message $YELLOW "🧹 清理旧容器和镜像..."
    
    # 停止并删除容器
    docker-compose down --remove-orphans || true
    
    # 删除旧镜像
    docker rmi coffee-shop:latest || true
    
    print_message $GREEN "✅ 清理完成"
}

# 构建Docker镜像
build_image() {
    print_message $YELLOW "🔨 构建 Docker 镜像..."
    
    # 构建镜像
    docker-compose build --no-cache
    
    print_message $GREEN "✅ 镜像构建完成"
}

# 启动服务
start_services() {
    print_message $YELLOW "🚀 启动服务..."
    
    # 启动服务
    docker-compose up -d
    
    print_message $GREEN "✅ 服务启动完成"
}

# 检查服务状态
check_health() {
    print_message $YELLOW "🔍 检查服务健康状态..."
    
    # 等待服务启动
    sleep 10
    
    # 检查容器状态
    if docker-compose ps | grep -q "Up"; then
        print_message $GREEN "✅ 容器运行正常"
    else
        print_message $RED "❌ 容器启动失败"
        docker-compose logs
        exit 1
    fi
    
    # 检查健康检查
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/api/health &> /dev/null; then
            print_message $GREEN "✅ 应用健康检查通过"
            break
        fi
        
        print_message $YELLOW "⏳ 等待应用启动... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_message $RED "❌ 应用健康检查失败"
        docker-compose logs
        exit 1
    fi
}

# 显示部署信息
show_info() {
    print_message $BLUE "
🎉 咖啡点单系统部署完成！

📊 访问信息:
   🌐 应用地址: http://localhost
   📊 健康检查: http://localhost/api/health
   👤 默认管理员: admin

🔧 管理命令:
   查看日志: docker-compose logs -f
   停止服务: docker-compose down
   重启服务: docker-compose restart
   查看状态: docker-compose ps

📁 数据持久化:
   数据库: Docker volume 'coffee_data' -> /app/data/database.sqlite
   上传文件: Docker volume 'coffee_uploads' -> /app/server/uploads

💡 提示:
   - 数据会自动持久化到 Docker volumes
   - 重启容器不会丢失数据
   - 使用 './deploy.sh update' 更新代码但保留数据
   - 使用 './deploy.sh clean' 可以清理所有数据
   - 生产环境建议配置 Nginx 反向代理
"
}

# 主函数
main() {
    print_message $BLUE "
🚀 咖啡点单系统 Docker 部署脚本
=====================================
"
    
    # 检查参数
    case "${1:-deploy}" in
        "deploy")
            check_docker
            cleanup
            build_image
            start_services
            check_health
            show_info
            ;;
        "start")
            print_message $YELLOW "🚀 启动服务..."
            docker-compose up -d
            ;;
        "stop")
            print_message $YELLOW "⏹️  停止服务..."
            docker-compose down
            ;;
        "restart")
            print_message $YELLOW "🔄 重启服务..."
            docker-compose restart
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "status")
            docker-compose ps
            ;;
        "clean")
            print_message $YELLOW "🧹 清理所有数据..."
            docker-compose down -v --remove-orphans
            docker rmi coffee-shop:latest || true
            ;;
        "update")
            print_message $YELLOW "🔄 更新部署 (保留数据)..."
            check_docker
            # 停止服务但不删除容器，保留数据
            docker-compose stop
            # 重新构建
            build_image
            # 启动服务
            start_services
            check_health
            print_message $GREEN "✅ 更新完成，数据已保留"
            ;;
        "help")
            print_message $BLUE "
使用方法: $0 [命令]

命令:
  deploy   - 完整部署 (默认，会重建容器)
  update   - 更新部署 (保留数据)
  start    - 启动服务
  stop     - 停止服务
  restart  - 重启服务
  logs     - 查看日志
  status   - 查看状态
  clean    - 清理所有数据
  help     - 显示帮助

💡 提示:
  - 使用 'deploy' 进行全新部署
  - 使用 'update' 更新代码但保留数据
  - 数据存储在 Docker volumes 中，会自动持久化
"
            ;;
        *)
            print_message $RED "❌ 未知命令: $1"
            print_message $YELLOW "使用 '$0 help' 查看帮助"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 