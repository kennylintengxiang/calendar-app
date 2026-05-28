import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

/**
 * POST /api/import
 * Import calendar events from ICS, JSON, CSV, or Excel file
 * Body: { userId, fileType: 'ics'|'json'|'csv'|'excel', content: string }
 *
 * JSON format:
 * {
 *   "events": [
 *     {
 *       "title": "Event Title",
 *       "description": "Optional description",
 *       "startDate": "2025-01-15",           // YYYY-MM-DD or ISO 8601
 *       "endDate": "2025-01-16",             // Optional
 *       "allDay": true,                       // Optional, default true
 *       "eventTypeName": "会议"               // Optional, matches by name
 *     }
 *   ]
 * }
 *
 * ICS format: Standard iCalendar (.ics) file content
 *
 * CSV format: Comma-separated values with header row
 *   title,startDate,endDate,allDay,eventTypeName,description
 *   "会议","2025-01-15","2025-01-16",true,"工作","讨论项目"
 *
 * Excel format: .xlsx file with same columns as CSV (base64 encoded content)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fileType, content } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!fileType || !content) {
      return NextResponse.json(
        { error: 'fileType and content are required' },
        { status: 400 }
      );
    }

    if (!['ics', 'json', 'csv', 'excel'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported: ics, json, csv, excel' },
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

    // Parse events from file content
    let parsedEvents: Array<{
      title: string;
      description?: string;
      startDate: string;
      endDate?: string;
      allDay?: boolean;
      eventTypeName?: string;
    }>;

    if (fileType === 'json') {
      parsedEvents = parseJSON(content);
    } else if (fileType === 'csv') {
      parsedEvents = parseCSV(content);
    } else if (fileType === 'excel') {
      parsedEvents = parseExcel(content);
    } else {
      parsedEvents = parseICS(content);
    }

    if (parsedEvents.length === 0) {
      return NextResponse.json(
        { error: 'No valid events found in the imported file' },
        { status: 400 }
      );
    }

    // Process events: match/create event types, create events
    const results = {
      imported: 0,
      skipped: 0,
      eventTypesMatched: 0,
      eventTypesCreated: 0,
      errors: [] as string[],
    };

    // Get existing event types for this user
    const existingEventTypes = await db.eventType.findMany({
      where: { userId },
    });

    for (const eventData of parsedEvents) {
      try {
        if (!eventData.title || !eventData.startDate) {
          results.skipped++;
          continue;
        }

        // Parse dates
        const startDate = new Date(eventData.startDate);
        if (isNaN(startDate.getTime())) {
          results.skipped++;
          results.errors.push(`Invalid start date for: ${eventData.title}`);
          continue;
        }

        const endDate = eventData.endDate ? new Date(eventData.endDate) : null;
        if (eventData.endDate && endDate && isNaN(endDate.getTime())) {
          results.skipped++;
          results.errors.push(`Invalid end date for: ${eventData.title}`);
          continue;
        }

        // Match or create event type
        let eventTypeId: string | null = null;
        if (eventData.eventTypeName) {
          const existing = existingEventTypes.find(
            (t) => t.name.toLowerCase() === eventData.eventTypeName!.toLowerCase()
          );

          if (existing) {
            eventTypeId = existing.id;
            results.eventTypesMatched++;
          } else {
            // Create new event type with default shape and color
            const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#06b6d4'];
            const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'heart', 'hexagon'];
            const colorIndex = existingEventTypes.length % colors.length;
            const shapeIndex = existingEventTypes.length % shapes.length;

            const newEventType = await db.eventType.create({
              data: {
                name: eventData.eventTypeName,
                shape: shapes[shapeIndex],
                color: colors[colorIndex],
                symbol: eventData.eventTypeName.slice(0, 1),
                sortOrder: existingEventTypes.length,
                userId,
              },
            });

            existingEventTypes.push(newEventType);
            eventTypeId = newEventType.id;
            results.eventTypesCreated++;
          }
        }

        // Check for duplicate event (same title + same start date + same user)
        const existingEvent = await db.calendarEvent.findFirst({
          where: {
            userId,
            title: eventData.title,
            startDate,
          },
        });

        if (existingEvent) {
          results.skipped++;
          continue;
        }

        // Create the event
        await db.calendarEvent.create({
          data: {
            title: eventData.title,
            description: eventData.description || null,
            startDate,
            endDate,
            allDay: eventData.allDay !== undefined ? eventData.allDay : true,
            eventTypeId,
            userId,
            createdById: userId,
          },
        });

        results.imported++;
      } catch (eventError) {
        results.errors.push(`Failed to import: ${eventData.title}`);
        console.error('Error importing event:', eventError);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error importing calendar:', error);
    return NextResponse.json(
      { error: 'Failed to import calendar data' },
      { status: 500 }
    );
  }
}

/**
 * Parse JSON format
 */
function parseJSON(content: string): Array<{
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  eventTypeName?: string;
}> {
  try {
    const data = JSON.parse(content);
    const events = data.events || data;

    if (!Array.isArray(events)) {
      return [];
    }

    return events.filter((e: Record<string, unknown>) => e.title && e.startDate).map((e: Record<string, unknown>) => ({
      title: String(e.title),
      description: e.description ? String(e.description) : undefined,
      startDate: String(e.startDate),
      endDate: e.endDate ? String(e.endDate) : undefined,
      allDay: e.allDay !== undefined ? Boolean(e.allDay) : undefined,
      eventTypeName: e.eventTypeName ? String(e.eventTypeName) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Parse CSV format
 * Expected columns: title, startDate, endDate, allDay, eventTypeName, description
 * First row must be the header row
 */
function parseCSV(content: string): Array<{
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  eventTypeName?: string;
}> {
  try {
    const workbook = XLSX.read(content, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return rows
      .filter((row) => row.title || row.Title || row['标题'])
      .map((row) => normalizeRow(row));
  } catch (e) {
    console.error('Error parsing CSV:', e);
    return [];
  }
}

/**
 * Parse Excel (.xlsx) format
 * Content is expected to be base64 encoded
 * Expected columns: title, startDate, endDate, allDay, eventTypeName, description
 * First row must be the header row
 */
function parseExcel(content: string): Array<{
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  eventTypeName?: string;
}> {
  try {
    // Content is base64 encoded
    const buffer = Buffer.from(content, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return rows
      .filter((row) => row.title || row.Title || row['标题'])
      .map((row) => normalizeRow(row));
  } catch (e) {
    console.error('Error parsing Excel:', e);
    return [];
  }
}

/**
 * Normalize a row from CSV/Excel to a standard event format
 * Supports both English and Chinese column names
 */
function normalizeRow(row: Record<string, unknown>): {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  eventTypeName?: string;
} {
  const getVal = (...keys: string[]): unknown => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return undefined;
  };

  const title = String(getVal('title', 'Title', '标题', '事件标题', '事件') || '');
  const startDate = String(getVal('startDate', 'StartDate', 'start_date', '开始日期', '开始时间', '日期') || '');
  const endDate = getVal('endDate', 'EndDate', 'end_date', '结束日期', '结束时间')
    ? String(getVal('endDate', 'EndDate', 'end_date', '结束日期', '结束时间')) : undefined;
  const allDayVal = getVal('allDay', 'AllDay', 'all_day', '全天');
  const allDay = allDayVal !== undefined
    ? String(allDayVal).toLowerCase() === 'true' || String(allDayVal) === '1'
    : undefined;
  const eventTypeName = getVal('eventTypeName', 'EventType', 'event_type', 'eventTypeName', '事件类型', '类型', '分类')
    ? String(getVal('eventTypeName', 'EventType', 'event_type', 'eventTypeName', '事件类型', '类型', '分类')) : undefined;
  const description = getVal('description', 'Description', 'desc', '描述', '备注', '说明')
    ? String(getVal('description', 'Description', 'desc', '描述', '备注', '说明')) : undefined;

  // Handle Excel date serial numbers
  const parseDate = (dateStr: string): string => {
    if (!dateStr) return '';
    // If it's a number, it might be an Excel date serial number
    const num = Number(dateStr);
    if (!isNaN(num) && num > 10000 && num < 100000) {
      // Excel date serial number - convert using XLSX
      const jsDate = XLSX.SSF.parse_date_code(num);
      if (jsDate) {
        const y = jsDate.y;
        const m = String(jsDate.m).padStart(2, '0');
        const d = String(jsDate.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return dateStr;
  };

  return {
    title,
    startDate: parseDate(startDate),
    endDate: endDate ? parseDate(endDate) : undefined,
    allDay,
    eventTypeName,
    description,
  };
}

/**
 * Parse ICS (iCalendar) format
 */
function parseICS(content: string): Array<{
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  eventTypeName?: string;
}> {
  const events: Array<{
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    allDay?: boolean;
    eventTypeName?: string;
  }> = [];

  // Unfold long lines (RFC 5545: lines can be folded with CRLF + whitespace)
  const unfolded = content.replace(/\r?\n[ \t]/g, '');

  // Split into lines
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let currentEvent: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      inEvent = false;

      // Process the collected event
      const summary = currentEvent['SUMMARY'] || '';
      const dtstart = currentEvent['DTSTART'] || currentEvent['DTSTART;VALUE=DATE'] || '';
      const dtend = currentEvent['DTEND'] || currentEvent['DTEND;VALUE=DATE'] || '';
      const description = currentEvent['DESCRIPTION'] || '';
      const categories = currentEvent['CATEGORIES'] || '';

      if (!summary || !dtstart) continue;

      const parsedStart = parseICSDate(dtstart);
      if (!parsedStart) continue;

      const parsedEnd = dtend ? parseICSDate(dtend) : null;
      const isAllDay = dtstart.length === 8 || dtstart.includes('VALUE=DATE');

      events.push({
        title: summary,
        description: description || undefined,
        startDate: parsedStart,
        endDate: parsedEnd || undefined,
        allDay: isAllDay,
        eventTypeName: categories || undefined,
      });

      continue;
    }

    if (inEvent) {
      // Parse property
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const key = trimmed.substring(0, colonIdx).trim();
        const value = trimmed.substring(colonIdx + 1).trim();
        // Store both with and without parameters
        const baseKey = key.split(';')[0];
        currentEvent[baseKey] = value;
        currentEvent[key] = value;
      }
    }
  }

  return events;
}

/**
 * Parse ICS date format to ISO string
 * Handles: YYYYMMDD, YYYYMMDDTHHMMSS, YYYYMMDDTHHMMSSZ
 */
function parseICSDate(dateStr: string): string | null {
  try {
    // Remove any property prefix like "DTSTART;VALUE=DATE:"
    const cleanStr = dateStr.replace(/^.*:/, '');

    // YYYYMMDD format (all-day)
    if (/^\d{8}$/.test(cleanStr)) {
      return `${cleanStr.slice(0, 4)}-${cleanStr.slice(4, 6)}-${cleanStr.slice(6, 8)}`;
    }

    // YYYYMMDDTHHMMSSZ format (UTC)
    if (/^\d{8}T\d{6}Z$/.test(cleanStr)) {
      const year = cleanStr.slice(0, 4);
      const month = cleanStr.slice(4, 6);
      const day = cleanStr.slice(6, 8);
      const hour = cleanStr.slice(9, 11);
      const minute = cleanStr.slice(11, 13);
      const second = cleanStr.slice(13, 15);
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
    }

    // YYYYMMDDTHHMMSS format (local)
    if (/^\d{8}T\d{6}$/.test(cleanStr)) {
      const year = cleanStr.slice(0, 4);
      const month = cleanStr.slice(4, 6);
      const day = cleanStr.slice(6, 8);
      const hour = cleanStr.slice(9, 11);
      const minute = cleanStr.slice(11, 13);
      const second = cleanStr.slice(13, 15);
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
    }

    // Try standard date parsing as fallback
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }

    return null;
  } catch {
    return null;
  }
}
