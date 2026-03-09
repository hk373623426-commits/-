# 景田天然矿泉水 - 免注册电商网站

一个基于 Node.js + Express + SQLite 的桶装矿泉水电商网站，支持**免注册直接下单**。

## 功能特点

- **免注册购物** - 用户无需注册，直接填写地址电话即可下单
- **购物车功能** - 添加商品、修改数量、删除商品
- **订单管理** - 订单提交、订单查询、订单状态跟踪
- **后台管理** - 产品管理、订单管理、库存管理
- **响应式设计** - 支持 PC 和移动端访问

## 技术栈

- **后端**: Node.js + Express.js
- **数据库**: SQLite（轻量级，无需额外安装）
- **前端**: HTML5 + CSS3 + JavaScript + Bootstrap 5
- **模板引擎**: EJS
- **认证**: Session + JWT
- **部署**: 支持各种云服务器和虚拟主机

## 部署到 Vercel（免费）

### 1. 准备工作

- 拥有 GitHub 账号
- 拥有 Vercel 账号（可以用 GitHub 登录）

### 2. 推送代码到 GitHub

```bash
# 初始化 git 仓库（如果没有）
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库（替换为你的 GitHub 仓库）
git remote add origin https://github.com/YOUR_USERNAME/jingtian-water-website.git
git push -u origin main
```

### 3. 在 Vercel 部署

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Add New Project"
4. 导入你的 GitHub 仓库
5. 配置部署设置：
   - **Build Command**: 留空（不需要构建）
   - **Output Directory**: 留空
   - **Install Command**: `npm install`
6. 点击 "Deploy"

### 4. 环境变量（可选）

在 Vercel 项目设置中添加以下环境变量：

- `SESSION_SECRET`: 会话密钥（任意字符串）
- `ADMIN_EMAIL`: 管理员邮箱
- `ADMIN_PASSWORD`: 管理员密码

### 5. 数据库说明

Vercel 使用临时文件系统，数据库存储在 `/tmp/jingtian.db`。
**注意**: Vercel 免费版的数据库在每次部署后会重置。如果需要持久化数据，建议：
- 使用 Vercel Blob Storage
- 或迁移到外部数据库（如 Supabase、PlanetScale）

## 快速开始

### 1. 环境要求
- Node.js 14.0 或更高版本
- npm 6.0 或更高版本

### 2. 安装步骤

```bash
# 克隆项目
git clone <repository-url>
cd jingtian-water-website

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑环境变量（可选）
# 修改 .env 文件中的配置

# 启动开发服务器
npm run dev

# 或者直接启动
npm start
```

### 3. 默认管理员账号
- 邮箱: admin@jingtian.com
- 密码: admin123

### 4. 访问地址
- 前台网站: http://localhost:3000
- 后台管理: http://localhost:3000/admin/login

## 项目结构

```
jingtian-water-website/
├── public/                 # 静态资源
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript文件
│   └── images/            # 图片资源
├── views/                 # 视图模板
│   ├── frontend/          # 前台页面
│   └── admin/             # 后台页面
├── routes/                # 路由文件
│   ├── index.js          # 主路由
│   ├── auth.js           # 认证路由
│   ├── cart.js           # 购物车路由
│   ├── orders.js         # 订单路由
│   └── admin.js          # 后台路由
├── config/               # 配置文件
│   └── database.js       # 数据库配置
├── database/             # 数据库文件（自动生成）
├── app.js               # 应用入口文件
├── package.json         # 项目配置
├── .env.example         # 环境变量示例
└── README.md            # 项目说明
```

## 数据库设计

### 主要数据表
1. **users** - 用户表
2. **products** - 产品表
3. **categories** - 分类表
4. **cart** - 购物车表
5. **orders** - 订单表
6. **order_items** - 订单项表

## 部署指南

### 1. 传统服务器部署

```bash
# 1. 上传文件到服务器
scp -r jingtian-water-website/ user@your-server:/var/www/

# 2. 在服务器上安装依赖
cd /var/www/jingtian-water-website
npm install --production

# 3. 设置环境变量
cp .env.example .env
# 编辑 .env 文件

# 4. 使用PM2管理进程（推荐）
npm install -g pm2
pm2 start app.js --name "jingtian-water"

# 5. 设置开机自启
pm2 startup
pm2 save
```

### 2. Docker部署

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# 构建镜像
docker build -t jingtian-water .

# 运行容器
docker run -d \
  -p 3000:3000 \
  --name jingtian-water \
  -v $(pwd)/database:/app/database \
  jingtian-water
```

### 3. 云平台部署

#### Vercel / Netlify
由于项目使用Node.js后端，需要选择支持Node.js的云平台。

#### 阿里云/腾讯云
可以使用云服务器ECS，按照传统服务器部署步骤操作。

## 配置说明

### 环境变量 (.env)
```env
# 应用配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_PATH=./database/jingtian.db

# JWT配置
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# 会话配置
SESSION_SECRET=your_session_secret_here_change_in_production

# 管理员账号
ADMIN_EMAIL=admin@jingtian.com
ADMIN_PASSWORD=admin123
```

### 安全建议
1. 生产环境务必修改所有密钥
2. 启用HTTPS
3. 定期备份数据库
4. 设置防火墙规则
5. 使用环境变量存储敏感信息

## 开发指南

### 添加新产品
1. 登录后台管理系统
2. 进入"产品管理"
3. 点击"添加产品"
4. 填写产品信息并保存

### 自定义样式
- 修改 `public/css/style.css`
- 添加新的CSS文件到 `public/css/` 目录
- 在布局文件中引用新的CSS文件

### 添加新功能
1. 在 `routes/` 目录下创建新的路由文件
2. 在 `app.js` 中注册路由
3. 在 `views/` 目录下创建对应的视图文件
4. 如果需要，在 `public/js/` 目录下添加JavaScript文件

## 常见问题

### Q: 数据库文件在哪里？
A: 数据库文件位于 `database/jingtian.db`，首次运行会自动创建。

### Q: 如何重置管理员密码？
A: 可以通过SQLite客户端直接修改数据库，或者删除数据库文件重新启动应用。

### Q: 如何修改网站名称和Logo？
A: 修改 `views/frontend/layout.ejs` 中的相关代码。

### Q: 支持哪些支付方式？
A: 目前支持模拟支付，可以集成支付宝、微信支付等第三方支付平台。

### Q: 如何备份数据？
A: 定期备份 `database/jingtian.db` 文件即可。

## 性能优化建议

1. **启用Gzip压缩**
2. **使用CDN加速静态资源**
3. **启用数据库索引**
4. **使用Redis缓存会话**
5. **压缩图片资源**
6. **启用HTTP/2**

## 许可证

MIT License

## 技术支持

如有问题，请提交Issue或联系技术支持。

---

**景田天然矿泉水** - 让健康饮水触手可及