import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSessionToken, getSessionCookieConfig } from '@/lib/auth';

/**
 * POST /api/auth/setup
 * 首次设置：创建管理员账号
 * Body: { username, password, displayName? }
 * 
 * 仅在没有任何账号时允许调用
 */
export async function POST(request: NextRequest) {
  try {
    // 检查是否已有账号
    const accountCount = await db.account.count();
    if (accountCount > 0) {
      return NextResponse.json(
        { error: '已存在管理员账号，请直接登录' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password, displayName } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: '用户名至少3个字符' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少6个字符' },
        { status: 400 }
      );
    }

    // 哈希密码
    const hashedPassword = await hashPassword(password);

    // 创建管理员账号，同时创建关联的 User
    const name = displayName || username;
    const account = await db.account.create({
      data: {
        username,
        password: hashedPassword,
        role: 'admin',
        users: {
          create: {
            name,
            avatar: '',
          },
        },
      },
      include: { users: true },
    });

    // 把已有的无账号用户（如"默认用户"）关联到新管理员
    const orphanUsers = await db.user.findMany({
      where: { accountId: null },
    });
    if (orphanUsers.length > 0) {
      await db.user.updateMany({
        where: { accountId: null },
        data: { accountId: account.id },
      });
    }

    // 创建 session token
    const token = await createSessionToken({
      accountId: account.id,
      username: account.username,
      role: 'admin',
    });

    const cookieConfig = getSessionCookieConfig();

    const response = NextResponse.json({
      success: true,
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        users: [
          ...account.users.map((u) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar,
          })),
          ...orphanUsers.map((u) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar,
          })),
        ],
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
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: '初始化失败，请稍后重试' },
      { status: 500 }
    );
  }
}
