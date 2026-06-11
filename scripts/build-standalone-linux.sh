#!/bin/bash

# ============================================================
#  在 Linux 服务器上构建 Next.js Standalone 产物
#
#  用法：
#    chmod +x scripts/build-standalone-linux.sh
#    ./scripts/build-standalone-linux.sh
#
#  构建完成后，产物在 .next/standalone-build.tar.gz
#  把这个文件下载到 Windows 的 .next/ 目录下，
#  然后运行 npm run electron:pack:win 即可打包 EXE
# ============================================================

set -e  # 遇到错误立即停止

echo "========================================"
echo "  财务日历 - Linux Standalone 构建"
echo "========================================"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js，请先安装 Node.js 18+"
    echo "   推荐使用 nvm 安装："
    echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "   nvm install 20"
    exit 1
fi

echo ""
echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"

# Step 1: 安装依赖
echo ""
echo "📦 Step 1/5: 安装依赖..."
npm install

# Step 2: 选择 SQLite schema
echo ""
echo "📦 Step 2/5: 选择 SQLite schema..."
DB_PROVIDER=sqlite node scripts/select-schema.js

# Step 3: 生成 Prisma Client（包含多平台引擎）
echo ""
echo "📦 Step 3/5: 生成 Prisma Client（包含多平台引擎）..."
echo "   （schema.sqlite.prisma 中配置了 binaryTargets，"
echo "    会同时生成 Linux/Windows/macOS 的引擎文件）"
npx prisma generate

# Step 4: 构建 Next.js standalone
echo ""
echo "📦 Step 4/5: 构建 Next.js standalone..."
echo "   （这需要 2-5 分钟，请耐心等待...）"
BUILD_TARGET=electron next build

# Step 5: 复制文件并打包
echo ""
echo "📦 Step 5/5: 复制文件并打包..."

# 复制静态文件
mkdir -p .next/standalone/.next/static
cp -r .next/static/* .next/standalone/.next/static/ 2>/dev/null || true
echo "  ✅ 复制 .next/static"

# 复制 public 目录
cp -r public .next/standalone/public 2>/dev/null || true
echo "  ✅ 复制 public"

# 复制 prisma schema
cp -r prisma .next/standalone/prisma 2>/dev/null || true
echo "  ✅ 复制 prisma"

# 复制 Prisma 引擎文件（包含多平台二进制文件）
if [ -d "node_modules/.prisma/client" ]; then
    mkdir -p .next/standalone/node_modules/.prisma/client
    cp -r node_modules/.prisma/client/* .next/standalone/node_modules/.prisma/client/ 2>/dev/null || true
    echo "  ✅ 复制 Prisma 引擎（含多平台二进制）"
fi

# 复制 Prisma CLI（运行时 db push 需要）
if [ -d "node_modules/prisma" ]; then
    # 复制整个 prisma CLI 包
    rm -rf .next/standalone/node_modules/prisma 2>/dev/null || true
    mkdir -p .next/standalone/node_modules/prisma
    cp -r node_modules/prisma .next/standalone/node_modules/ 2>/dev/null || true
    echo "  ✅ 复制 Prisma CLI"

    # 重建 .bin 链接（Windows 上没有 symlink，需要创建脚本）
    mkdir -p .next/standalone/node_modules/.bin
    # 创建跨平台的 prisma 入口脚本
    cat > .next/standalone/node_modules/.bin/prisma << 'PRISMA_BIN'
#!/usr/bin/env node
require('../prisma/build/index.js');
PRISMA_BIN
    chmod +x .next/standalone/node_modules/.bin/prisma 2>/dev/null || true

    # 同时创建 Windows 的 .cmd 文件
    cat > .next/standalone/node_modules/.bin/prisma.cmd << 'PRISMA_CMD'
@echo off
node "%~dp0\..\prisma\build\index.js" %*
PRISMA_CMD
    echo "  ✅ 创建 Prisma CLI 入口脚本（Linux + Windows）"
fi

# 创建 db 目录
mkdir -p .next/standalone/db
echo "  ✅ 创建 db 目录"

# 打包（去除符号链接，避免 Windows 解压问题）
echo ""
echo "📦 打包 standalone-build.tar.gz..."
echo "   （去除符号链接，确保 Windows 兼容）"

# 先清理可能存在的符号链接
find .next/standalone -type l -delete 2>/dev/null || true

cd .next
tar -czf standalone-build.tar.gz standalone
cd ..

# 获取文件大小
FILE_SIZE=$(du -h .next/standalone-build.tar.gz | cut -f1)

echo ""
echo "========================================"
echo "  ✅ 构建完成！"
echo ""
echo "  产物位置: .next/standalone-build.tar.gz"
echo "  文件大小: ${FILE_SIZE}"
echo ""
echo "  接下来请在 Windows 上操作："
echo ""
echo "  1. 把 standalone-build.tar.gz 下载到 Windows 电脑"
echo "     （用 SCP/SFTP/网盘等方式）"
echo ""
echo "  2. 放到项目的 .next/ 目录下，例如："
echo "     C:\cal\calendar-app-main\.next\"
echo ""
echo "  3. 在 .next/ 目录下解压（Windows 10+ 自带 tar）："
echo "     cd C:\cal\calendar-app-main\.next"
echo "     tar -xzf standalone-build.tar.gz"
echo ""
echo "  4. 回到项目根目录，运行打包命令："
echo "     cd C:\cal\calendar-app-main"
echo "     npm run electron:pack:win"
echo ""
echo "  打包完成后，安装程序在 dist-electron/ 目录下"
echo "========================================"
