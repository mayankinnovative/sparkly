/**
 * Timezone utilities for the backend.
 * All dates are stored as UTC in the database.
 * These helpers convert UTC ↔ a specific IANA timezone when needed
 * (e.g. for date-only fields like issuedDate, payPeriodStart).
 */

/**
 * Returns the current wall-clock time in the given timezone,
 * encoded as a UTC Date (so the UTC components match the local time there).
 */
export function nowInTimezone(timezone: string): Date {
  return toTimezone(new Date(), timezone);
}

/**
 * Converts a UTC Date to the equivalent wall-clock Date in the given timezone.
 * The returned Date's **UTC** year/month/day/hour reflect the target timezone.
 * e.g. 2026-04-10T18:00Z in America/Toronto (UTC-4) → Date whose getUTCHours()=14.
 */
export function toTimezone(utcDate: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  return new Date(Date.UTC(
    parseInt(get('year'), 10),
    parseInt(get('month'), 10) - 1,
    parseInt(get('day'), 10),
    parseInt(get('hour'), 10),
    parseInt(get('minute'), 10),
    parseInt(get('second'), 10),
  ));
}

/**
 * Returns a date-only value (YYYY-MM-DD midnight UTC) for "today" in the given timezone.
 * The UTC date components of the returned Date match the calendar date in that timezone.
 * Perfect for @db.Date columns like issuedDate, payPeriodStart, expense.date.
 */
export function todayInTimezone(timezone: string): Date {
  const local = nowInTimezone(timezone);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}
