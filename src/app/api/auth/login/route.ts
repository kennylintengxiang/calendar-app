import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSessionToken, getSessionCookieConfig } from '@/lib/auth';

/**
 * POST /api/auth/login
 * 登录：验证用户名密码，设置 session cookie
 * Body: { username, password }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 查找账号
    const account = await db.account.findUnique({
      where: { username },
      include: { users: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const valid = await verifyPassword(password, account.password);
    if (!valid) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 创建 session token
    const token = await createSessionToken({
      accountId: account.id,
      username: account.username,
      role: account.role as 'admin' | 'user',
    });

    const cookieConfig = getSessionCookieConfig();

    const response = NextResponse.json({
      success: true,
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

    response.cookies.set(cookieConfig.name, token, {
      maxAge: cookieConfig.maxAge,
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
