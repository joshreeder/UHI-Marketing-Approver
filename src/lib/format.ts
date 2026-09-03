import { differenceInCalendarDays } from "date-fns";
import { getTimeZone, partsInTz, todayInTz, ymdInTz } from "@/lib/tz";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a date-only column ("YYYY-MM-DD") to a Date at runtime-local midnight; passes Dates through. */
export function parseDateOnly(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const m = DATE_ONLY.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(d);
}

function fmt(date: Date, opts: Intl.DateTimeFormatOptions, tz = getTimeZone()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(date);
}

/** Date-only strings are calendar dates (no zone); Dates are instants shown in the company zone. */
function calendarParts(d: string | Date): { year: number; month: number; day: number } {
  if (typeof d === "string") {
    const m = DATE_ONLY.exec(d);
    if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    return partsInTz(new Date(d));
  }
  return partsInTz(d);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep 5" or "Sep 5, 2025" when not the current year. */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const p = calendarParts(d);
  const thisYear = partsInTz(new Date()).year;
  return `${MONTHS[p.month - 1]} ${p.day}${p.year === thisYear ? "" : `, ${p.year}`}`;
}

/** "Sep 5, 2:14 PM" in the company zone. */
export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return fmt(date, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "Friday, Sep 5" for emails. */
export function fmtDueLong(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return fmt(date, { weekday: "long", month: "short", day: "numeric" });
}

function fmtTime(date: Date): string {
  return fmt(date, { hour: "numeric", minute: "2-digit" });
}

/** "today, 2:14 PM", "yesterday", "tomorrow", "3 days ago", "in 2 days" — calendar days in the company zone. */
export function fmtRelative(d: Date | string | null | undefined, now = new Date()): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const dayDiff = differenceInCalendarDays(todayInTz(getTimeZone(), now), todayInTz(getTimeZone(), date));
  if (dayDiff === 0) return `today, ${fmtTime(date)}`;
  if (dayDiff === 1) return "yesterday";
  if (dayDiff === -1) return "tomorrow";
  if (dayDiff > 1) return dayDiff < 30 ? `${dayDiff} days ago` : fmtDate(date);
  const ahead = -dayDiff;
  return ahead < 30 ? `in ${ahead} days` : fmtDate(date);
}

/** Positive when past due (days late), negative when days remaining. Calendar days in the company zone. */
export function daysOverdue(due: Date | string | null | undefined, now = new Date()): number | null {
  if (!due) return null;
  const dueDay = typeof due === "string" && DATE_ONLY.test(due) ? parseDateOnly(due)! : todayInTz(getTimeZone(), typeof due === "string" ? new Date(due) : due);
  return differenceInCalendarDays(todayInTz(getTimeZone(), now), dueDay);
}

/** Value for <input type="date">. Dates (instants) are converted to the company zone's calendar date. */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string" && DATE_ONLY.test(d)) return d;
  return ymdInTz(typeof d === "string" ? new Date(d) : d);
}

export function fmtBytes(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(nameOrEmail: string): string {
  const s = nameOrEmail.trim();
  if (!s) return "?";
  if (s.includes("@")) return s[0].toUpperCase();
  const parts = s.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function displayName(u: { name: string | null; email: string }): string {
  return u.name?.trim() || u.email;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
