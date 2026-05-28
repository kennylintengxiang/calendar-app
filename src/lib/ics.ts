interface ICSEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  uid?: string;
}

/**
 * Format a Date object to DATE format (YYYYMMDD) for all-day events
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format a Date object to DATE-TIME format (YYYYMMDDTHHMMSS) for timed events
 */
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escape special characters for ICS format
 * Backslashes, semicolons, commas, and newlines must be escaped
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold long lines according to RFC 5545 (max 75 octets per line)
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;

  const lines: string[] = [];
  let remaining = line;

  while (remaining.length > 75) {
    let cutPos = 75;
    // Ensure we don't cut in the middle of a multi-byte character
    lines.push(remaining.slice(0, cutPos));
    remaining = ' ' + remaining.slice(cutPos);
  }

  if (remaining.length > 0) {
    lines.push(remaining);
  }

  return lines.join('\r\n');
}

/**
 * Generate a simple UID for events
 */
function generateUID(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}@chinese-calendar`;
}

/**
 * Generate ICS format string from an array of events
 * Follows RFC 5545 iCalendar standard
 */
export function generateICS(events: ICSEvent[]): string {
  const lines: string[] = [];

  // VCALENDAR header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Chinese Calendar//CN//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');

  for (const event of events) {
    lines.push('BEGIN:VEVENT');

    // UID
    const uid = event.uid || generateUID();
    lines.push(foldLine(`UID:${uid}`));

    // DTSTART
    if (event.allDay) {
      lines.push(foldLine(`DTSTART;VALUE=DATE:${formatDate(event.startDate)}`));
    } else {
      lines.push(foldLine(`DTSTART:${formatDateTime(event.startDate)}`));
    }

    // DTEND
    if (event.endDate) {
      if (event.allDay) {
        // For all-day events, DTEND is exclusive (next day)
        const nextDay = new Date(event.endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        lines.push(foldLine(`DTEND;VALUE=DATE:${formatDate(nextDay)}`));
      } else {
        lines.push(foldLine(`DTEND:${formatDateTime(event.endDate)}`));
      }
    } else if (event.allDay) {
      // Single all-day event: DTEND is the next day
      const nextDay = new Date(event.startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      lines.push(foldLine(`DTEND;VALUE=DATE:${formatDate(nextDay)}`));
    }

    // SUMMARY (title)
    lines.push(foldLine(`SUMMARY:${escapeICS(event.title)}`));

    // DESCRIPTION
    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICS(event.description)}`));
    }

    // DTSTAMP (creation timestamp)
    lines.push(foldLine(`DTSTAMP:${formatDateTime(new Date())}`));

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // ICS files must use CRLF line endings per RFC 5545
  return lines.join('\r\n') + '\r\n';
}
