import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken, getSessionTokenFromRequest } from '@/lib/auth';

/**
 * GET /api/auth/session
 * 获取当前 session 信息
 * 返回: { authenticated, account?, needsSetup }
 */
export async function GET(request: NextRequest) {
  try {
    // 检查是否有任何账号存在
    const accountCount = await db.account.count();
    const needsSetup = accountCount === 0;

    // 验证 session
    const token = getSessionTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        authenticated: false,
        needsSetup,
        account: null,
      });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        needsSetup,
        account: null,
      });
    }

    // 获取账号详细信息
    const account = await db.account.findUnique({
      where: { id: session.accountId },
      include: { users: true },
    });

    if (!account) {
      return NextResponse.json({
        authenticated: false,
        needsSetup,
        account: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      needsSetup: false,
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        users: account.users.map((u) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
        })),
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    );
  }
}
