import { PrismaClient } from '@prisma/client'

/**
 * 数据库自动切换逻辑：
 * 
 * DATABASE_URL 以 "file:" 开头       → SQLite（本地/沙盒环境）
 * DATABASE_URL 以 "postgresql://" 开头 → PostgreSQL（Supabase/Vercel）
 * 未配置                            → 默认 SQLite
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
