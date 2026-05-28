import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/settings/event-types
 * Get event types, optionally filtered by userId
 * Query params: userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    }

    const eventTypes = await db.eventType.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        _count: {
          select: { events: true },
        },
      },
    });

    return NextResponse.json({ eventTypes });
  } catch (error) {
    console.error('Error fetching event types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event types' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/event-types
 * Create a new event type
 * Body: { name, shape, color, symbol?, userId }
 */
export async function POST(request: NextRequest) {
  let eventTypeName = '';
  try {
    const body = await request.json();
    const { name, shape, color, symbol, userId } = body;
    eventTypeName = name || '';

    if (!name || !shape || !color) {
      return NextResponse.json(
        { error: 'name, shape, and color are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const eventType = await db.eventType.create({
      data: { name, shape, color, symbol: symbol || '', userId },
    });

    return NextResponse.json({ eventType }, { status: 201 });
  } catch (error) {
    console.error('Error creating event type:', error);
    // Check for Prisma unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta as { target?: string[] })?.target;
      if (target?.includes('name')) {
        return NextResponse.json(
          { error: `事件类型"${eventTypeName}"已存在，请使用其他名称` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: '该事件类型已存在' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: '创建事件类型失败，请重试' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/event-types
 * Update an event type by id
 * Body: { id, name?, shape?, color?, symbol? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, shape, color, symbol } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Check if event type exists
    const existing = await db.eventType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (shape !== undefined) updateData.shape = shape;
    if (color !== undefined) updateData.color = color;
    if (symbol !== undefined) updateData.symbol = symbol;

    const eventType = await db.eventType.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ eventType });
  } catch (error) {
    console.error('Error updating event type:', error);
    return NextResponse.json(
      { error: 'Failed to update event type' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/event-types
 * Delete an event type by id
 * Query params: id (required), userId (for authorization)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if event type exists
    const existing = await db.eventType.findUnique({
      where: { id },
      include: { _count: { select: { events: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    // Authorization check: only the owner can delete
    if (userId && existing.userId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this event type' },
        { status: 403 }
      );
    }

    // Delete the event type (associated events will have eventTypeId set to null via onDelete: SetNull)
    await db.eventType.delete({ where: { id } });

    return NextResponse.json({ message: 'Event type deleted successfully' });
  } catch (error) {
    console.error('Error deleting event type:', error);
    return NextResponse.json(
      { error: 'Failed to delete event type' },
      { status: 500 }
    );
  }
}
