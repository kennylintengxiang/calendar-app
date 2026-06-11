import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

/**
 * 数据库自动切换逻辑：
 *
 * DATABASE_URL 以 "file:" 开头       → SQLite（本地/沙盒/Electron 环境）
 * DATABASE_URL 以 "postgresql://" 开头 → PostgreSQL（Supabase/Vercel）
 * 未配置                            → 默认 SQLite
 *
 * Electron 环境：
 * - DATABASE_URL 由 electron/main.js 动态设置为 userData 目录下的 calendar.db
 * - 首次启动时数据库文件不存在，Prisma 会自动创建空的 .db 文件
 * - 但 Prisma 不会自动创建表结构！需要 electron/main.js 中的 initDatabase()
 *   在服务器启动前运行 prisma db push 来创建表
 *
 * Supabase 兼容性：
 * - Supabase Transaction pooler (pgbouncer) 不支持 prepared statements
 * - 需要在 URL 中添加 ?pgbouncer=true 来禁用 prepared statements
 */

function getPrismaClientOptions(): ConstructorParameters<typeof PrismaClient>[0] {
  let dbUrl = process.env.DATABASE_URL || ''

  // 如果没有配置 DATABASE_URL，使用默认的本地 SQLite 路径
  if (!dbUrl) {
    const dbPath = path.join(process.cwd(), 'db', 'custom.db')
    dbUrl = `file:${dbPath}`
  }

  // For PostgreSQL with Supabase pgbouncer, add pgbouncer=true to avoid
  // "prepared statement already exists" errors (PostgreSQL error 42P05)
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    // Check if pgbouncer parameter is already present
    if (!dbUrl.includes('pgbouncer=true')) {
      const separator = dbUrl.includes('?') ? '&' : '?'
      return {
        datasourceUrl: `${dbUrl}${separator}pgbouncer=true`,
      }
    }
  }

  // SQLite: 确保数据库文件所在目录存在
  if (dbUrl.startsWith('file:')) {
    const dbFilePath = dbUrl.replace(/^file:/, '')
    const dbDir = path.dirname(dbFilePath)
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }
    } catch {
      // 目录可能已存在或无法创建，忽略错误
    }
  }

  return { datasourceUrl: dbUrl }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma || new PrismaClient(getPrismaClientOptions())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
