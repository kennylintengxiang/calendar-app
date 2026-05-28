import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/collaboration?userId=xxx
 * List memberships for a user (both owned calendars and member-of)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch calendars the user owns (others are members of their calendar)
    const ownedCalendars = await db.calendarMembership.findMany({
      where: { calendarUserId: userId },
      include: {
        memberUser: {
          select: { id: true, name: true, avatar: true },
        },
        calendarUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch calendars the user is a member of
    const memberOf = await db.calendarMembership.findMany({
      where: { memberUserId: userId },
      include: {
        calendarUser: {
          select: { id: true, name: true, avatar: true },
        },
        memberUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Combine and deduplicate
    const allMembershipIds = new Set<string>();
    const memberships: typeof ownedCalendars = [];

    for (const m of [...ownedCalendars, ...memberOf]) {
      if (!allMembershipIds.has(m.id)) {
        allMembershipIds.add(m.id);
        memberships.push(m);
      }
    }

    return NextResponse.json({ memberships });
  } catch (error) {
    console.error('Error fetching collaborations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collaboration
 * Add a member to a calendar
 * Body: { calendarUserId, memberUserId, role: "viewer"|"editor" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { calendarUserId, memberUserId, role } = body;

    if (!calendarUserId || !memberUserId) {
      return NextResponse.json(
        { error: 'calendarUserId and memberUserId are required' },
        { status: 400 }
      );
    }

    if (calendarUserId === memberUserId) {
      return NextResponse.json(
        { error: 'Cannot add yourself as a collaborator' },
        { status: 400 }
      );
    }

    // Verify both users exist
    const [calendarUser, memberUser] = await Promise.all([
      db.user.findUnique({ where: { id: calendarUserId } }),
      db.user.findUnique({ where: { id: memberUserId } }),
    ]);

    if (!calendarUser) {
      return NextResponse.json(
        { error: 'Calendar user not found' },
        { status: 404 }
      );
    }

    if (!memberUser) {
      return NextResponse.json(
        { error: 'Member user not found' },
        { status: 404 }
      );
    }

    // Check if membership already exists
    const existing = await db.calendarMembership.findUnique({
      where: {
        calendarUserId_memberUserId: {
          calendarUserId,
          memberUserId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This membership already exists' },
        { status: 409 }
      );
    }

    const membership = await db.calendarMembership.create({
      data: {
        calendarUserId,
        memberUserId,
        role: role || 'viewer',
      },
      include: {
        calendarUser: {
          select: { id: true, name: true, avatar: true },
        },
        memberUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    console.error('Error creating collaboration:', error);
    return NextResponse.json(
      { error: 'Failed to create collaboration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/collaboration
 * Update member role
 * Body: { id, role }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, role } = body;

    if (!id || !role) {
      return NextResponse.json(
        { error: 'id and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'viewer' && role !== 'editor') {
      return NextResponse.json(
        { error: 'Role must be either "viewer" or "editor"' },
        { status: 400 }
      );
    }

    // Check if membership exists
    const existing = await db.calendarMembership.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    const membership = await db.calendarMembership.update({
      where: { id },
      data: { role },
      include: {
        calendarUser: {
          select: { id: true, name: true, avatar: true },
        },
        memberUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ membership });
  } catch (error) {
    console.error('Error updating collaboration:', error);
    return NextResponse.json(
      { error: 'Failed to update collaboration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collaboration?id=xxx
 * Remove a member
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if membership exists
    const existing = await db.calendarMembership.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    await db.calendarMembership.delete({ where: { id } });

    return NextResponse.json({ message: 'Membership removed successfully' });
  } catch (error) {
    console.error('Error deleting collaboration:', error);
    return NextResponse.json(
      { error: 'Failed to delete collaboration' },
      { status: 500 }
    );
  }
}
