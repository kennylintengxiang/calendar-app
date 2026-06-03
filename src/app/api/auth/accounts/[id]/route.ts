import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken, getSessionTokenFromRequest, hashPassword } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/auth/accounts/[id]
 * 删除账号（仅管理员，不能删除自己）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 验证 session
    const token = getSessionTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 不能删除自己
    if (id === session.accountId) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
    }

    // 删除账号（级联删除关联的 Users）
    await db.account.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: '删除账号失败' }, { status: 500 });
  }
}

/**
 * PUT /api/auth/accounts/[id]
 * 管理员重置某个账号的密码
 * Body: { newPassword }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 验证 session
    const token = getSessionTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: '新密码至少6个字符' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.account.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: '重置密码失败' }, { status: 500 });
  }
}
