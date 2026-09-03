/**
 * Company time zone. Single-tenant app, so one zone for everyone: dates and times are shown in it
 * regardless of where the server (UTC on Vercel) or the viewer is. getSettings() refreshes it.
 */
export const DEFAULT_TIME_ZONE = "America/Boise";

export const TIME_ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/Boise", label: "Mountain — Boise / Meridian (MT)" },
  { value: "America/Denver", label: "Mountain — Denver (MT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "UTC", label: "UTC" },
];

let current = DEFAULT_TIME_ZONE;

export function setTimeZone(tz: string | null | undefined) {
  if (tz && isValidTimeZone(tz)) current = tz;
}

export function getTimeZone(): string {
  return current;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Calendar parts of an instant in the given zone. */
export function partsInTz(date: Date, tz = getTimeZone()): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute") };
}

/** "YYYY-MM-DD" for an instant, in the company zone. */
export function ymdInTz(date: Date, tz = getTimeZone()): string {
  const p = partsInTz(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/**
 * Today's date in the company zone, as a Date at *local* midnight of the runtime. Date-only columns
 * are parsed the same way (see parseDateOnly), so calendar-day math between the two is consistent
 * no matter what zone the server runs in.
 */
export function todayInTz(tz = getTimeZone(), now = new Date()): Date {
  const p = partsInTz(now, tz);
  return new Date(p.year, p.month - 1, p.day);
}

/** Local hour (0-23) at which automatic reminders go out, year-round. */
export const REMINDER_HOUR_LOCAL = 8;

/** True when it is currently the reminder hour in the company zone. */
export function isReminderHour(now = new Date(), tz = getTimeZone()): boolean {
  return partsInTz(now, tz).hour === REMINDER_HOUR_LOCAL;
}

/** Formats a fixed UTC hour (e.g. the cron schedule) as a local time in the company zone, like "8:00 AM". */
export function utcHourInTz(hourUtc: number, tz = getTimeZone()): string {
  const d = new Date(Date.UTC(2026, 0, 15, hourUtc, 0, 0)); // mid-January: standard time
  const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
  const dst = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(Date.UTC(2026, 6, 15, hourUtc, 0, 0)));
  return s === dst ? s : `${s} (${dst} in summer)`;
}
