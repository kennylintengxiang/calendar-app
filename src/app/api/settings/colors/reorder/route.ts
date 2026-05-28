import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PUT /api/settings/colors/reorder
 * Batch update sortOrder for day color settings
 * Body: { items: [{ id, sortOrder }], userId }
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

    // Update each item's sortOrder in a transaction
    await db.$transaction(
      items.map((item: { id: string; sortOrder: number }) =>
        db.dayColorSetting.updateMany({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering color settings:', error);
    return NextResponse.json(
      { error: 'Failed to reorder color settings' },
      { status: 500 }
    );
  }
}
