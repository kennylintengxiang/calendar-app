# 日历应用 - Vercel + Supabase 部署教程

> 零基础也能跟着做，每一步都有截图说明

---

## 📋 你需要准备的东西

| 准备项 | 说明 | 费用 |
|--------|------|------|
| 一个 GitHub 账号 | 用来存放代码 | 免费 |
| 一个 Supabase 账号 | 用来提供云数据库 | 免费 |
| 一个 Vercel 账号 | 用来部署网站 | 免费 |

> 💡 提示：Supabase 和 Vercel 都可以用 GitHub 账号直接登录，不用重复注册

---

## 第一步：把代码上传到 GitHub

### 1.1 登录 GitHub
打开 https://github.com 并登录

### 1.2 创建新仓库
1. 点击右上角 **"+"** 号 → 选择 **"New repository"**
2. 填写：
   - Repository name: `calendar-app`（随便取个名字）
   - 选择 **Private**（私有仓库）
3. 点击 **"Create repository"**

### 1.3 上传代码
1. 把你电脑上的项目文件夹拖到 GitHub 页面上
2. 或者用 Git 命令推送（如果你会用 Git）

---

## 第二步：创建 Supabase 数据库

### 2.1 注册 Supabase
1. 打开 https://supabase.com
2. 点击 **"Start your project"**
3. 用 GitHub 账号登录

### 2.2 创建项目
1. 点击 **"New Project"**
2. 填写：
   - Name: `calendar-app`（随便取）
   - Database Password: **设置一个密码，一定要记住！**（后面要用）
   - Region: 选择 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**
3. 点击 **"Create new project"**
4. 等待 1-2 分钟，项目创建完成

### 2.3 获取数据库连接地址
1. 进入项目后，点击左侧 **"Project Settings"**（齿轮图标）
2. 点击 **"Database"**
3. 找到 **"Connection string"** 部分
4. 选择 **"URI"** 标签
5. 复制连接地址（类似这样的）：
   ```
   postgresql://postgres.xxxxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
6. ⚠️ 把里面的 `[YOUR-PASSWORD]` 替换成你刚才设置的密码

> 💡 保存好这个地址，下一步要用！

---

## 第三步：部署到 Vercel

### 3.1 注册 Vercel
1. 打开 https://vercel.com
2. 点击 **"Sign Up"**
3. 用 GitHub 账号登录

### 3.2 导入项目
1. 点击 **"Add New..."** → **"Project"**
2. 在列表中找到你刚才创建的 `calendar-app` 仓库
3. 点击 **"Import"**

### 3.3 配置环境变量（最重要的一步！）
1. 在部署页面，找到 **"Environment Variables"** 区域
2. 添加一个变量：
   - Name: `DATABASE_URL`
   - Value: 粘贴第二步获取的 Supabase 连接地址
3. 点击 **"Add"**

### 3.4 开始部署
1. 点击 **"Deploy"** 按钮
2. 等待 2-3 分钟
3. 看到 🎉 庆祝画面 = 部署成功！

### 3.5 访问你的应用
部署完成后，Vercel 会给你一个网址，类似：
```
https://calendar-app-xxxxx.vercel.app
```

**这就是你的日历应用的公网地址！分享功能可以正常使用了！** ✅

---

## 第四步：初始化数据库

第一次部署后，数据库是空的，需要初始化：

1. 打开你的应用网址
2. 应用会自动创建默认用户和示例数据
3. 如果没有自动创建，在浏览器地址栏访问：
   ```
   https://你的网址/api/init
   ```

---

## 🔄 后续更新代码

如果你修改了代码，想更新部署：

1. 把新代码推送到 GitHub
2. Vercel 会**自动检测并重新部署**（不用手动操作）

---

## ❓ 常见问题

### Q: 部署失败怎么办？
检查 Vercel 的构建日志（Build Log），看具体报错信息。最常见的原因是 `DATABASE_URL` 配置错误。

### Q: 数据库连接失败？
1. 确认 Supabase 项目状态是 "Active"
2. 确认连接地址中的密码正确
3. 确认连接地址没有多余的空格

### Q: 分享链接打不开？
1. 确认你用的是 Vercel 分配的公网地址
2. 确认对方网络可以访问该地址

### Q: 想换回 SQLite？
在 Vercel 的环境变量中删除 `DATABASE_URL`，或者改回 `file:./db/custom.db`，然后重新部署。

---

## 📊 两种模式对比

| | 本地/沙盒 (SQLite) | Vercel 部署 (PostgreSQL) |
|--|-------------------|------------------------|
| 数据库 | 本地文件 | Supabase 云端 |
| 联网要求 | 不需要 | 需要 |
| 分享功能 | ❌ 不可用 | ✅ 可用 |
| 协作功能 | ❌ 不可用 | ✅ 可用 |
| 费用 | 免费 | 免费 |
| 数据独立 | ✅ 各自独立 | ✅ 各自独立 |
