import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/settings/colors
 * Get day color settings, optionally filtered by userId
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

    const settings = await db.dayColorSetting.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching color settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch color settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/colors
 * Create a new day color setting
 * Body: { dayType, color, label, userId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dayType, color, label, userId } = body;

    if (!dayType || !color || !label) {
      return NextResponse.json(
        { error: 'dayType, color, and label are required' },
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

    // Check if dayType already exists for this user
    const existing = await db.dayColorSetting.findUnique({
      where: {
        userId_dayType: {
          userId,
          dayType,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Color setting for dayType "${dayType}" already exists for this user` },
        { status: 409 }
      );
    }

    // Get the max sortOrder for this user
    const maxSort = await db.dayColorSetting.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (maxSort?.sortOrder ?? -1) + 1;

    const setting = await db.dayColorSetting.create({
      data: { dayType, color, label, sortOrder, userId },
    });

    return NextResponse.json({ setting }, { status: 201 });
  } catch (error) {
    console.error('Error creating color setting:', error);
    return NextResponse.json(
      { error: 'Failed to create color setting' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/colors
 * Update or create a day color setting for a user
 * Body: { dayType, color?, label?, userId }
 * Finds existing by userId + dayType, updates it; or creates if not found
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { dayType, color, label, userId } = body;

    if (!dayType) {
      return NextResponse.json(
        { error: 'dayType is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if setting exists for this user
    const existing = await db.dayColorSetting.findUnique({
      where: {
        userId_dayType: {
          userId,
          dayType,
        },
      },
    });

    if (existing) {
      // Update existing
      const updateData: Record<string, unknown> = {};
      if (color !== undefined) updateData.color = color;
      if (label !== undefined) updateData.label = label;

      const setting = await db.dayColorSetting.update({
        where: {
          userId_dayType: {
            userId,
            dayType,
          },
        },
        data: updateData,
      });

      return NextResponse.json({ setting });
    } else {
      // Create new if not found
      if (!color || !label) {
        return NextResponse.json(
          { error: 'color and label are required when creating a new setting' },
          { status: 400 }
        );
      }

      // Get the max sortOrder for this user
      const maxSort = await db.dayColorSetting.findFirst({
        where: { userId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      const sortOrder = (maxSort?.sortOrder ?? -1) + 1;

      const setting = await db.dayColorSetting.create({
        data: { dayType, color, label, sortOrder, userId },
      });

      return NextResponse.json({ setting }, { status: 201 });
    }
  } catch (error) {
    console.error('Error updating color setting:', error);
    return NextResponse.json(
      { error: 'Failed to update color setting' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/colors
 * Delete a day color setting
 * Query params: id, userId
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Find the setting first to verify ownership
    const setting = await db.dayColorSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      return NextResponse.json(
        { error: 'Color setting not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (userId && setting.userId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this setting' },
        { status: 403 }
      );
    }

    await db.dayColorSetting.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting color setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete color setting' },
      { status: 500 }
    );
  }
}
