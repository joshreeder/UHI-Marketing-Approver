import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

/**
 * Pure scheduling math for planned review rounds (plan §4.8).
 *
 * All durations are calendar days. A "day" of review window means the approver
 * has that many days from send to due.
 */

export type ScheduleInput = {
  startDate: Date | string | null | undefined;
  dueDate?: Date | string | null;
  plannedRounds: number;
  reviewWindowDays: number;
  revisionDays: number;
  /** Days reserved for initial design work. Derived from the due date when omitted. */
  designDays?: number | null;
};

export type SegmentKind = "design" | "review" | "revise" | "approved";

export type Segment = {
  kind: SegmentKind;
  label: string;
  /** 1-based round number for review / revise segments. */
  round?: number;
  start: Date;
  end: Date;
  days: number;
};

export type Schedule = {
  segments: Segment[];
  start: Date;
  /** Date the final review round ends (planned approval). */
  end: Date;
  dueDate: Date | null;
  /** Total days consumed by review + revision segments. */
  reviewChainDays: number;
  /** Days allotted to initial design. */
  designDays: number;
  /** True when the plan finishes on or before the due date (always true without a due date). */
  fits: boolean;
  /** Positive when the plan overshoots the due date. */
  overrunDays: number;
  /** How many full rounds fit between start and due (null when no due date). */
  roundsThatFit: number | null;
};

const DEFAULT_DESIGN_DAYS = 5;

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return startOfDay(d);
  // "YYYY-MM-DD" from a <input type=date> or a Postgres date column — treat as local date.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return startOfDay(new Date(d));
}

function clampInt(n: number, min: number, max = 365): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Days consumed by n review rounds with revisions between them. */
export function reviewChainDays(rounds: number, reviewWindowDays: number, revisionDays: number): number {
  const n = clampInt(rounds, 0);
  const rw = clampInt(reviewWindowDays, 0);
  const rv = clampInt(revisionDays, 0);
  if (n === 0) return 0;
  return n * rw + (n - 1) * rv;
}

/** Largest number of rounds whose chain fits in `availableDays`. */
export function roundsThatFit(availableDays: number, reviewWindowDays: number, revisionDays: number): number {
  const rw = clampInt(reviewWindowDays, 0);
  const rv = clampInt(revisionDays, 0);
  if (availableDays <= 0) return 0;
  if (rw === 0) return Number.POSITIVE_INFINITY as number;
  // n*rw + (n-1)*rv <= available  =>  n <= (available + rv) / (rw + rv)
  return Math.max(0, Math.floor((availableDays + rv) / (rw + rv)));
}

/**
 * Latest date design work may start and still complete every planned round by the due date.
 * Returns null when there is no due date.
 */
export function latestSafeStart(input: ScheduleInput): Date | null {
  const due = toDate(input.dueDate);
  if (!due) return null;
  const chain = reviewChainDays(input.plannedRounds, input.reviewWindowDays, input.revisionDays);
  const design = clampInt(input.designDays ?? 0, 0);
  return addDays(due, -(chain + design));
}

/** Builds the planned schedule: design → review 1 → revise → review 2 … → approved. */
export function buildSchedule(input: ScheduleInput): Schedule {
  const start = toDate(input.startDate) ?? startOfDay(new Date());
  const due = toDate(input.dueDate);
  const rounds = clampInt(input.plannedRounds, 0, 20);
  const rw = clampInt(input.reviewWindowDays, 0);
  const rv = clampInt(input.revisionDays, 0);
  const chain = reviewChainDays(rounds, rw, rv);

  let designDays: number;
  if (input.designDays != null) {
    designDays = clampInt(input.designDays, 0);
  } else if (due) {
    const available = differenceInCalendarDays(due, start);
    designDays = Math.max(0, available - chain);
  } else {
    designDays = DEFAULT_DESIGN_DAYS;
  }

  const segments: Segment[] = [];
  let cursor = start;
  const push = (kind: SegmentKind, label: string, days: number, round?: number) => {
    const end = addDays(cursor, days);
    segments.push({ kind, label, round, start: cursor, end, days });
    cursor = end;
  };

  if (designDays > 0 || rounds === 0) push("design", "Design", designDays);
  for (let r = 1; r <= rounds; r++) {
    push("review", `Review ${r}`, rw, r);
    if (r < rounds) push("revise", "Revise", rv, r);
  }
  const end = cursor;
  segments.push({ kind: "approved", label: "Approved", start: end, end, days: 0 });

  const overrunDays = due ? Math.max(0, differenceInCalendarDays(end, due)) : 0;
  const available = due ? differenceInCalendarDays(due, start) : null;

  return {
    segments,
    start,
    end,
    dueDate: due,
    reviewChainDays: chain,
    designDays,
    fits: overrunDays === 0,
    overrunDays,
    roundsThatFit: available == null ? null : roundsThatFit(available - designDays, rw, rv),
  };
}

/** Human-readable warning for the new-project form, or null when the plan works. */
export function scheduleWarning(s: Schedule, formatDate: (d: Date) => string): string | null {
  if (!s.dueDate) return null;
  if (s.fits && s.designDays > 0) return null;
  if (s.fits && s.designDays === 0) {
    return `No design time left before review 1 — the review chain uses every day until ${formatDate(s.dueDate)}.`;
  }
  const fit = s.roundsThatFit ?? 0;
  const roundsWord = fit === 1 ? "round fits" : "rounds fit";
  return `Only ${fit} ${roundsWord} before ${formatDate(s.dueDate)} — this plan runs ${s.overrunDays} day${s.overrunDays === 1 ? "" : "s"} past the due date.`;
}
