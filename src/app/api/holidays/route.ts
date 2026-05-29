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
 * Fetch latest Chinese holidays and store in database.
 * Body: { year: number }
 *
 * In sandbox: uses z-ai-web-dev-sdk for web search and LLM parsing.
 * On Vercel: falls back to hardcoded holiday data.
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

    let holidayData: Array<{ date: string; name: string; type: string; year: number }>;

    try {
      // Only attempt z-ai-web-dev-sdk in sandbox (not on Vercel)
      // VERCEL env var is automatically set on Vercel deployments and inlined at build time,
      // so the SDK import branch will be tree-shaken away on Vercel
      if (process.env.VERCEL) {
        // On Vercel, always use hardcoded data (SDK not available)
        holidayData = getHardcodedHolidays(year);
      } else {
        // In sandbox, try to use z-ai-web-dev-sdk for live holiday data
        try {
          const { fetchHolidaysWithSDK } = await import('@/lib/holidays-sdk');
          holidayData = await fetchHolidaysWithSDK(year);
        } catch {
          console.warn('z-ai-web-dev-sdk not available, using hardcoded holiday data');
          holidayData = getHardcodedHolidays(year);
        }
      }
    } catch (sdkError) {
      console.warn('Web search/LLM failed, falling back to hardcoded data:', sdkError);
      holidayData = getHardcodedHolidays(year);
    }

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
