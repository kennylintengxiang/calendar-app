import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/share/[token]
 * Get calendar data for a share link (read-only access)
 * Now returns ALL users under the same account, with per-user calendar data
 * Query params: ?userId=xxx  — if provided, only returns that user's calendar data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // Find the share link by token
    const shareLink = await db.shareLink.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            accountId: true,
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

    // Get the account of the share link owner to find all users under same account
    const accountId = shareLink.user.accountId;

    // Fetch all users under the same account
    let allUsers: Array<{ id: string; name: string; avatar: string }> = [];
    if (accountId) {
      const accountUsers = await db.user.findMany({
        where: { accountId },
        select: { id: true, name: true, avatar: true },
        orderBy: { createdAt: 'asc' },
      });
      allUsers = accountUsers;
    } else {
      // Fallback: if no account, just return the share link owner
      allUsers = [{
        id: shareLink.user.id,
        name: shareLink.user.name,
        avatar: shareLink.user.avatar,
      }];
    }

    // Check if a specific userId is requested
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // Determine which user's data to return
    const targetUserId = requestedUserId || shareLink.userId;

    // Validate the targetUserId belongs to the same account
    const validUser = allUsers.find(u => u.id === targetUserId);
    if (!validUser) {
      return NextResponse.json(
        { error: 'Invalid userId for this share link' },
        { status: 400 }
      );
    }

    // Fetch all calendar data for the target user in parallel
    const [events, eventTypes, colorSettings, holidays, entities] = await Promise.all([
      db.calendarEvent.findMany({
        where: { userId: targetUserId },
        include: {
          eventType: true,
          eventEntities: {
            include: {
              entity: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
      }),
      db.eventType.findMany({
        where: { userId: targetUserId },
        orderBy: { sortOrder: 'asc' },
      }),
      db.dayColorSetting.findMany({
        where: { userId: targetUserId },
        orderBy: { sortOrder: 'asc' },
      }),
      db.holiday.findMany({
        orderBy: { date: 'asc' },
      }),
      db.entity.findMany({
        where: { userId: targetUserId },
        orderBy: { sortOrder: 'asc' },
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
      users: allUsers,
      currentUserId: targetUserId,
      owner: validUser,
      events,
      eventTypes,
      colorSettings,
      holidays,
      entities,
    });
  } catch (error) {
    console.error('Error fetching shared calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared calendar data' },
      { status: 500 }
    );
  }
}
