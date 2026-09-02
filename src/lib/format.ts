import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";

export function parseDateOnly(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(d);
}

/** "Sept 5" or "Sept 5, 2025" when not the current year. */
export function fmtDate(d: string | Date | null | undefined): string {
  const date = parseDateOnly(d);
  if (!date) return "—";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return format(date, sameYear ? "MMM d" : "MMM d, yyyy");
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "MMM d, h:mm a");
}

/** "Due Friday, Sept 5" style for emails. */
export function fmtDueLong(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "EEEE, MMM d");
}

export function fmtRelative(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isToday(date)) return `today, ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return "yesterday";
  if (isTomorrow(date)) return "tomorrow";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/** Positive when past due (days late), negative when days remaining. */
export function daysOverdue(due: Date | string | null | undefined, now = new Date()): number | null {
  const date = parseDateOnly(due);
  if (!date) return null;
  return differenceInCalendarDays(now, date);
}

export function toDateInput(d: Date | string | null | undefined): string {
  const date = parseDateOnly(d);
  return date ? format(date, "yyyy-MM-dd") : "";
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
