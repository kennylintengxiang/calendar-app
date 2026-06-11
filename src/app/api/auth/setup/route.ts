import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';
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
    // 等待数据库初始化完成（确保表结构已创建）
    try {
      await dbReady
    } catch (dbInitErr) {
      // 数据库初始化失败（表结构创建失败）
      const msg = dbInitErr instanceof Error ? dbInitErr.message : String(dbInitErr)
      console.error('[Setup] 数据库初始化失败:', msg)
      return NextResponse.json(
        { error: `数据库初始化失败: ${msg}`, details: dbInitErr instanceof Error ? dbInitErr.stack : '' },
        { status: 500 }
      )
    }

    // 检查是否已有账号
    let accountCount: number
    try {
      accountCount = await db.account.count()
    } catch (countErr) {
      const msg = countErr instanceof Error ? countErr.message : String(countErr)
      console.error('[Setup] 查询Account表失败:', msg)
      return NextResponse.json(
        { error: `数据库查询失败（Account表可能不存在）: ${msg}`, details: countErr instanceof Error ? countErr.stack : '' },
        { status: 500 }
      )
    }

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
    let account
    try {
      account = await db.account.create({
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
    } catch (createErr) {
      const msg = createErr instanceof Error ? createErr.message : String(createErr)
      console.error('[Setup] 创建账号失败:', msg)
      return NextResponse.json(
        { error: `创建管理员账号失败: ${msg}`, details: createErr instanceof Error ? createErr.stack : '' },
        { status: 500 }
      )
    }

    // 把已有的无账号用户（如"默认用户"）关联到新管理员
    try {
      const orphanUsers = await db.user.findMany({
        where: { accountId: null },
      });
      if (orphanUsers.length > 0) {
        await db.user.updateMany({
          where: { accountId: null },
          data: { accountId: account.id },
        });
      }
    } catch (orphanErr) {
      // 关联孤立用户失败不影响主流程
      console.error('[Setup] 关联孤立用户失败:', orphanErr)
    }

    // 重新获取包含孤立用户的完整列表
    const allUsers = await db.user.findMany({
      where: { accountId: account.id },
    });

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
        users: allUsers.map((u) => ({
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
    console.error('[Setup] 未预期的错误:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: `初始化失败: ${message}`,
        details: stack || String(error),
      },
      { status: 500 }
    );
  }
}
