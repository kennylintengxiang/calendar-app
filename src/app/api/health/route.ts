import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Quick health check - just return OK
    // The database check is optional to avoid blocking the health endpoint
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'calendar-app'
    })
  } catch {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'calendar-app',
      db: 'unavailable'
    })
  }
}
