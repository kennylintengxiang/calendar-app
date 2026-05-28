import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/init
 * Initialize default user, color settings, and event types
 * Body: { userId? }
 * If userId is provided, use that user; otherwise create a default user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    let user: {
      id: string;
      name: string;
      avatar: string;
      createdAt: Date;
      updatedAt: Date;
    } | null = null;

    // If userId provided, find that user
    if (userId) {
      user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    } else {
      // Try to find an existing default user, or create one
      user = await db.user.findFirst({
        where: { name: '默认用户' },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            name: '默认用户',
            avatar: '',
          },
        });
      }
    }

    const results = {
      user,
      colorSettings: { created: 0, skipped: 0 },
      eventTypes: { created: 0, skipped: 0 },
    };

    // Default color settings
    const defaultColorSettings = [
      { dayType: 'weekend', color: '#dcfce7', label: '周末', sortOrder: 0 },
      { dayType: 'holiday', color: '#16a34a', label: '法定假日', sortOrder: 1 },
      { dayType: 'workday', color: '#fff7ed', label: '调休上班', sortOrder: 2 },
      { dayType: 'scheduled', color: '#fef9c3', label: '有安排', sortOrder: 3 },
      { dayType: 'today', color: '#fef2f2', label: '今天', sortOrder: 4 },
    ];

    // Default event types
    const defaultEventTypes = [
      { name: '会议', shape: 'circle', color: '#ef4444', symbol: '会', sortOrder: 0 },
      { name: '提醒', shape: 'triangle', color: '#f59e0b', symbol: '提', sortOrder: 1 },
      { name: '任务', shape: 'square', color: '#3b82f6', symbol: '任', sortOrder: 2 },
      { name: '纪念日', shape: 'heart', color: '#ec4899', symbol: '纪', sortOrder: 3 },
      { name: '出行', shape: 'diamond', color: '#8b5cf6', symbol: '出', sortOrder: 4 },
    ];

    // Create default color settings for this user
    for (const setting of defaultColorSettings) {
      const existing = await db.dayColorSetting.findUnique({
        where: {
          userId_dayType: {
            userId: user.id,
            dayType: setting.dayType,
          },
        },
      });

      if (!existing) {
        await db.dayColorSetting.create({
          data: {
            ...setting,
            userId: user.id,
          },
        });
        results.colorSettings.created++;
      } else {
        results.colorSettings.skipped++;
      }
    }

    // Create default event types for this user
    for (const eventType of defaultEventTypes) {
      const existing = await db.eventType.findUnique({
        where: {
          userId_name: {
            userId: user.id,
            name: eventType.name,
          },
        },
      });

      if (!existing) {
        await db.eventType.create({
          data: {
            ...eventType,
            userId: user.id,
          },
        });
        results.eventTypes.created++;
      } else {
        results.eventTypes.skipped++;
      }
    }

    return NextResponse.json({
      user: results.user,
      colorSettings: results.colorSettings,
      eventTypes: results.eventTypes,
    });
  } catch (error) {
    console.error('Error initializing default data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize default data' },
      { status: 500 }
    );
  }
}
