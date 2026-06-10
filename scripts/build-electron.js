#!/usr/bin/env node

/**
 * Electron 构建脚本
 *
 * 构建流程：
 * 1. 选择 SQLite schema
 * 2. 生成 Prisma Client
 * 3. 构建 Next.js standalone 产物
 * 4. 复制必要文件到 standalone 目录
 * 5. 用 electron-builder 打包成安装程序
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')

function run(cmd, options = {}) {
  console.log(`\n▶ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR, ...options })
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

console.log('========================================')
console.log('  财务日历 - Electron 桌面版构建')
console.log('========================================')

// Step 1: 选择 SQLite schema
console.log('\n📦 Step 1/5: 选择 SQLite schema...')
run('DB_PROVIDER=sqlite node scripts/select-schema.js')

// Step 2: 生成 Prisma Client
console.log('\n📦 Step 2/5: 生成 Prisma Client...')
run('npx prisma generate')

// Step 3: 构建 Next.js standalone
console.log('\n📦 Step 3/5: 构建 Next.js standalone...')
run('BUILD_TARGET=electron next build')

// Step 4: 复制必要文件到 standalone 目录
console.log('\n📦 Step 4/5: 复制必要文件...')

const standaloneDir = path.join(ROOT_DIR, '.next', 'standalone')
const staticDir = path.join(ROOT_DIR, '.next', 'static')
const publicDir = path.join(ROOT_DIR, 'public')
const prismaDir = path.join(ROOT_DIR, 'prisma')

// 复制 .next/static 到 standalone/.next/static
const standaloneStaticDir = path.join(standaloneDir, '.next', 'static')
if (fs.existsSync(staticDir)) {
  copyRecursive(staticDir, standaloneStaticDir)
  console.log('  ✅ 复制 .next/static')
}

// 复制 public 到 standalone/public
const standalonePublicDir = path.join(standaloneDir, 'public')
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, standalonePublicDir)
  console.log('  ✅ 复制 public')
}

// 复制 prisma schema 到 standalone/prisma
const standalonePrismaDir = path.join(standaloneDir, 'prisma')
if (fs.existsSync(prismaDir)) {
  copyRecursive(prismaDir, standalonePrismaDir)
  console.log('  ✅ 复制 prisma')
}

// 复制 Prisma 引擎文件到 standalone
// Prisma 引擎通常在 node_modules/.prisma/client 或 node_modules/@prisma/engines
const prismaEnginesDir = path.join(ROOT_DIR, 'node_modules', '.prisma', 'client')
if (fs.existsSync(prismaEnginesDir)) {
  const standaloneEnginesDir = path.join(standaloneDir, 'node_modules', '.prisma', 'client')
  copyRecursive(prismaEnginesDir, standaloneEnginesDir)
  console.log('  ✅ 复制 Prisma 引擎')
}

// 创建 db 目录在 standalone 中
const dbDir = path.join(standaloneDir, 'db')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log('  ✅ 创建 db 目录')
}

// Step 5: 用 electron-builder 打包
// 从命令行参数获取目标平台，默认为当前平台
const platformArg = process.argv[2] || ''
let electronBuilderCmd = 'npx electron-builder'

if (platformArg === '--win' || platformArg === '-w') {
  electronBuilderCmd += ' --win'
} else if (platformArg === '--mac' || platformArg === '-m') {
  electronBuilderCmd += ' --mac'
} else if (platformArg === '--linux' || platformArg === '-l') {
  electronBuilderCmd += ' --linux'
}

console.log('\n📦 Step 5/5: 打包成安装程序...')
run(electronBuilderCmd)

console.log('\n========================================')
console.log('  ✅ 构建完成！')
console.log('  安装程序在: dist-electron/')
console.log('========================================')
