import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ActivityFeed } from "@/components/activity-feed";
import { ProjectIntake } from "@/components/project-intake";
import { QuickDrop } from "@/components/quick-drop";
import { VersionThumb } from "@/components/version-thumb";
import { ScheduleBar } from "@/components/schedule-bar";
import { OverduePill, RoundPill, StatusPill } from "@/components/status-pill";
import { requireTeam } from "@/lib/auth/session";
import { getProjectDetail } from "@/lib/queries";
import { daysOverdue, displayName, fmtDate, fmtDateTime } from "@/lib/format";
import { MANUAL_STATUSES } from "@/lib/status";
import { archiveProject, setProjectStatus } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getProjectDetail(id);
  return { title: d?.project.name ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeam();
  const { id } = await params;
  const detail = await getProjectDetail(id);
  if (!detail) notFound();
  const { project, designer, status, items, activity } = detail;
  const overdue = !MANUAL_STATUSES.includes(status) && status !== "approved" ? Math.max(0, daysOverdue(project.dueDate) ?? 0) : 0;
  const isManual = MANUAL_STATUSES.includes(project.status);
  const statusAction = setProjectStatus.bind(null, project.id);
  const archiveAction = archiveProject.bind(null, project.id);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/" className="hover:text-ink">
            ← Projects
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {project.name}
            <StatusPill status={status} />
            <OverduePill days={overdue} />
            {project.archivedAt ? <span className="pill pill-not-started">Archived</span> : null}
          </span>
        }
        description={project.description}
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link href={`/projects/${project.id}/edit`} />}>
              Edit
            </Button>
            {project.status !== "done" ? (
              <form action={statusAction}>
                <input type="hidden" name="status" value="done" />
                <Button type="submit">Mark complete</Button>
              </form>
            ) : (
              <form action={statusAction}>
                <input type="hidden" name="status" value="active" />
                <Button type="submit" variant="outline">
                  Reopen
                </Button>
              </form>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {items.length === 0 ? (
            <ProjectIntake projectId={project.id} projectName={project.name} />
          ) : (
            <section className="space-y-3">
              {items.map((it) => {
                const v = it.latestVersion;
                const round = v?.round;
                const approved = round?.approvals.filter((a) => a.status === "approved").length ?? 0;
                const total = round?.approvals.length ?? 0;
                const roundOverdue = round && (round.status === "pending" || round.status === "changes_requested") && round.dueAt < new Date();
                return (
                  <div key={it.id} className="rounded-xl border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start gap-4">
                      <VersionThumb version={v} title={it.title} href={`/items/${it.id}`} size="md" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/items/${it.id}`} className="font-medium text-ink hover:text-navy">
                          {it.title}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate">
                          {v ? `v${v.number} · ${fmtDate(v.createdAt)} · ${displayName(v.uploader)}` : "Nothing uploaded yet"}
                          {it.versionCount > 1 ? ` · ${it.versionCount} versions` : ""}
                          {v?.note ? ` — ${v.note}` : ""}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate">
                          {round ? (
                            <>
                              <RoundPill status={round.status} />
                              {total > 0 ? <span>{approved}/{total} approved</span> : null}
                              {roundOverdue ? <span className="text-brand-red">due {fmtDate(round.dueAt)}</span> : null}
                            </>
                          ) : v ? (
                            <>
                              <span className="pill pill-not-started">Not sent</span>
                              <Link href={`/items/${it.id}`} className="text-navy hover:underline">
                                Send for approval →
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="w-full sm:w-64">
                        <QuickDrop
                          target={{ kind: "item", itemId: it.id }}
                          nextNumber={(v?.number ?? 0) + 1}
                          willResend={!!round && round.status !== "superseded"}
                          label={v ? `Drop v${v.number + 1} of ${it.title}` : `Drop the file for ${it.title}`}
                          hint={round && round.status !== "superseded" ? "Re-sends to the current approvers" : undefined}
                          goToItem={!v}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <QuickDrop
                target={{ kind: "new-item", projectId: project.id }}
                nextNumber={1}
                label="Add another piece to this project"
                hint="Drop a file to start a new piece (named after the file)"
                copyLabel="or start one by writing copy"
                size="large"
                goToItem
              />
            </section>
          )}

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-medium text-ink">Planned schedule</h2>
            <div className="mt-3">
              <ScheduleBar input={project} />
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="mb-2 text-sm font-medium text-ink">Activity</h2>
            <ActivityFeed rows={activity} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-line bg-white p-5 text-sm">
            <h2 className="text-sm font-medium text-ink">Details</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate">Designer</dt>
              <dd className="text-ink">{designer ? displayName(designer) : "Unassigned"}</dd>
              <dt className="text-slate">Start</dt>
              <dd className="text-ink">{fmtDate(project.startDate)}</dd>
              <dt className="text-slate">Due</dt>
              <dd className={overdue > 0 ? "text-brand-red font-medium" : "text-ink"}>{fmtDate(project.dueDate)}</dd>
              <dt className="text-slate">Estimate</dt>
              <dd className="text-ink">{project.estHours ? `${project.estHours} h` : "—"}</dd>
              <dt className="text-slate">Plan</dt>
              <dd className="text-ink">
                {project.plannedRounds} rounds · {project.reviewWindowDays}d review · {project.revisionDays}d revise
              </dd>
              <dt className="text-slate">Created</dt>
              <dd className="text-ink">
                {fmtDateTime(project.createdAt)} by {displayName(detail.creator)}
              </dd>
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-medium text-ink">Status</h2>
            <p className="mt-1 text-xs text-slate">
              {isManual ? "Set manually. Choose Active to let the app derive it again." : "Derived from review rounds. Override when needed."}
            </p>
            <form action={statusAction} className="mt-3 flex gap-2">
              <select
                name="status"
                defaultValue={isManual ? project.status : "active"}
                className="h-8 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="active">Active (derived)</option>
                <option value="on_hold">On hold</option>
                <option value="cancelled">Cancelled</option>
                <option value="done">Done</option>
              </select>
              <Button type="submit" variant="outline" size="default">
                Apply
              </Button>
            </form>
            <form action={archiveAction} className="mt-4">
              {project.archivedAt ? <input type="hidden" name="unarchive" value="1" /> : null}
              <Button type="submit" variant="ghost" size="sm" className="w-full">
                {project.archivedAt ? "Restore from archive" : "Archive project"}
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
