# 景田网站 Vercel 部署指南（2025 更新版）

## 🎯 已完成的优化

本项目已完成 Vercel 兼容性改造：

✅ **无状态会话管理** - 使用 cookie-session 替代 express-session
✅ **Serverless 优化** - 支持 Vercel Functions 60 秒超时
✅ **数据库自动初始化** - 每次部署自动创建 SQLite 数据库
✅ **环境变量配置** - 支持 Vercel 环境变量

---

## 第一步：推送代码到 GitHub

打开命令行，在项目目录下执行：

```bash
# 切换到项目目录
cd jingtian-water-website

# 添加所有文件
git add .

# 提交
git commit -m "修复 Vercel 部署：改用 cookie-session 和无状态架构"

# 添加远程仓库（如果还没有）
git remote add origin https://github.com/hk373623426-commits/-.git

# 推送到 GitHub
git push -u origin main
```

⚠️ **注意**: 如果推送失败，请检查网络连接或重试。

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

### 2.4 添加环境变量（推荐）

点击 "Environment Variables" 添加：

| Name | Value | 说明 |
|------|-------|------|
| `SESSION_SECRET` | `jingtian-secret-2025-random` | 会话加密密钥 |
| `ADMIN_EMAIL` | `admin@jingtian.com` | 管理员账号 |
| `ADMIN_PASSWORD` | `admin123` | 管理员密码 |

💡 **提示**: cookie-session 将会话数据加密后存储在客户端 cookie 中，无需服务端会话存储。

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

### 📦 数据库持久化

⚠️ **Vercel 免费版使用临时文件系统**，数据库在以下情况会被重置：

- 每次重新部署后
- 容器重启时（较少见）

**当前解决方案：**
使用 `/tmp/jingtian.db` 临时存储，每次部署自动初始化数据。

**生产环境推荐方案：**
迁移到外部数据库：
- [Supabase](https://supabase.com) - 免费 PostgreSQL
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) - Vercel 官方 Redis
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) - Vercel 对象存储

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
