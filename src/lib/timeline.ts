import { differenceInCalendarDays, startOfDay } from "date-fns";
import { buildSchedule, type Segment } from "@/lib/schedule";
import { parseDateOnly } from "@/lib/format";
import type { ProjectStatus, RoundStatus } from "@/lib/db/schema";

export type ActualRound = {
  label: string; // "Review 1"
  versionNumber: number;
  start: Date;
  end: Date; // completedAt, or dueAt when still open, or now when overdue
  status: RoundStatus;
  open: boolean;
  overdue: boolean;
};

export type TimelineRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  designer: string | null;
  start: Date | null;
  due: Date | null;
  overdueDays: number;
  planned: Segment[];
  actual: ActualRound[];
  /** Positive = behind plan (days), negative = ahead. Null when nothing to compare. */
  driftDays: number | null;
  extraRounds: number;
};

export type TimelineProjectInput = {
  id: string;
  name: string;
  status: ProjectStatus;
  designer: string | null;
  startDate: string | null;
  dueDate: string | null;
  plannedRounds: number;
  reviewWindowDays: number;
  revisionDays: number;
  rounds: { versionNumber: number; sentAt: Date; dueAt: Date; completedAt: Date | null; status: RoundStatus }[];
};

/** Builds one Gantt row: plan from the schedule math, actual rounds overlaid, drift computed. */
export function buildTimelineRow(p: TimelineProjectInput, now = new Date()): TimelineRow {
  const today = startOfDay(now);
  const start = parseDateOnly(p.startDate);
  const due = parseDateOnly(p.dueDate);
  const schedule = start ? buildSchedule({ startDate: start, dueDate: due, plannedRounds: p.plannedRounds, reviewWindowDays: p.reviewWindowDays, revisionDays: p.revisionDays }) : null;
  const planned = schedule?.segments.filter((s) => s.days > 0) ?? [];

  const rounds = [...p.rounds].sort((a, b) => a.versionNumber - b.versionNumber);
  const actual: ActualRound[] = rounds.map((r, i) => {
    const open = r.status === "pending" || r.status === "changes_requested";
    const overdue = open && r.dueAt < now;
    const end = r.completedAt ?? (open ? (overdue ? now : r.dueAt) : r.dueAt);
    return { label: `Review ${i + 1}`, versionNumber: r.versionNumber, start: r.sentAt, end, status: r.status, open, overdue };
  });

  let driftDays: number | null = null;
  if (planned.length && actual.length) {
    const reviews = planned.filter((s) => s.kind === "review");
    const last = actual[actual.length - 1];
    const plan = reviews[Math.min(actual.length, reviews.length) - 1];
    if (plan) driftDays = differenceInCalendarDays(startOfDay(last.end), plan.end);
  }

  const closed = p.status === "done" || p.status === "cancelled" || p.status === "on_hold" || p.status === "approved";
  const overdueDays = due && !closed ? Math.max(0, differenceInCalendarDays(today, due)) : 0;

  return {
    id: p.id,
    name: p.name,
    status: p.status,
    designer: p.designer,
    start,
    due,
    overdueDays,
    planned,
    actual,
    driftDays,
    extraRounds: Math.max(0, actual.length - p.plannedRounds),
  };
}

/** Date window that comfortably contains every row, today included. */
export function timelineRange(rows: TimelineRow[], now = new Date()): { from: Date; to: Date } {
  const today = startOfDay(now);
  let min = today.getTime();
  let max = today.getTime();
  for (const r of rows) {
    for (const d of [r.start, r.due, ...r.planned.flatMap((s) => [s.start, s.end]), ...r.actual.flatMap((a) => [a.start, a.end])]) {
      if (!d) continue;
      min = Math.min(min, d.getTime());
      max = Math.max(max, d.getTime());
    }
  }
  const DAY = 86_400_000;
  return { from: new Date(min - 3 * DAY), to: new Date(max + 7 * DAY) };
}
