import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getHardcodedHolidays } from '@/lib/holidays-data';

/**
 * GET /api/holidays
 * Get holidays for a given year
 * Query param: year (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get('year');

    if (!yearStr) {
      return NextResponse.json(
        { error: 'Year query parameter is required' },
        { status: 400 }
      );
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    const holidays = await db.holiday.findMany({
      where: { year },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/holidays
 * Store hardcoded Chinese holidays in database for a given year.
 * Body: { year: number }
 *
 * Note: Previously used z-ai-web-dev-sdk for live fetching, but that SDK
 * is only available in the sandbox environment and causes build failures on Vercel.
 * Now always uses hardcoded holiday data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year } = body;

    if (!year || typeof year !== 'number') {
      return NextResponse.json(
        { error: 'Year is required and must be a number' },
        { status: 400 }
      );
    }

    const holidayData = getHardcodedHolidays(year);

    if (!holidayData || holidayData.length === 0) {
      return NextResponse.json(
        { error: `No holiday data available for year ${year}` },
        { status: 404 }
      );
    }

    // Store holidays in database using upsert (based on unique date constraint)
    const upsertPromises = holidayData.map((holiday) =>
      db.holiday.upsert({
        where: { date: holiday.date },
        update: {
          name: holiday.name,
          type: holiday.type,
          year: holiday.year,
        },
        create: {
          date: holiday.date,
          name: holiday.name,
          type: holiday.type,
          year: holiday.year,
        },
      })
    );

    const holidays = await Promise.all(upsertPromises);

    return NextResponse.json({ holidays, count: holidays.length });
  } catch (error) {
    console.error('Error fetching/storing holidays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch and store holidays' },
      { status: 500 }
    );
  }
}
