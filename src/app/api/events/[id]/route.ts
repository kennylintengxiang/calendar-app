import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Helper: Check if a user can modify an event
 * The owner of the event's calendar or an editor collaborator can modify/delete
 */
async function canModifyEvent(userId: string, event: { userId: string }): Promise<boolean> {
  // Owner of the calendar can always modify
  if (event.userId === userId) {
    return true;
  }

  // Check if user is an editor collaborator
  const membership = await db.calendarMembership.findUnique({
    where: {
      calendarUserId_memberUserId: {
        calendarUserId: event.userId,
        memberUserId: userId,
      },
    },
  });

  return membership?.role === 'editor';
}

/**
 * PUT /api/events/[id]
 * Update an event by id
 * Body: { title?, description?, startDate?, endDate?, allDay?, eventTypeId?, userId }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, startDate, endDate, allDay, eventTypeId, userId } = body;

    // Check if event exists
    const existing = await db.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Authorization check: userId required
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required for authorization' },
        { status: 400 }
      );
    }

    const authorized = await canModifyEvent(userId, existing);
    if (!authorized) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this event' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (allDay !== undefined) updateData.allDay = allDay;
    if (eventTypeId !== undefined) updateData.eventTypeId = eventTypeId || null;

    const event = await db.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        eventType: true,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event by id
 * Body: { userId } for authorization
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if event exists
    const existing = await db.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Authorization check
    let userId: string | null = null;
    try {
      const body = await request.json();
      userId = body.userId;
    } catch {
      // No body provided
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required for authorization' },
        { status: 400 }
      );
    }

    const authorized = await canModifyEvent(userId, existing);
    if (!authorized) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this event' },
        { status: 403 }
      );
    }

    await db.calendarEvent.delete({ where: { id } });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
