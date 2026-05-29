import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

/**
 * 认证工具库
 * - JWT session token (jose 库，Edge Runtime 兼容)
 * - bcrypt 密码哈希/验证
 */

// JWT 密钥：生产环境必须设置 JWT_SECRET 环境变量
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'calendar-app-dev-secret-change-in-production-2024'
)

const SESSION_COOKIE_NAME = 'calendar-session'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 天（秒）

export interface SessionData {
  accountId: string
  username: string
  role: 'admin' | 'user'
}

/** 创建 JWT session token */
export async function createSessionToken(data: SessionData): Promise<string> {
  return new SignJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

/** 验证 JWT session token，返回 session 数据或 null */
export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      accountId: payload.accountId as string,
      username: payload.username as string,
      role: payload.role as 'admin' | 'user',
    }
  } catch {
    return null
  }
}

/** 密码哈希 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/** 验证密码 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** 获取 session cookie 配置 */
export function getSessionCookieConfig() {
  return {
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
}

/** 从请求中获取 session token */
export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, c) => {
    const [key, ...val] = c.trim().split('=')
    acc[key] = val.join('=')
    return acc
  }, {})

  return cookies[SESSION_COOKIE_NAME] || null
}
