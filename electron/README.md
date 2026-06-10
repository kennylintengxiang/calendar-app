# 财务日历 - Electron 桌面版

将 Next.js 日历应用打包成 Windows/Mac/Linux 桌面安装程序。

## 📋 前提条件

- **Node.js** ≥ 18
- **Git**
- **Windows**: 无额外要求
- **Mac**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: 无额外要求

## 🚀 快速开始（3步）

### 第 1 步：克隆代码并安装依赖

```bash
git clone https://github.com/kennylintengxiang/calendar-app.git
cd calendar-app
npm install
```

### 第 2 步：初始化数据库

```bash
# 确保 .env 文件使用 SQLite
echo "DATABASE_URL=file:./db/calendar.db" > .env

# 推送数据库 schema
npm run db:push
```

### 第 3 步：构建桌面安装程序

```bash
# Windows（生成 .exe 安装程序）
npm run electron:build:win

# Mac（生成 .dmg 安装程序）
npm run electron:build:mac

# Linux（生成 .AppImage）
npm run electron:build:linux
```

构建完成后，安装程序在 `dist-electron/` 目录中。

---

## 🔧 开发模式

开发模式下可以实时预览 Electron 桌面窗口：

```bash
# 终端 1：启动 Next.js 开发服务器
DATABASE_URL=file:./db/calendar.db npm run dev

# 终端 2：启动 Electron
DATABASE_URL=file:./db/calendar.db npx electron .
```

---

## 📦 构建产物说明

| 平台 | 产物 | 说明 |
|------|------|------|
| Windows | `财务日历-Setup-1.0.0.exe` | NSIS 安装程序，可自定义安装路径 |
| Mac | `财务日历-1.0.0-arm64.dmg` | DMG 镜像，拖拽到 Applications 安装 |
| Mac | `财务日历-1.0.0-x64.dmg` | Intel Mac 版本 |
| Linux | `财务日历-1.0.0.AppImage` | 免安装，直接运行 |

---

## 📂 数据存储位置

桌面版使用 SQLite 数据库，数据文件存储在系统标准位置：

| 系统 | 数据库路径 |
|------|-----------|
| Windows | `%APPDATA%\calendar-app\calendar.db` |
| macOS | `~/Library/Application Support/calendar-app/calendar.db` |
| Linux | `~/.config/calendar-app/calendar.db` |

> 可以通过菜单 **帮助 → 数据目录** 快速打开数据库所在文件夹

---

## 🏗️ 架构说明

```
electron/
├── main.js          # Electron 主进程：启动 Next.js 服务器 + 创建窗口
├── preload.js       # 预加载脚本：安全桥接
└── README.md        # 本文件

scripts/
└── build-electron.js  # 构建脚本：standalone 构建 + 打包

electron-builder.yml   # electron-builder 配置
```

### 运行原理

1. Electron 主进程启动一个 **本地 Next.js 服务器**（端口 17432）
2. 创建 **BrowserWindow** 加载 `http://127.0.0.1:17432`
3. 数据库使用 **SQLite**，文件存放在用户数据目录
4. 关闭窗口时自动关闭服务器进程

### 构建流程

1. 选择 SQLite Prisma schema
2. 生成 Prisma Client
3. 以 `standalone` 模式构建 Next.js
4. 复制静态文件、public 文件、Prisma 引擎到 standalone 目录
5. 用 electron-builder 打包成安装程序

---

## ⚠️ 常见问题

### 1. 构建报错 `electron-builder`

确保已安装所有依赖：
```bash
npm install
```

### 2. Windows 构建需要额外工具

Windows 上可能需要安装：
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（C++ 桌面开发工作负载）
- [WiX Toolset](https://wixtoolset.org/)（如果需要 MSI 格式）

### 3. Mac 签名问题

未签名应用在 Mac 上打开时会提示"无法验证开发者"。解决方法：
- 右键点击应用 → 选择"打开"
- 或在系统偏好设置 → 安全性与隐私 → 点击"仍要打开"

### 4. 数据从 Supabase 迁移到本地

参考项目根目录的部署文档，使用 `pg_dump` 导出 Supabase 数据，然后用 SQLite 工具导入。

### 5. 端口冲突

Electron 版默认使用端口 17432。如果该端口被占用，应用会自动尝试启动但可能失败。关闭占用端口的程序后重试。

---

## 🔄 与 Vercel 版本的区别

| 特性 | Vercel 版本 | Electron 桌面版 |
|------|------------|----------------|
| 数据库 | PostgreSQL (Supabase) | SQLite (本地文件) |
| 联网要求 | 需要 | 不需要 |
| 分享功能 | ✅ 公网链接 | ❌ 仅局域网 |
| 安装方式 | 浏览器访问 | 安装程序 |
| 数据位置 | 云端 | 本地文件 |
| 费用 | 免费 | 免费 |
