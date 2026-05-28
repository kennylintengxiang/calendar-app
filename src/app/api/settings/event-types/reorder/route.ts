import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PUT /api/settings/event-types/reorder
 * Reorder event types by updating their sortOrder
 * Body: { items: [{ id: string, sortOrder: number }], userId: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, userId } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Update each event type's sortOrder
    const updatePromises = items.map((item: { id: string; sortOrder: number }) =>
      db.eventType.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering event types:', error);
    return NextResponse.json(
      { error: 'Failed to reorder event types' },
      { status: 500 }
    );
  }
}
