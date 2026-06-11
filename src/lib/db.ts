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
 * SQLite 自动初始化：
 * - 首次启动时数据库文件不存在或为空，Prisma 只创建空的 .db 文件
 * - 不会自动创建表结构！所以这里用 CREATE TABLE IF NOT EXISTS 自动建表
 * - 使用同步等待，确保表创建完成后才允许数据库查询
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

/**
 * SQLite 建表 SQL
 *
 * 这些 SQL 语句与 prisma/schema.sqlite.prisma 中的模型定义一一对应。
 * 使用 CREATE TABLE IF NOT EXISTS，安全地重复执行。
 *
 * 当 Prisma 连接一个空的 SQLite 文件时，没有任何表，
 * 调用 db.account.count() 等操作会报错 "table does not exist"。
 * 因此需要在首次连接时自动创建表结构。
 */
const SQLITE_CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS Account (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  accountId TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CalendarEvent (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  startDate DATETIME NOT NULL,
  endDate DATETIME,
  allDay BOOLEAN NOT NULL DEFAULT 1,
  eventTypeId TEXT,
  userId TEXT NOT NULL,
  createdById TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (eventTypeId) REFERENCES EventType(id) ON DELETE SET NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (createdById) REFERENCES User(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS EventType (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  shape TEXT NOT NULL,
  color TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT '',
  sortOrder INTEGER NOT NULL DEFAULT 0,
  userId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(userId, name)
);

CREATE TABLE IF NOT EXISTS Holiday (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  year INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  UNIQUE(date)
);

CREATE TABLE IF NOT EXISTS DayColorSetting (
  id TEXT PRIMARY KEY NOT NULL,
  dayType TEXT NOT NULL,
  color TEXT NOT NULL,
  label TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  userId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(userId, dayType)
);

CREATE TABLE IF NOT EXISTS Entity (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  userId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(userId, name)
);

CREATE TABLE IF NOT EXISTS EventEntity (
  id TEXT PRIMARY KEY NOT NULL,
  eventId TEXT NOT NULL,
  entityId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (eventId) REFERENCES CalendarEvent(id) ON DELETE CASCADE,
  FOREIGN KEY (entityId) REFERENCES Entity(id) ON DELETE CASCADE,
  UNIQUE(eventId, entityId)
);

CREATE TABLE IF NOT EXISTS ShareLink (
  id TEXT PRIMARY KEY NOT NULL,
  token TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '分享链接',
  expiresAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CalendarMembership (
  id TEXT PRIMARY KEY NOT NULL,
  calendarUserId TEXT NOT NULL,
  memberUserId TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (calendarUserId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (memberUserId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(calendarUserId, memberUserId)
);
`

/**
 * 确保 SQLite 数据库表结构存在
 *
 * 检查 Account 表是否存在，如果不存在则执行所有建表 SQL。
 * 这是同步等待的——表创建完成后才允许后续数据库操作。
 */
async function ensureSqliteTablesExist(prisma: PrismaClient): Promise<void> {
  try {
    // 检查 Account 表是否存在
    const result = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='Account'
    `

    if (result.length > 0) {
      // 表已存在，无需初始化
      return
    }

    console.log('[DB] SQLite 数据库为空，正在创建表结构...')

    // 执行建表 SQL
    const statements = SQLITE_CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql)
    }

    console.log('[DB] ✅ SQLite 表结构创建完成')
  } catch (error) {
    console.error('[DB] ⚠️ SQLite 表结构初始化失败:', error)
    throw error  // 抛出错误，让调用者知道初始化失败
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbInitialized: boolean | undefined
  dbInitPromise: Promise<void> | undefined
}

const prismaClientOptions = getPrismaClientOptions()
export const db = globalForPrisma.prisma || new PrismaClient(prismaClientOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * SQLite 数据库自动初始化（同步等待版本）
 *
 * 只在 SQLite 模式下执行。
 * 使用 Promise 确保表创建完成后才允许 API 请求操作数据库。
 * 其他模块可以通过 `await dbReady` 等待初始化完成。
 */
const dbUrl = process.env.DATABASE_URL || ''
const isSQLite = dbUrl.startsWith('file:') || !dbUrl

let dbReady: Promise<void>

if (isSQLite) {
  if (!globalForPrisma.dbInitPromise) {
    globalForPrisma.dbInitPromise = ensureSqliteTablesExist(db)
      .then(() => {
        globalForPrisma.dbInitialized = true
        console.log('[DB] SQLite 数据库初始化检查完成')
      })
      .catch((err) => {
        console.error('[DB] SQLite 数据库初始化失败:', err)
        globalForPrisma.dbInitialized = false
        // 关键修复：不要吞掉错误！让 dbReady 也 reject，
        // 这样 API 路由 await dbReady 时能知道初始化失败
        throw err
      })
  }
  dbReady = globalForPrisma.dbInitPromise
} else {
  // PostgreSQL 不需要自动建表（由 Supabase 管理）
  dbReady = Promise.resolve()
}

export { dbReady, isSQLite }
