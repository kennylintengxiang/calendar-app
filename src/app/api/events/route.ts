import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/events
 * List events with optional filtering by date range, year, month, and userId
 * Query params: start (ISO date), end (ISO date), year, month, userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};

    // Filter by userId if provided; otherwise return all (backward compat for share links)
    if (userId) {
      where.userId = userId;
    }

    if (start && end) {
      where.startDate = {
        gte: new Date(start),
        lte: new Date(end),
      };
    } else if (start) {
      where.startDate = {
        gte: new Date(start),
      };
    } else if (end) {
      where.startDate = {
        lte: new Date(end),
      };
    }

    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) {
        const yearStart = new Date(yearNum, 0, 1);
        const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        where.startDate = {
          gte: yearStart,
          lte: yearEnd,
        };
      }
    }

    if (month) {
      const monthNum = parseInt(month, 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        // If year is also provided, filter by year+month; otherwise use current year
        const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        where.startDate = {
          gte: monthStart,
          lte: monthEnd,
        };
      }
    }

    const events = await db.calendarEvent.findMany({
      where,
      include: {
        eventType: true,
        eventEntities: {
          include: {
            entity: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event
 * Body: { title, description?, startDate, endDate?, allDay?, eventTypeId?, userId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, startDate, endDate, allDay, eventTypeId, userId } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
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

    const event = await db.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay !== undefined ? allDay : true,
        eventTypeId: eventTypeId || null,
        userId,
        createdById: userId,
      },
      include: {
        eventType: true,
        eventEntities: {
          include: {
            entity: true,
          },
        },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
