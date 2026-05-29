import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/debug/db
 * Debug endpoint to check database connectivity and Prisma Client models
 * Remove after debugging
 */
export async function GET() {
  try {
    const results: Record<string, unknown> = {};

    // Check if Account model exists in Prisma Client
    results.hasAccountModel = typeof db.account !== 'undefined';

    // Try to count accounts
    try {
      results.accountCount = await db.account.count();
    } catch (e: unknown) {
      results.accountCountError = e instanceof Error ? e.message : String(e);
    }

    // Try to count users
    try {
      results.userCount = await db.user.count();
    } catch (e: unknown) {
      results.userCountError = e instanceof Error ? e.message : String(e);
    }

    // Check database URL pattern
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    results.databaseUrlPattern = dbUrl.substring(0, 20) + '...';
    results.nodeEnv = process.env.NODE_ENV;
    results.isVercel = !!process.env.VERCEL;

    // List available Prisma models
    results.prismaModels = Object.keys(db).filter(k => !k.startsWith('_') && !k.startsWith('$'));

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
