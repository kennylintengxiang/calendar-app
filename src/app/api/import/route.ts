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
 *       "eventTypeName": "会议",              // Optional, matches by name
 *       "entityNames": ["主体A", "主体B"]      // Optional, matches/creates entities by name
 *     }
 *   ]
 * }
 *
 * ICS format: Standard iCalendar (.ics) file content
 *
 * CSV format: Comma-separated values with header row
 *   title,startDate,endDate,allDay,eventTypeName,description,entityNames
 *   "会议","2025-01-15","2025-01-16",true,"工作","讨论项目","主体A;主体B"
 *   - Multiple dates in startDate: separated by SEMICOLON ";"
 *   - Multiple end dates in endDate: separated by SEMICOLON ";" (paired with start dates by order)
 *   - Multiple entities in entityNames: separated by SEMICOLON ";"
 *
 * Excel format: .xlsx file with same columns as CSV (base64 encoded content)
 *   - Multiple dates in startDate: separated by COMMA ","
 *   - Multiple end dates in endDate: separated by COMMA "," (paired with start dates by order)
 *   - Multiple entities in entityNames: separated by COMMA ","
 */

interface ParsedEvent {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  eventTypeName?: string;
  entityNames?: string[];
}

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
    let parsedEvents: ParsedEvent[];
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

    // Process events: match/create event types & entities, create events
    const results = {
      imported: 0,
      skipped: 0,
      eventTypesMatched: 0,
      eventTypesCreated: 0,
      entitiesMatched: 0,
      entitiesCreated: 0,
      errors: [] as string[],
      // 调试日志：记录每个事件的处理详情，方便排查问题
      eventLog: [] as Array<{
        title: string;
        startDate: string;
        eventTypeName?: string;
        eventTypeId: string | null;
        status: 'imported' | 'skipped' | 'error';
        reason?: string;
      }>,
    };

    // Get existing event types for this user
    const existingEventTypes = await db.eventType.findMany({
      where: { userId },
    });

    // Get existing entities for this user (for matching)
    const existingEntities = await db.entity.findMany({
      where: { userId },
    });

    for (const eventData of parsedEvents) {
      try {
        if (!eventData.title || !eventData.startDate) {
          results.skipped++;
          results.eventLog.push({
            title: eventData.title || '(空)',
            startDate: eventData.startDate || '(空)',
            eventTypeName: eventData.eventTypeName,
            eventTypeId: null,
            status: 'skipped',
            reason: '缺少标题或开始日期',
          });
          continue;
        }

        // Parse start date
        const startDate = new Date(eventData.startDate);
        if (isNaN(startDate.getTime())) {
          results.skipped++;
          results.errors.push(`Invalid start date for: ${eventData.title}`);
          results.eventLog.push({
            title: eventData.title,
            startDate: eventData.startDate,
            eventTypeName: eventData.eventTypeName,
            eventTypeId: null,
            status: 'skipped',
            reason: '开始日期格式无效',
          });
          continue;
        }

        // Parse end date
        const endDate = eventData.endDate ? new Date(eventData.endDate) : null;
        if (eventData.endDate && endDate && isNaN(endDate.getTime())) {
          results.skipped++;
          results.errors.push(`Invalid end date for: ${eventData.title}`);
          results.eventLog.push({
            title: eventData.title,
            startDate: eventData.startDate,
            eventTypeName: eventData.eventTypeName,
            eventTypeId: null,
            status: 'skipped',
            reason: '结束日期格式无效',
          });
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

        // 调试日志：记录事件类型匹配结果
        console.log(`[Import] 事件 "${eventData.title}" (${eventData.startDate}): eventTypeName="${eventData.eventTypeName || '(无)'}", eventTypeId=${eventTypeId || 'null'}`);

        // Match or create entities, collect entity IDs
        const entityIds: string[] = [];
        if (eventData.entityNames && eventData.entityNames.length > 0) {
          for (const entityName of eventData.entityNames) {
            const trimmedName = entityName.trim();
            if (!trimmedName) continue;

            // Match existing entity by name (case-insensitive)
            const existingEntity = existingEntities.find(
              (e) => e.name.toLowerCase() === trimmedName.toLowerCase()
            );

            if (existingEntity) {
              entityIds.push(existingEntity.id);
              results.entitiesMatched++;
            } else {
              // Create new entity
              const newEntity = await db.entity.create({
                data: {
                  name: trimmedName,
                  userId,
                  sortOrder: existingEntities.length,
                },
              });
              existingEntities.push(newEntity);
              entityIds.push(newEntity.id);
              results.entitiesCreated++;
            }
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
          results.eventLog.push({
            title: eventData.title,
            startDate: eventData.startDate,
            eventTypeName: eventData.eventTypeName,
            eventTypeId,
            status: 'skipped',
            reason: '重复事件（标题+日期已存在）',
          });
          continue;
        }

        // Create the event with entity relations
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
            eventEntities: entityIds.length > 0 ? {
              create: entityIds.map((entityId) => ({ entityId }))
            } : undefined,
          },
        });

        results.imported++;
        results.eventLog.push({
          title: eventData.title,
          startDate: eventData.startDate,
          eventTypeName: eventData.eventTypeName,
          eventTypeId,
          status: 'imported',
        });
      } catch (eventError) {
        results.errors.push(`Failed to import: ${eventData.title}`);
        console.error('Error importing event:', eventError);
        results.eventLog.push({
          title: eventData.title,
          startDate: eventData.startDate,
          eventTypeName: eventData.eventTypeName,
          eventTypeId: null,
          status: 'error',
          reason: eventError instanceof Error ? eventError.message : '未知错误',
        });
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
function parseJSON(content: string): ParsedEvent[] {
  try {
    const data = JSON.parse(content);
    const events = data.events || data;

    if (!Array.isArray(events)) {
      return [];
    }

    return events
      .filter((e: Record<string, unknown>) => e.title && e.startDate)
      .flatMap((e: Record<string, unknown>) => {
        const base = {
          title: String(e.title),
          description: e.description ? String(e.description) : undefined,
          allDay: e.allDay !== undefined ? Boolean(e.allDay) : undefined,
          eventTypeName: e.eventTypeName ? String(e.eventTypeName) : undefined,
        };
        // entityNames can be an array or a string
        let entityNames: string[] | undefined;
        if (Array.isArray(e.entityNames)) {
          entityNames = (e.entityNames as unknown[]).map((n) => String(n));
        } else if (typeof e.entityNames === 'string' && e.entityNames) {
          entityNames = (e.entityNames as string).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        } else if (e.entityName) {
          entityNames = [String(e.entityName)];
        }

        // Expand multiple start dates (JSON uses comma or semicolon)
        const startDateStr = String(e.startDate);
        const endDateStr = e.endDate ? String(e.endDate) : '';
        const startDates = splitDates(startDateStr);
        const endDates = endDateStr ? splitDates(endDateStr) : [];

        return startDates.map((sd, i) => ({
          ...base,
          startDate: sd,
          endDate: endDates[i] || endDates[0] || undefined,
          entityNames,
        }));
      });
  } catch {
    return [];
  }
}

/**
 * Parse CSV format
 * Uses semicolon ";" as the separator for multiple dates / entities within a cell.
 */
function parseCSV(content: string): ParsedEvent[] {
  try {
    const workbook = XLSX.read(content, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return rows
      .filter((row) => row.title || row.Title || row['标题'])
      .flatMap((row) => normalizeRow(row, ';'));
  } catch (e) {
    console.error('Error parsing CSV:', e);
    return [];
  }
}

/**
 * Parse Excel (.xlsx) format
 * Content is expected to be base64 encoded.
 * Uses comma "," as the separator for multiple dates / entities within a cell.
 */
function parseExcel(content: string): ParsedEvent[] {
  try {
    const buffer = Buffer.from(content, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return rows
      .filter((row) => row.title || row.Title || row['标题'])
      .flatMap((row) => normalizeRow(row, ','));
  } catch (e) {
    console.error('Error parsing Excel:', e);
    return [];
  }
}

/**
 * Split a cell that may contain multiple dates separated by separator
 * Also handles Excel date serial numbers within the list.
 */
function splitDates(value: string, separator: string): string[] {
  if (!value) return [];
  return value
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((d) => parseDate(d));
}

/**
 * Parse a single date string. Handles Excel date serial numbers.
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  // If it's a number, it might be an Excel date serial number
  const num = Number(dateStr);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    const jsDate = XLSX.SSF.parse_date_code(num);
    if (jsDate) {
      const y = jsDate.y;
      const m = String(jsDate.m).padStart(2, '0');
      const d = String(jsDate.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return dateStr;
}

/**
 * Normalize a row from CSV/Excel to one or more event objects.
 * Supports both English and Chinese column names.
 * `separator` is used to split multiple values within a single cell.
 */
function normalizeRow(row: Record<string, unknown>, separator: string): ParsedEvent[] {
  const getVal = (...keys: string[]): unknown => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return undefined;
  };

  const title = String(getVal('title', 'Title', '标题', '事件标题', '事件') || '');
  const startDateRaw = String(getVal('startDate', 'StartDate', 'start_date', '开始日期', '开始时间', '日期') || '');
  const endDateRaw = getVal('endDate', 'EndDate', 'end_date', '结束日期', '结束时间')
    ? String(getVal('endDate', 'EndDate', 'end_date', '结束日期', '结束时间')) : '';
  const allDayVal = getVal('allDay', 'AllDay', 'all_day', '全天');
  const allDay = allDayVal !== undefined
    ? String(allDayVal).toLowerCase() === 'true' || String(allDayVal) === '1'
    : undefined;
  const eventTypeName = getVal('eventTypeName', 'EventType', 'event_type', 'eventTypeName', '事件类型', '类型', '分类')
    ? String(getVal('eventTypeName', 'EventType', 'event_type', 'eventTypeName', '事件类型', '类型', '分类')) : undefined;
  const description = getVal('description', 'Description', 'desc', '描述', '备注', '说明')
    ? String(getVal('description', 'Description', 'desc', '描述', '备注', '说明')) : undefined;

  // Entity names: support multiple names within one cell, separated by `separator`
  const entityRaw = getVal('entityNames', 'EntityNames', 'entity_names', 'entities', '主体', '主体名称', '实体', '关联主体');
  let entityNames: string[] | undefined;
  if (entityRaw) {
    entityNames = String(entityRaw)
      .split(separator)
      .map((s) => s.trim())
      .filter(Boolean);
    if (entityNames.length === 0) entityNames = undefined;
  }

  // Expand multiple start dates
  const startDates = splitDates(startDateRaw, separator);
  const endDates = splitDates(endDateRaw, separator);

  if (startDates.length === 0) {
    return [{
      title,
      startDate: '',
      endDate: undefined,
      allDay,
      eventTypeName,
      description,
      entityNames,
    }];
  }

  // 方案 A + B 结合：
  // - 如果 endDate 单元格里也有多个日期，按顺序一一对应（方案 B）
  // - 如果 endDate 单元格里只写一个日期，所有事件共用这个结束日期
  // - 如果 endDate 为空，则每个事件都是单日事件（方案 A）
  return startDates.map((sd, i) => ({
    title,
    startDate: sd,
    endDate: endDates[i] || endDates[0] || undefined,
    allDay,
    eventTypeName,
    description,
    entityNames,
  }));
}

/**
 * Parse ICS (iCalendar) format
 */
function parseICS(content: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Unfold long lines (RFC 5545: lines can be folded with CRLF + whitespace)
  const unfolded = content.replace(/\r?\n[ \t]/g, '');

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
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const key = trimmed.substring(0, colonIdx).trim();
        const value = trimmed.substring(colonIdx + 1).trim();
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
 */
function parseICSDate(dateStr: string): string | null {
  try {
    const cleanStr = dateStr.replace(/^.*:/, '');

    if (/^\d{8}$/.test(cleanStr)) {
      return `${cleanStr.slice(0, 4)}-${cleanStr.slice(4, 6)}-${cleanStr.slice(6, 8)}`;
    }

    if (/^\d{8}T\d{6}Z$/.test(cleanStr)) {
      const year = cleanStr.slice(0, 4);
      const month = cleanStr.slice(4, 6);
      const day = cleanStr.slice(6, 8);
      const hour = cleanStr.slice(9, 11);
      const minute = cleanStr.slice(11, 13);
      const second = cleanStr.slice(13, 15);
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
    }

    if (/^\d{8}T\d{6}$/.test(cleanStr)) {
      const year = cleanStr.slice(0, 4);
      const month = cleanStr.slice(4, 6);
      const day = cleanStr.slice(6, 8);
      const hour = cleanStr.slice(9, 11);
      const minute = cleanStr.slice(11, 13);
      const second = cleanStr.slice(13, 15);
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
    }

    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }

    return null;
  } catch {
    return null;
  }
}
