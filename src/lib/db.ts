import { PrismaClient } from '@prisma/client'

/**
 * 数据库自动切换逻辑：
 * 
 * DATABASE_URL 以 "file:" 开头       → SQLite（本地/沙盒环境）
 * DATABASE_URL 以 "postgresql://" 开头 → PostgreSQL（Supabase/Vercel）
 * 未配置                            → 默认 SQLite
 * 
 * 切换数据库时需要：
 * 1. 修改 .env 中的 DATABASE_URL
 * 2. 运行 node scripts/select-schema.js 选择对应的 schema
 * 3. 运行 bun run db:generate 重新生成 Prisma Client
 * 4. 运行 bun run db:push 推送表结构
 */

function detectDatabaseType(): 'sqlite' | 'postgresql' {
  const url = process.env.DATABASE_URL || '';
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    return 'postgresql';
  }
  return 'sqlite'; // 默认 SQLite
}

const dbType = detectDatabaseType();

if (typeof window === 'undefined') {
  const label = dbType === 'postgresql' ? 'PostgreSQL (Supabase)' : 'SQLite (本地)';
  console.log(`[DB] 当前数据库: ${label}`);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
