import { NextResponse } from 'next/server';
import { db, dbReady, isSQLite } from '@/lib/db';

/**
 * GET /api/health/db
 * 数据库诊断接口 — 检查数据库连接和表状态
 * 用于排查 Electron 环境下的数据库初始化问题
 */
export async function GET() {
  const info: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    isSQLite,
    databaseUrl: isSQLite ? 'file:...' : 'postgresql://...',
    env: {
      NODE_ENV: process.env.NODE_ENV || '(not set)',
      ELECTRON: process.env.ELECTRON || '(not set)',
      DATABASE_URL_prefix: (process.env.DATABASE_URL || '').substring(0, 10) + '...',
      PRISMA_QUERY_ENGINE_BINARY: process.env.PRISMA_QUERY_ENGINE_BINARY || '(not set)',
    },
  }

  try {
    // 等待数据库初始化完成
    await dbReady
    info.dbInitComplete = true
  } catch (error) {
    info.dbInitComplete = false
    info.dbInitError = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ status: 'error', info }, { status: 500 })
  }

  // 尝试查询 sqlite_master 检查表
  if (isSQLite) {
    try {
      const tables = await db.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
      `
      info.tables = tables.map(t => t.name)
      info.tableCount = tables.length
    } catch (e) {
      info.tablesError = e instanceof Error ? e.message : String(e)
    }
  }

  // 尝试查询 Account 表
  try {
    const accountCount = await db.account.count()
    info.accountCount = accountCount
  } catch (e) {
    info.accountCountError = e instanceof Error ? e.message : String(e)
  }

  // 尝试查询 User 表
  try {
    const userCount = await db.user.count()
    info.userCount = userCount
  } catch (e) {
    info.userCountError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({ status: 'ok', info })
}
