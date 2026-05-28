import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/share/[token]
 * Get calendar data for a share link (read-only access)
 * Returns: { shareLink, user, events, eventTypes, colorSettings, holidays }
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // Find the share link by token
    const shareLink = await db.shareLink.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check if the share link has expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    const userId = shareLink.userId;

    // Fetch all calendar data for this user in parallel
    const [events, eventTypes, colorSettings, holidays] = await Promise.all([
      db.calendarEvent.findMany({
        where: { userId },
        include: {
          eventType: true,
        },
        orderBy: { startDate: 'asc' },
      }),
      db.eventType.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      db.dayColorSetting.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }),
      db.holiday.findMany({
        orderBy: { date: 'asc' },
      }),
    ]);

    return NextResponse.json({
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        name: shareLink.name,
        expiresAt: shareLink.expiresAt,
        createdAt: shareLink.createdAt,
      },
      user: shareLink.user,
      events,
      eventTypes,
      colorSettings,
      holidays,
    });
  } catch (error) {
    console.error('Error fetching shared calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared calendar data' },
      { status: 500 }
    );
  }
}
