import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { GanttChart } from "@/components/gantt-chart";
import { Button } from "@/components/ui/button";
import { requireTeam } from "@/lib/auth/session";
import { listTimelineProjects } from "@/lib/queries";
import { buildTimelineRow, timelineRange } from "@/lib/timeline";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Timeline" };
export const dynamic = "force-dynamic";

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireTeam();
  const { all } = await searchParams;
  const projects = await listTimelineProjects(all === "1");
  const now = new Date();
  const rows = projects.map((p) => buildTimelineRow(p, now));
  const scheduled = rows.filter((r) => r.start || r.due);
  const unscheduled = rows.filter((r) => !r.start && !r.due);
  const range = timelineRange(scheduled, now);

  return (
    <>
      <PageHeader
        title="Timeline"
        description="Projects from start to due date. The thin bar is the plan (design → review → revise); the markers below it are the review rounds that actually happened. Drag a bar to move a project."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={all === "1" ? "/timeline" : "/timeline?all=1"} />}>
            {all === "1" ? "Hide archived" : "Show archived"}
          </Button>
        }
      />
      {scheduled.length === 0 ? (
        <EmptyState title="Nothing to plot yet" description="Give a project a start or due date and it will appear here." />
      ) : (
        <GanttChart
          rows={scheduled.map((r) => ({
            ...r,
            start: r.start?.toISOString() ?? null,
            due: r.due?.toISOString() ?? null,
            planned: r.planned.map((s) => ({ kind: s.kind, label: s.label, start: s.start.toISOString(), end: s.end.toISOString() })),
            actual: r.actual.map((a) => ({ ...a, start: a.start.toISOString(), end: a.end.toISOString() })),
          }))}
          from={range.from.toISOString()}
          to={range.to.toISOString()}
          today={now.toISOString()}
        />
      )}
      {unscheduled.length ? (
        <section className="mt-6 rounded-xl border border-line bg-white p-5 text-sm">
          <h2 className="text-sm font-medium text-ink">Not scheduled</h2>
          <ul className="mt-2 space-y-1">
            {unscheduled.map((r) => (
              <li key={r.id}>
                <Link href={`/projects/${r.id}/edit`} className="text-navy hover:underline">
                  {r.name}
                </Link>{" "}
                <span className="text-slate">— add a start or due date {r.due ? `(due ${fmtDate(r.due)})` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
