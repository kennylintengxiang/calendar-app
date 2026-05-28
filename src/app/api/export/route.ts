import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateICS } from '@/lib/ics';

/**
 * GET /api/export
 * Export events as ICS file for Outlook import
 * Query params: start, end for date range
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};

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

    const events = await db.calendarEvent.findMany({
      where,
      include: {
        eventType: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'No events found for the specified date range' },
        { status: 404 }
      );
    }

    // Map to ICS event format
    const icsEvents = events.map((event) => ({
      title: event.title,
      description: event.description || undefined,
      startDate: event.startDate,
      endDate: event.endDate || undefined,
      allDay: event.allDay,
      uid: `${event.id}@chinese-calendar`,
    }));

    const icsContent = generateICS(icsEvents);

    // Determine filename based on date range
    let filename = 'calendar-events';
    if (start && end) {
      filename = `calendar-${start.slice(0, 10)}-to-${end.slice(0, 10)}`;
    } else if (start) {
      filename = `calendar-from-${start.slice(0, 10)}`;
    } else if (end) {
      filename = `calendar-until-${end.slice(0, 10)}`;
    }

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting events:', error);
    return NextResponse.json(
      { error: 'Failed to export events' },
      { status: 500 }
    );
  }
}
