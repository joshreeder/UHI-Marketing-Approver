import { afterEach, describe, expect, it } from "vitest";
import { daysOverdue, fmtDate, fmtDateTime, fmtRelative, toDateInput } from "./format";
import { setTimeZone, todayInTz, utcHourInTz, ymdInTz } from "./tz";

afterEach(() => setTimeZone("America/Boise"));

describe("company time zone formatting", () => {
  // 2026-09-03T02:30Z is Sep 2, 8:30 PM in Boise (MDT, UTC-6)
  const late = new Date("2026-09-03T02:30:00Z");

  it("shows instants in the company zone, not the server zone", () => {
    setTimeZone("America/Boise");
    expect(fmtDateTime(late)).toBe("Sep 2, 8:30 PM");
    expect(ymdInTz(late)).toBe("2026-09-02");
    setTimeZone("UTC");
    expect(fmtDateTime(late)).toBe("Sep 3, 2:30 AM");
  });

  it("treats date-only columns as calendar dates regardless of zone", () => {
    setTimeZone("America/Boise");
    expect(fmtDate("2026-09-05")).toBe("Sep 5");
    expect(toDateInput("2026-09-05")).toBe("2026-09-05");
    setTimeZone("Pacific/Honolulu");
    expect(fmtDate("2026-09-05")).toBe("Sep 5");
  });

  it("computes today and overdue days in the company zone", () => {
    setTimeZone("America/Boise");
    expect(todayInTz("America/Boise", late).getDate()).toBe(2);
    expect(daysOverdue("2026-09-01", late)).toBe(1);
    expect(daysOverdue("2026-09-02", late)).toBe(0);
    expect(daysOverdue("2026-09-04", late)).toBe(-2);
  });

  it("describes relative days in the company zone", () => {
    setTimeZone("America/Boise");
    const now = new Date("2026-09-03T03:00:00Z"); // still Sep 2 evening in Boise
    expect(fmtRelative(late, now)).toBe("today, 8:30 PM");
    expect(fmtRelative(new Date("2026-09-02T03:00:00Z"), now)).toBe("yesterday");
    expect(fmtRelative(new Date("2026-09-03T15:00:00Z"), now)).toBe("tomorrow");
    expect(fmtRelative(new Date("2026-09-04T15:00:00Z"), now)).toBe("in 2 days");
  });

  it("explains the cron hour in local time", () => {
    setTimeZone("America/Boise");
    expect(utcHourInTz(14)).toMatch(/7:00 AM \(8:00 AM in summer\)/);
  });
});
