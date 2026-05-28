#!/usr/bin/env node

/**
 * 自动检测 DATABASE_URL 并选择对应的 Prisma Schema
 *
 * Vercel 构建流程:
 *   1. npm install → 触发 postinstall (prisma generate)
 *   2. npm run build / vercel-build → 本脚本 + prisma generate + next build
 *
 * 规则:
 * - DATABASE_URL 以 "file:" 开头           → SQLite schema
 * - DATABASE_URL 以 "postgresql://" 开头    → PostgreSQL schema
 * - DB_PROVIDER=postgresql 或 sqlite       → 强制指定
 * - 未配置                                  → 默认 SQLite
 */

const fs = require('fs');
const path = require('path');

const prismaDir = path.join(__dirname, '..', 'prisma');
const schemaPath = path.join(prismaDir, 'schema.prisma');
const sqliteSchemaPath = path.join(prismaDir, 'schema.sqlite.prisma');
const postgresqlSchemaPath = path.join(prismaDir, 'schema.postgresql.prisma');

const databaseUrl = process.env.DATABASE_URL || '';
const forceProvider = process.env.DB_PROVIDER || '';

function detectProvider() {
  if (forceProvider === 'sqlite') return 'sqlite';
  if (forceProvider === 'postgresql' || forceProvider === 'postgres') return 'postgresql';

  if (databaseUrl.startsWith('file:')) return 'sqlite';
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) return 'postgresql';

  // 默认 SQLite
  return 'sqlite';
}

function main() {
  const provider = detectProvider();
  const sourcePath = provider === 'postgresql' ? postgresqlSchemaPath : sqliteSchemaPath;

  // Try to copy from source schema file
  if (fs.existsSync(sourcePath)) {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    fs.writeFileSync(schemaPath, content, 'utf-8');
    const dbType = provider === 'postgresql' ? 'PostgreSQL (Supabase)' : 'SQLite (本地)';
    console.log(`[select-schema] ✅ 已选择数据库: ${dbType}`);
    console.log(`[select-schema]    Schema: schema.${provider}.prisma → schema.prisma`);
    return;
  }

  // Source file doesn't exist - check if schema.prisma already exists (e.g. committed to git)
  if (fs.existsSync(schemaPath)) {
    console.log(`[select-schema] ⚠️ 源文件 schema.${provider}.prisma 不存在，使用现有 schema.prisma`);
    return;
  }

  // Neither source nor schema.prisma exists - this is fatal
  console.error(`[select-schema] ❌ 没有可用的 Prisma schema 文件！`);
  console.error(`[select-schema]    缺少: schema.${provider}.prisma`);
  console.error(`[select-schema]    缺少: schema.prisma`);
  process.exit(1);
}

main();
