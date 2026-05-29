import { NextResponse } from 'next/server';
import { getSessionCookieConfig } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * 登出：清除 session cookie
 */
export async function POST() {
  try {
    const cookieConfig = getSessionCookieConfig();

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieConfig.name, '', {
      maxAge: 0,
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path,
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    );
  }
}
