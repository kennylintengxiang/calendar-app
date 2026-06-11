#!/usr/bin/env node

/**
 * Electron 构建脚本（Windows/Mac/Linux 兼容）
 *
 * 构建流程：
 * 1. 选择 SQLite schema
 * 2. 生成 Prisma Client
 * 3. 构建 Next.js standalone 产物（或使用预构建产物）
 * 4. 复制必要文件到 standalone 目录
 * 5. 用 electron-builder 打包成安装程序
 *
 * 用法：
 *   node scripts/build-electron.js --win          完整构建（Windows）
 *   node scripts/build-electron.js --win --skip-build  跳过 Step 3（使用已有 .next/standalone）
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')

// 解析命令行参数
const args = process.argv.slice(2)
const skipBuild = args.includes('--skip-build')
const platformArg = args.find(a => !a.startsWith('--skip')) || ''

function run(cmd, options = {}) {
  console.log(`\n▶ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR, shell: true, ...options })
}

function runWithEnv(cmd, envVars, options = {}) {
  console.log(`\n▶ ${cmd} (env: ${JSON.stringify(envVars)})`)
  const env = { ...process.env, ...envVars }
  execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR, shell: true, env, ...options })
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

if (skipBuild) {
  console.log('\n⏭️  跳过 Step 1-3（使用预构建产物）')
  // 即使跳过构建，也需要在当前平台重新生成 Prisma Client
  // 因为预构建产物可能在其他平台（如 Linux）上生成的引擎不兼容当前系统
  console.log('\n📦 重新生成当前平台的 Prisma Client...')
  runWithEnv('node scripts/select-schema.js', { DB_PROVIDER: 'sqlite' })
  run('npx prisma generate')
} else {
  // Step 1: 选择 SQLite schema
  console.log('\n📦 Step 1/5: 选择 SQLite schema...')
  runWithEnv('node scripts/select-schema.js', { DB_PROVIDER: 'sqlite' })

  // Step 2: 生成 Prisma Client
  console.log('\n📦 Step 2/5: 生成 Prisma Client...')
  run('npx prisma generate')

  // Step 3: 构建 Next.js standalone
  console.log('\n📦 Step 3/5: 构建 Next.js standalone...')
  runWithEnv('next build', { BUILD_TARGET: 'electron' })
}

// 检查 standalone 目录是否存在
const standaloneDir = path.join(ROOT_DIR, '.next', 'standalone')
if (!fs.existsSync(standaloneDir)) {
  console.error('\n❌ 错误：.next/standalone 目录不存在！')
  console.error('   请先运行完整构建，或使用预构建产物（--skip-build）')
  console.error('   预构建产物使用方法：')
  console.error('   1. 将 standalone-build.tar.gz 解压到 .next/ 目录')
  console.error('   2. 运行：npm run electron:pack:win')
  process.exit(1)
}

// Step 4: 复制必要文件到 standalone 目录
console.log('\n📦 Step 4/5: 复制必要文件...')

const staticDir = path.join(ROOT_DIR, '.next', 'static')
const publicDir = path.join(ROOT_DIR, 'public')
const prismaDir = path.join(ROOT_DIR, 'prisma')

// 复制 .next/static 到 standalone/.next/static
const standaloneStaticDir = path.join(standaloneDir, '.next', 'static')
if (fs.existsSync(staticDir) && !fs.existsSync(standaloneStaticDir)) {
  copyRecursive(staticDir, standaloneStaticDir)
  console.log('  ✅ 复制 .next/static')
} else if (fs.existsSync(standaloneStaticDir)) {
  console.log('  ⏭️  .next/static 已存在，跳过')
}

// 复制 public 到 standalone/public
const standalonePublicDir = path.join(standaloneDir, 'public')
if (fs.existsSync(publicDir) && !fs.existsSync(standalonePublicDir)) {
  copyRecursive(publicDir, standalonePublicDir)
  console.log('  ✅ 复制 public')
} else if (fs.existsSync(standalonePublicDir)) {
  console.log('  ⏭️  public 已存在，跳过')
}

// 复制 prisma schema 到 standalone/prisma
const standalonePrismaDir = path.join(standaloneDir, 'prisma')
if (fs.existsSync(prismaDir) && !fs.existsSync(standalonePrismaDir)) {
  copyRecursive(prismaDir, standalonePrismaDir)
  console.log('  ✅ 复制 prisma')
} else if (fs.existsSync(standalonePrismaDir)) {
  console.log('  ⏭️  prisma 已存在，跳过')
}

// 复制 Prisma 引擎文件到 standalone
const prismaEnginesDir = path.join(ROOT_DIR, 'node_modules', '.prisma', 'client')
if (fs.existsSync(prismaEnginesDir)) {
  const standaloneEnginesDir = path.join(standaloneDir, 'node_modules', '.prisma', 'client')
  copyRecursive(prismaEnginesDir, standaloneEnginesDir)
  console.log('  ✅ 复制 Prisma 引擎')
}

// 复制 Prisma CLI 到 standalone（运行时需要 prisma db push 来创建表结构）
// Next.js standalone 输出不包含 devDependencies 中的包，
// 但 Electron 运行时需要 prisma CLI 来初始化数据库
const prismaCliDir = path.join(ROOT_DIR, 'node_modules', 'prisma')
if (fs.existsSync(prismaCliDir)) {
  const standalonePrismaCliDir = path.join(standaloneDir, 'node_modules', 'prisma')
  copyRecursive(prismaCliDir, standalonePrismaCliDir)
  console.log('  ✅ 复制 Prisma CLI')

  // 重建 .bin/prisma 入口脚本
  // 注意：不能使用 symlink，因为 Windows 上可能没有创建 symlink 的权限
  // 使用 fork() 直接调用 JS 入口文件，所以需要确保 build/index.js 存在
  const standaloneBinDir = path.join(standaloneDir, 'node_modules', '.bin')
  if (!fs.existsSync(standaloneBinDir)) {
    fs.mkdirSync(standaloneBinDir, { recursive: true })
  }
  const prismaCjsEntry = path.join(standalonePrismaCliDir, 'build', 'index.js')
  if (fs.existsSync(prismaCjsEntry)) {
    // Unix 风格入口脚本
    const prismaBinTarget = path.join(standaloneBinDir, 'prisma')
    fs.writeFileSync(prismaBinTarget, `#!/usr/bin/env node\nrequire('../prisma/build/index.js');\n`)
    console.log('  ✅ 创建 Prisma CLI 入口脚本')
  } else {
    console.log('  ⚠️ Prisma CLI 入口不存在: ' + prismaCjsEntry)
  }

  // 同时复制 @prisma 相关依赖（prisma CLI 依赖这些包）
  const prismaEnginesPkg = path.join(ROOT_DIR, 'node_modules', '@prisma', 'engines')
  if (fs.existsSync(prismaEnginesPkg)) {
    const standaloneEnginesPkg = path.join(standaloneDir, 'node_modules', '@prisma', 'engines')
    copyRecursive(prismaEnginesPkg, standaloneEnginesPkg)
    console.log('  ✅ 复制 @prisma/engines')
  }

  const prismaGetIntrospectionPkg = path.join(ROOT_DIR, 'node_modules', '@prisma', 'introspection')
  if (fs.existsSync(prismaGetIntrospectionPkg)) {
    const standaloneIntrospectionPkg = path.join(standaloneDir, 'node_modules', '@prisma', 'introspection')
    copyRecursive(prismaGetIntrospectionPkg, standaloneIntrospectionPkg)
    console.log('  ✅ 复制 @prisma/introspection')
  }

  const prismaMigratePkg = path.join(ROOT_DIR, 'node_modules', '@prisma', 'migrate')
  if (fs.existsSync(prismaMigratePkg)) {
    const standaloneMigratePkg = path.join(standaloneDir, 'node_modules', '@prisma', 'migrate')
    copyRecursive(prismaMigratePkg, standaloneMigratePkg)
    console.log('  ✅ 复制 @prisma/migrate')
  }
} else {
  console.log('  ⚠️ 未找到 Prisma CLI 包，跳过（运行时 db push 将不可用）')
}

// 创建 db 目录在 standalone 中
const dbDir = path.join(standaloneDir, 'db')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log('  ✅ 创建 db 目录')
}

// Step 5: 用 electron-builder 打包
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
