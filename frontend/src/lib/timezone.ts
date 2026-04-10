import { formatInTimeZone } from 'date-fns-tz';

let detectedTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * Detect the user's timezone from IP via the backend endpoint (Vercel provides
 * x-vercel-ip-timezone in production) with a fallback to an external IP API,
 * and finally the browser's own timezone.
 */
export async function detectTimezoneFromIP(): Promise<string> {
  // 1. Try our own backend (uses Vercel IP header in production)
  try {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const res = await fetch(`${baseUrl}/timezone`);
    if (res.ok) {
      const data = await res.json();
      if (data.data?.timezone && data.data.timezone !== 'UTC') {
        detectedTimezone = data.data.timezone;
        return detectedTimezone;
      }
    }
  } catch {
    // ignore – try next method
  }

  // 2. Fallback: free IP-to-timezone API
  try {
    const res = await fetch('https://worldtimeapi.org/api/ip');
    if (res.ok) {
      const data = await res.json();
      if (data.timezone) {
        detectedTimezone = data.timezone;
        return detectedTimezone;
      }
    }
  } catch {
    // ignore – use browser timezone
  }

  // 3. Browser timezone (already set as default)
  return detectedTimezone;
}

/** Get the currently detected timezone. */
export function getTimezone(): string {
  return detectedTimezone;
}

/** Override the detected timezone (e.g. from user preferences). */
export function setTimezone(tz: string): void {
  detectedTimezone = tz;
}

/**
 * Format a date/ISO-string in the user's detected timezone.
 * Drop-in replacement for date-fns `format()` with timezone awareness.
 */
export function formatDateTz(date: string | Date, fmt: string, tz?: string): string {
  return formatInTimeZone(new Date(date), tz || detectedTimezone, fmt);
}

/**
 * Return the current date-time string for a `datetime-local` input,
 * expressed in the user's timezone (YYYY-MM-DDTHH:mm).
 */
export function nowLocalInput(tz?: string): string {
  const timezone = tz || detectedTimezone;
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd'T'HH:mm");
}
