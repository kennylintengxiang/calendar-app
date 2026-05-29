import { PrismaClient } from '@prisma/client'

/**
 * 数据库自动切换逻辑：
 * 
 * DATABASE_URL 以 "file:" 开头       → SQLite（本地/沙盒环境）
 * DATABASE_URL 以 "postgresql://" 开头 → PostgreSQL（Supabase/Vercel）
 * 未配置                            → 默认 SQLite
 * 
 * Supabase 兼容性：
 * - Supabase Transaction pooler (pgbouncer) 不支持 prepared statements
 * - 需要在 URL 中添加 ?pgbouncer=true 来禁用 prepared statements
 */

function getPrismaClientOptions(): ConstructorParameters<typeof PrismaClient>[0] {
  const dbUrl = process.env.DATABASE_URL || ''
  
  // For PostgreSQL with Supabase pgbouncer, add pgbouncer=true to avoid
  // "prepared statement already exists" errors (PostgreSQL error 42P05)
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    // Check if pgbouncer parameter is already present
    if (!dbUrl.includes('pgbouncer=true') && !dbUrl.includes('pgbouncer=true')) {
      const separator = dbUrl.includes('?') ? '&' : '?'
      return {
        datasourceUrl: `${dbUrl}${separator}pgbouncer=true`,
      }
    }
  }
  
  return undefined
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma || new PrismaClient(getPrismaClientOptions())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
