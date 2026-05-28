#!/usr/bin/env node

/**
 * 自动检测 DATABASE_URL 并选择对应的 Prisma Schema
 * 
 * 规则：
 * - DATABASE_URL 以 "file:" 开头 → 使用 SQLite schema
 * - DATABASE_URL 以 "postgresql://" 或 "postgres://" 开头 → 使用 PostgreSQL schema
 * - 未配置 → 默认使用 SQLite
 * 
 * 如果源 schema 文件不存在，则保留现有 schema.prisma 不做修改
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
  
  if (!fs.existsSync(sourcePath)) {
    // Source schema file doesn't exist - check if schema.prisma already exists
    if (fs.existsSync(schemaPath)) {
      console.log(`⚠️ 源 schema 文件不存在 (${path.basename(sourcePath)})，保留现有 schema.prisma`);
      return;
    }
    // No schema.prisma either - this is a fatal error
    console.error(`❌ 没有可用的 Prisma schema 文件！`);
    process.exit(1);
  }

  // Read source schema
  const content = fs.readFileSync(sourcePath, 'utf-8');
  
  // Write to schema.prisma
  fs.writeFileSync(schemaPath, content, 'utf-8');
  
  const dbType = provider === 'postgresql' ? 'PostgreSQL (Supabase)' : 'SQLite (本地)';
  console.log(`✅ 已选择数据库: ${dbType}`);
  console.log(`   DATABASE_URL: ${databaseUrl ? databaseUrl.substring(0, 30) + '...' : '(未配置)'}`);
  console.log(`   Schema: schema.${provider}.prisma → schema.prisma`);
}

main();
