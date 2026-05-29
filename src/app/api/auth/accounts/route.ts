import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken, getSessionTokenFromRequest, hashPassword } from '@/lib/auth';

/**
 * Helper: verify that the request comes from an authenticated admin.
 * Returns the session data or a NextResponse error.
 */
async function requireAdmin(request: NextRequest) {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 403 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: '会话已过期' }, { status: 403 });
  }

  if (session.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  return session;
}

/**
 * GET /api/auth/accounts
 * List all accounts (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const sessionOrError = await requireAdmin(request);
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const accounts = await db.account.findMany({
      include: { users: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        username: a.username,
        role: a.role,
        createdAt: a.createdAt,
        users: a.users.map((u) => ({ id: u.id, name: u.name })),
      })),
    });
  } catch (error) {
    console.error('List accounts error:', error);
    return NextResponse.json(
      { error: '获取账号列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/accounts
 * Create a new account (admin only)
 * Body: { username, password, displayName?, role?: "user" | "admin" }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionOrError = await requireAdmin(request);
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const body = await request.json();
    const { username, password, displayName, role } = body;

    // Validate
    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: '用户名至少3个字符' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: '密码至少6个字符' },
        { status: 400 }
      );
    }

    // Check for duplicate username
    const existing = await db.account.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const accountRole = role === 'admin' ? 'admin' : 'user';
    const name = displayName || username;

    const account = await db.account.create({
      data: {
        username,
        password: hashedPassword,
        role: accountRole,
        users: {
          create: { name },
        },
      },
      include: { users: true },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        createdAt: account.createdAt,
        users: account.users.map((u) => ({ id: u.id, name: u.name })),
      },
    });
  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: '创建账号失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/accounts
 * Update an account (admin only)
 * Body: { id, username?, password?, role? }
 */
export async function PUT(request: NextRequest) {
  try {
    const sessionOrError = await requireAdmin(request);
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const body = await request.json();
    const { id, username, password, role } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少账号 ID' },
        { status: 400 }
      );
    }

    // Check account exists
    const existing = await db.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: '账号不存在' },
        { status: 404 }
      );
    }

    // If username is being changed, check for duplicates
    if (username && username !== existing.username) {
      const duplicate = await db.account.findUnique({ where: { username } });
      if (duplicate) {
        return NextResponse.json(
          { error: '用户名已存在' },
          { status: 409 }
        );
      }
    }

    const data: { username?: string; password?: string; role?: string } = {};
    if (username) data.username = username;
    if (role && (role === 'admin' || role === 'user')) data.role = role;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: '密码至少6个字符' },
          { status: 400 }
        );
      }
      data.password = await hashPassword(password);
    }

    const account = await db.account.update({
      where: { id },
      data,
      include: { users: true },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        createdAt: account.createdAt,
        users: account.users.map((u) => ({ id: u.id, name: u.name })),
      },
    });
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json(
      { error: '更新账号失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/accounts?id=xxx
 * Delete an account (admin only)
 * Cannot delete own account
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionOrError = await requireAdmin(request);
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const session = sessionOrError;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少账号 ID' },
        { status: 400 }
      );
    }

    // Cannot delete own account
    if (id === session.accountId) {
      return NextResponse.json(
        { error: '不能删除自己的账号' },
        { status: 400 }
      );
    }

    // Check account exists
    const existing = await db.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: '账号不存在' },
        { status: 404 }
      );
    }

    // Cascade delete will remove associated users
    await db.account.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: '删除账号失败' },
      { status: 500 }
    );
  }
}
