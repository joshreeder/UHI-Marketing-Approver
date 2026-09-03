import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { OverduePill, StatusPill } from "@/components/status-pill";
import { VersionThumb } from "@/components/version-thumb";
import { requireTeam } from "@/lib/auth/session";
import { listDashboard, type DashboardFilter } from "@/lib/queries";
import { displayName, fmtDate, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const FILTERS: { key: DashboardFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "Mine" },
  { key: "in_review", label: "In review" },
  { key: "overdue", label: "Overdue" },
  { key: "archived", label: "Archived" },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string; error?: string; q?: string }> }) {
  const session = await requireTeam();
  const sp = await searchParams;
  const filter = (FILTERS.some((f) => f.key === sp.filter) ? sp.filter : "all") as DashboardFilter;
  const q = sp.q ?? "";
  const rows = await listDashboard(filter, session.user.id, q);

  return (
    <>
      <PageHeader
        title={filter === "archived" ? "Archive" : "Projects"}
        description={filter === "archived" ? "Completed and archived projects. Still searchable, out of the way." : "Every marketing piece: one home, one current version, a clear yes or no."}
        actions={
          <Button nativeButton={false} render={<Link href="/projects/new" />}>New project</Button>
        }
      />

      {sp.error === "owner-only" ? (
        <p className="mb-4 rounded-md bg-brand-red-tint px-3 py-2 text-sm text-brand-red">Only the owner can open Settings.</p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`${f.key === "all" ? "/" : `/?filter=${f.key}`}${q ? `${f.key === "all" ? "?" : "&"}q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              f.key === filter ? "bg-white text-ink font-medium shadow-sm ring-1 ring-line" : "text-slate hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
        <form className="ml-auto flex items-center gap-1" action="/">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search projects and items"
            className="h-8 w-56 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={q ? `No matches for “${q}”` : filter === "all" ? "No projects yet" : "Nothing here"}
          description={q ? "Try another word, or clear the search." : filter === "all" ? "Create a project to start tracking a marketing piece." : "Try a different filter."}
          action={filter === "all" && !q ? <Button nativeButton={false} render={<Link href="/projects/new" />}>New project</Button> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="hairline-b border-line text-left text-xs text-slate">
                <th className="px-4 py-2.5 font-medium">Project</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Designer</th>
                <th className="px-4 py-2.5 font-medium">Due</th>
                <th className="px-4 py-2.5 font-medium">Progress</th>
                <th className="px-4 py-2.5 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.project.id} className="hairline-b border-line last:border-b-0 hover:bg-canvas/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex shrink-0 items-center gap-1">
                        {r.thumbs.length === 0 ? (
                          <VersionThumb version={null} title="Nothing uploaded yet" href={`/projects/${r.project.id}`} />
                        ) : (
                          r.thumbs.slice(0, 3).map((t) => <VersionThumb key={t.itemId} version={t.version} title={t.title} href={`/items/${t.itemId}`} />)
                        )}
                        {r.thumbs.length > 3 ? <span className="text-[10px] text-slate">+{r.thumbs.length - 3}</span> : null}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/projects/${r.project.id}`} className="font-medium text-ink hover:text-navy">
                          {r.project.name}
                        </Link>
                        <div className="text-xs text-slate">
                          {r.itemCount === 0 ? "Nothing uploaded yet" : r.itemCount === 1 ? r.thumbs[0]?.title : `${r.itemCount} pieces`}
                          {r.project.estHours ? ` · ${r.project.estHours} h est.` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusPill status={r.status} />
                      <OverduePill days={r.overdueDays} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate">{r.designer ? displayName(r.designer) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className={cn(r.overdueDays > 0 && "text-brand-red font-medium")}>{fmtDate(r.project.dueDate)}</div>
                    {r.nextRoundDueAt ? (
                      <div className={cn("text-xs", r.nextRoundDueAt < new Date() ? "text-brand-red" : "text-slate")}>
                        Review due {fmtDate(r.nextRoundDueAt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {r.total > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-canvas">
                          <div className="h-full rounded-full bg-[var(--status-approved)]" style={{ width: `${(r.approved / r.total) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate">
                          {r.approved}/{r.total} approved
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-ink">Not sent</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate">{fmtRelative(r.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
