#!/bin/bash

echo "=========================================="
echo "景田天然矿泉水网站启动脚本"
echo "=========================================="

# 检查Node.js版本
NODE_VERSION=$(node -v)
echo "Node.js版本: $NODE_VERSION"

# 检查npm版本
NPM_VERSION=$(npm -v)
echo "npm版本: $NPM_VERSION"

# 安装依赖
echo "正在安装依赖..."
npm install

# 复制环境变量文件
if [ ! -f .env ]; then
    echo "正在创建环境变量文件..."
    cp .env.example .env
    echo "请编辑 .env 文件中的配置"
fi

# 初始化数据
echo "正在初始化数据库数据..."
npm run init

# 启动应用
echo "正在启动应用..."
echo "=========================================="
echo "访问地址:"
echo "前台: http://localhost:3000"
echo "后台: http://localhost:3000/admin/login"
echo "=========================================="
echo "默认管理员账号:"
echo "邮箱: admin@jingtian.com"
echo "密码: admin123"
echo "=========================================="

npm start