# 景田网站 Vercel 部署指南

## 第一步：准备 GitHub 仓库

### 1.1 创建 GitHub 仓库

1. 访问 [github.com](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 填写仓库名称：`jingtian-water-website`
4. 选择 "Public" 或 "Private"
5. 点击 "Create repository"

### 1.2 推送代码到 GitHub

打开命令行，在项目目录下执行：

```bash
# 初始化 git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit - 景田免注册电商网站"

# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/jingtian-water-website.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

---

## 第二步：在 Vercel 部署

### 2.1 注册/登录 Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Sign Up" 或使用 GitHub 账号直接登录

### 2.2 导入项目

1. 登录后点击 "Add New..." → "Project"
2. 在 "Import Git Repository" 页面找到你的 `jingtian-water-website` 仓库
3. 点击 "Import"

### 2.3 配置部署设置

**保持默认设置即可：**

- **Framework Preset**: Other
- **Build Command**: 留空（不需要构建）
- **Output Directory**: 留空
- **Install Command**: `npm install`（默认）

### 2.4 添加环境变量（可选）

点击 "Environment Variables" 添加：

| Name | Value |
|------|-------|
| `SESSION_SECRET` | 任意随机字符串，如 `jingtian-secret-2025` |
| `ADMIN_EMAIL` | `admin@jingtian.com` |
| `ADMIN_PASSWORD` | `admin123` |

### 2.5 开始部署

点击 "Deploy" 按钮，等待部署完成（约 1-2 分钟）

---

## 第三步：访问网站

部署完成后，Vercel 会给你一个域名：

- **前台网站**: `https://jingtian-water-website.vercel.app`
- **后台管理**: `https://jingtian-water-website.vercel.app/admin/login`

### 自定义域名（可选）

1. 在 Vercel 项目页面点击 "Settings" → "Domains"
2. 添加你的自定义域名
3. 按照提示配置 DNS

---

## 重要说明

### 数据库持久化

⚠️ **Vercel 免费版使用临时文件系统**，数据库在以下情况会被重置：

- 每次重新部署后
- 容器重启时

**解决方案：**

1. **对于演示/测试用途**: 当前配置已经足够
2. **对于生产环境**: 建议迁移到外部数据库
   - [Supabase](https://supabase.com) - 免费 PostgreSQL
   - [PlanetScale](https://planetscale.com) - 免费 MySQL
   - [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) - Vercel 官方存储

### 自动部署

配置完成后，每次 push 到 GitHub 仓库都会自动部署：

```bash
# 修改代码后
git add .
git commit -m "更新产品列表"
git push
```

Vercel 会自动检测并重新部署，无需手动操作。

---

## 其他免费部署平台

如果 Vercel 不符合需求，还可以考虑：

### 1. Render (render.com)

- 免费套餐：Web 服务 + PostgreSQL
- 优点：自带数据库，无需额外配置
- 缺点：免费实例会休眠，首次访问需等待启动

### 2. Railway (railway.app)

- 免费额度：$5/月
- 优点：配置简单，支持多种数据库
- 缺点：按使用量计费

### 3. Zeabur (zeabur.com)

- 免费额度：$5/月
- 优点：中文界面，国内访问快
- 缺点：需要绑定支付方式

---

## 故障排查

### 部署失败

1. 查看 Vercel 的 "Deploy Logs"
2. 常见错误：
   - `npm install` 失败 → 检查 `package.json` 格式
   - 启动超时 → 确保服务器监听 `process.env.PORT`

### 数据库错误

- 检查数据库路径是否正确
- Vercel 环境确保使用 `/tmp/jingtian.db`

### 502 Bad Gateway

- 服务器未正确启动
- 检查 `app.js` 的导出是否正确

---

## 管理后台

### 登录信息

- **地址**: `https://你的域名.vercel.app/admin/login`
- **账号**: `admin@jingtian.com`
- **密码**: `admin123`

### 后台功能

- 产品管理：添加/编辑/删除产品
- 订单管理：查看订单、更新状态
- 库存管理：调整库存数量

---

## 下一步

1. **添加产品**: 登录后台，添加景田矿泉水产品
2. **配置域名**: 绑定自定义域名提升专业度
3. **设置支付**: 集成支付宝/微信支付
4. **优化 SEO**: 添加 meta 标签提升搜索排名

---

**祝你部署顺利！** 🚀

如有问题，请查看项目 README.md 或提交 Issue。
