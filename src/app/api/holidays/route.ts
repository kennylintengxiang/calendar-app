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
      // Try to use z-ai-web-dev-sdk (only available in sandbox environment)
      let zai: any = null;
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        zai = await ZAI.create();
      } catch {
        console.warn('z-ai-web-dev-sdk not available, using hardcoded holiday data');
      }

      if (zai) {
        // Search for Chinese holiday schedule
        const searchQuery = `中国${year}年放假安排`;
        const searchResults = await zai.functions.invoke('web_search', {
          query: searchQuery,
          num: 10
        });

        // Use LLM to parse the search results into structured holiday data
        const searchContext = searchResults
          .map((r: { name?: string; snippet?: string }) =>
            `${r.name || ''}: ${r.snippet || ''}`
          )
          .join('\n');

        const prompt = `Based on the following search results about Chinese holiday schedule for ${year}, extract all holiday dates and makeup workday dates into a structured JSON array.

Rules:
- Each entry should have: date (YYYY-MM-DD format), name (Chinese holiday name), type ("holiday" for days off, "workday" for makeup/调休 days), year (${year})
- Include all official holidays: 元旦, 春节, 清明节, 劳动节, 端午节, 中秋节, 国庆节
- Include all 调休 (makeup workdays) as type "workday"
- Be accurate with dates, cross-reference multiple sources if available

Search results:
${searchContext}

Return ONLY a valid JSON array, no other text. Example format:
[{"date":"${year}-01-01","name":"元旦","type":"holiday","year":${year}}]`;

        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content: 'You are a data extraction assistant. Return only valid JSON arrays as instructed, with no additional text or markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          thinking: { type: 'disabled' }
        });
        const llmResponse = completion.choices[0]?.message?.content || '';

        // Parse the LLM response - extract JSON from the response
        const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          holidayData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in LLM response');
        }
      } else {
        // No z-ai-web-dev-sdk available, use hardcoded data
        holidayData = getHardcodedHolidays(year);
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
