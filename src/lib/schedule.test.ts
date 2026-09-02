import { describe, expect, it } from "vitest";
import { buildSchedule, latestSafeStart, reviewChainDays, roundsThatFit, scheduleWarning } from "./schedule";

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("reviewChainDays", () => {
  it("adds review windows and the revisions between them", () => {
    expect(reviewChainDays(3, 3, 2)).toBe(3 * 3 + 2 * 2); // 13
    expect(reviewChainDays(1, 3, 2)).toBe(3);
    expect(reviewChainDays(0, 3, 2)).toBe(0);
  });
});

describe("roundsThatFit", () => {
  it("returns the max number of full rounds in the available days", () => {
    expect(roundsThatFit(13, 3, 2)).toBe(3);
    expect(roundsThatFit(12, 3, 2)).toBe(2);
    expect(roundsThatFit(3, 3, 2)).toBe(1);
    expect(roundsThatFit(2, 3, 2)).toBe(0);
    expect(roundsThatFit(0, 3, 2)).toBe(0);
  });
});

describe("buildSchedule", () => {
  const base = { plannedRounds: 3, reviewWindowDays: 3, revisionDays: 2 };

  it("lays segments end to end from the start date", () => {
    const s = buildSchedule({ ...base, startDate: "2026-09-01", dueDate: "2026-09-19" });
    expect(s.segments.map((x) => x.label)).toEqual([
      "Design",
      "Review 1",
      "Revise",
      "Review 2",
      "Revise",
      "Review 3",
      "Approved",
    ]);
    // 18 days available, 13 for reviews -> 5 for design
    expect(s.designDays).toBe(5);
    expect(fmt(s.segments[0].start)).toBe(fmt(local(2026, 9, 1)));
    expect(fmt(s.segments[1].start)).toBe(fmt(local(2026, 9, 6)));
    expect(fmt(s.end)).toBe(fmt(local(2026, 9, 19)));
    expect(s.fits).toBe(true);
    expect(s.overrunDays).toBe(0);
    expect(s.roundsThatFit).toBe(3);
  });

  it("segments are contiguous", () => {
    const s = buildSchedule({ ...base, startDate: "2026-09-01", dueDate: "2026-09-30" });
    for (let i = 1; i < s.segments.length; i++) {
      expect(s.segments[i].start.getTime()).toBe(s.segments[i - 1].end.getTime());
    }
  });

  it("flags plans that do not fit and reports how many rounds do", () => {
    // 10 days available, chain needs 13
    const s = buildSchedule({ ...base, startDate: "2026-09-09", dueDate: "2026-09-19" });
    expect(s.designDays).toBe(0);
    expect(s.fits).toBe(false);
    expect(s.overrunDays).toBe(3);
    expect(s.roundsThatFit).toBe(2);
    expect(scheduleWarning(s, fmt)).toMatch(/Only 2 rounds fit before 2026-09-19/);
  });

  it("warns when the chain fits exactly with no design time", () => {
    const s = buildSchedule({ ...base, startDate: "2026-09-06", dueDate: "2026-09-19" });
    expect(s.fits).toBe(true);
    expect(s.designDays).toBe(0);
    expect(scheduleWarning(s, fmt)).toMatch(/No design time left/);
  });

  it("uses a default design allowance when there is no due date", () => {
    const s = buildSchedule({ ...base, startDate: "2026-09-01" });
    expect(s.designDays).toBe(5);
    expect(s.dueDate).toBeNull();
    expect(s.fits).toBe(true);
    expect(s.roundsThatFit).toBeNull();
    expect(scheduleWarning(s, fmt)).toBeNull();
  });

  it("honours an explicit designDays override", () => {
    const s = buildSchedule({ ...base, startDate: "2026-09-01", dueDate: "2026-09-19", designDays: 10 });
    expect(s.designDays).toBe(10);
    expect(s.overrunDays).toBe(5);
    expect(s.fits).toBe(false);
  });

  it("handles a single round with no revision segment", () => {
    const s = buildSchedule({ ...base, plannedRounds: 1, startDate: "2026-09-01", dueDate: "2026-09-10" });
    expect(s.segments.map((x) => x.kind)).toEqual(["design", "review", "approved"]);
    expect(s.reviewChainDays).toBe(3);
  });

  it("handles zero rounds as design only", () => {
    const s = buildSchedule({ ...base, plannedRounds: 0, startDate: "2026-09-01", dueDate: "2026-09-10" });
    expect(s.segments.map((x) => x.kind)).toEqual(["design", "approved"]);
    expect(s.designDays).toBe(9);
  });
});

describe("latestSafeStart", () => {
  it("is the due date minus the review chain and design time", () => {
    const d = latestSafeStart({
      startDate: null,
      dueDate: "2026-09-19",
      plannedRounds: 3,
      reviewWindowDays: 3,
      revisionDays: 2,
      designDays: 5,
    });
    expect(d && fmt(d)).toBe(fmt(local(2026, 9, 1)));
  });

  it("returns null without a due date", () => {
    expect(latestSafeStart({ startDate: null, plannedRounds: 3, reviewWindowDays: 3, revisionDays: 2 })).toBeNull();
  });
});
