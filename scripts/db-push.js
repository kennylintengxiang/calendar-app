#!/usr/bin/env node

/**
 * prisma db push wrapper for Supabase PgBouncer
 *
 * Supabase 的 Transaction Pooler (端口 6543) 不支持 DDL 操作（如 CREATE TABLE），
 * 而 Session Pooler (端口 5432) 支持 DDL。
 *
 * 此脚本自动从 DATABASE_URL 推导 DIRECT_URL（将端口 6543 替换为 5432），
 * 然后运行 prisma db push，让 Prisma 通过 directUrl 执行 DDL。
 *
 * 如果不是 PostgreSQL 或 db push 失败，不会阻断构建。
 */

const { execSync } = require('child_process');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL || '';

// Only run for PostgreSQL
if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.log('[db-push] Not PostgreSQL, skipping db push');
  process.exit(0);
}

// Derive direct URL: replace transaction pooler port (6543) with session mode port (5432)
let directUrl = databaseUrl;

if (directUrl.includes(':6543')) {
  directUrl = directUrl.replace(/:6543\//, ':5432/');
  console.log('[db-push] Switched from Transaction pooler (6543) to Session pooler (5432) for DDL support');
} else {
  console.log('[db-push] Using DATABASE_URL directly (no port swap needed)');
}

// Remove pgbouncer param if present (not needed for direct/session connection)
directUrl = directUrl.replace(/[?&]pgbouncer=true/g, '');
// Clean up dangling & or ?
directUrl = directUrl.replace(/[?&]$/, '');

console.log('[db-push] Running prisma db push...');

try {
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DIRECT_URL: directUrl },
    cwd: path.join(__dirname, '..'),
  });
  console.log('[db-push] ✅ Schema pushed successfully');
} catch (error) {
  console.error('[db-push] ⚠️ db push failed (table may already exist, continuing build)');
  // Don't fail the build - table might already exist from a previous push
  process.exit(0);
}
