import "server-only";
import { and, desc, eq, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activity,
  approvals,
  comments,
  items,
  projects,

  users,
  versions,
  type Approval,
  type Comment,
  type Item,
  type Project,
  type ProjectStatus,
  type ReviewRound,
  type User,
  type Version,
} from "@/lib/db/schema";
import { deriveProjectStatus, MANUAL_STATUSES } from "@/lib/status";

// Team ---------------------------------------------------------------------

export async function listTeamMembers(): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(or(eq(users.role, "owner"), eq(users.role, "designer")))
    .orderBy(users.role, users.email);
}

export async function listOwners(): Promise<User[]> {
  return db.select().from(users).where(eq(users.role, "owner"));
}

export async function listPastApproverEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.role, "approver"))
    .orderBy(users.email);
  return rows.map((r) => r.email);
}

// Dashboard ----------------------------------------------------------------

export type DashboardThumb = {
  itemId: string;
  title: string;
  version: { id: string; mime: string | null; previewUrl: string | null; emailHtml: string | null; emailSubject: string | null; fileName: string | null } | null;
};

export type DashboardRow = {
  project: Project;
  designer: User | null;
  status: ProjectStatus;
  thumbs: DashboardThumb[];
  /** Approvals on current (non-superseded) rounds across all items. */
  approved: number;
  total: number;
  itemCount: number;
  lastActivityAt: Date | null;
  overdueDays: number;
  /** Earliest open round due date across items. */
  nextRoundDueAt: Date | null;
};

export type DashboardFilter = "all" | "mine" | "in_review" | "overdue" | "archived";

export async function listDashboard(filter: DashboardFilter, currentUserId: string, q = ""): Promise<DashboardRow[]> {
  const archived = filter === "archived";
  const rows = await db.query.projects.findMany({
    where: archived ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt),
    with: {
      designer: true,
      items: {
        with: {
          versions: {
            orderBy: desc(versions.number),
            limit: 1,
            with: { round: { with: { approvals: true } } },
          },
        },
      },
    },
    orderBy: [sql`${projects.dueDate} asc nulls last`, desc(projects.createdAt)],
  });

  const ids = rows.map((r) => r.id);
  const lastActivity = ids.length
    ? await db
        .select({ projectId: activity.projectId, last: sql<Date>`max(${activity.createdAt})` })
        .from(activity)
        .where(inArray(activity.projectId, ids))
        .groupBy(activity.projectId)
    : [];
  const lastMap = new Map(lastActivity.map((a) => [a.projectId, new Date(a.last)]));

  const needle = q.trim().toLowerCase();
  const matching = needle
    ? rows.filter((p) => p.name.toLowerCase().includes(needle) || (p.description ?? "").toLowerCase().includes(needle) || p.items.some((it) => it.title.toLowerCase().includes(needle)))
    : rows;

  const now = new Date();
  const out: DashboardRow[] = matching.map((p) => {
    const snapshots = p.items.map((it) => {
      const v = it.versions[0];
      return { hasVersion: !!v, latestRound: v?.round?.status ?? null };
    });
    const status = deriveProjectStatus(p, snapshots, now);
    let approved = 0;
    let total = 0;
    let nextDue: Date | null = null;
    for (const it of p.items) {
      const round = it.versions[0]?.round;
      if (!round || round.status === "superseded") continue;
      total += round.approvals.length;
      approved += round.approvals.filter((a) => a.status === "approved").length;
      if (round.status === "pending" || round.status === "changes_requested") {
        if (!nextDue || round.dueAt < nextDue) nextDue = round.dueAt;
      }
    }
    const due = p.dueDate ? new Date(`${p.dueDate}T00:00:00`) : null;
    const isOpen = !MANUAL_STATUSES.includes(status) && status !== "approved";
    const overdueDays = due && isOpen ? Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000)) : 0;
    const { items: _items, designer, ...project } = p;
    void _items;
    const thumbs: DashboardThumb[] = p.items.map((it) => {
      const v = it.versions[0];
      return {
        itemId: it.id,
        title: it.title,
        version: v ? { id: v.id, mime: v.mime, previewUrl: v.previewUrl, emailHtml: v.emailHtml, emailSubject: v.emailSubject, fileName: v.fileName } : null,
      };
    });
    return {
      project: project as Project,
      designer: designer ?? null,
      status,
      thumbs,
      approved,
      total,
      itemCount: p.items.length,
      lastActivityAt: lastMap.get(p.id) ?? null,
      overdueDays,
      nextRoundDueAt: nextDue,
    };
  });

  switch (filter) {
    case "mine":
      return out.filter((r) => r.project.designerId === currentUserId || r.project.createdBy === currentUserId);
    case "in_review":
      return out.filter((r) => r.status === "in_review" || r.status === "changes_requested");
    case "overdue":
      return out.filter((r) => r.overdueDays > 0 || (r.nextRoundDueAt != null && r.nextRoundDueAt < now));
    default:
      return out;
  }
}

// Project ------------------------------------------------------------------

export type ItemSummary = Item & {
  latestVersion: (Version & { uploader: User; round: (ReviewRound & { approvals: Approval[] }) | null }) | null;
  versionCount: number;
};

export type ProjectDetail = {
  project: Project;
  designer: User | null;
  creator: User;
  status: ProjectStatus;
  items: ItemSummary[];
  activity: (typeof activity.$inferSelect & { actor: User | null })[];
};

export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  const p = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      designer: true,
      creator: true,
      items: {
        orderBy: items.createdAt,
        with: {
          versions: {
            orderBy: desc(versions.number),
            with: { uploader: true, round: { with: { approvals: true } } },
          },
        },
      },
      activity: { orderBy: desc(activity.createdAt), limit: 50, with: { actor: true } },
    },
  });
  if (!p) return null;
  const summaries: ItemSummary[] = p.items.map((it) => {
    const { versions: vs, ...rest } = it;
    return { ...rest, latestVersion: vs[0] ?? null, versionCount: vs.length };
  });
  const status = deriveProjectStatus(
    p,
    summaries.map((s) => ({ hasVersion: !!s.latestVersion, latestRound: s.latestVersion?.round?.status ?? null })),
  );
  const { items: _i, activity: act, designer, creator, ...project } = p;
  void _i;
  return { project: project as Project, designer: designer ?? null, creator, status, items: summaries, activity: act };
}

/** Recomputes and stores the derived status unless a manual status is set. */
export async function refreshProjectStatus(projectId: string) {
  const detail = await getProjectDetail(projectId);
  if (!detail) return;
  if (MANUAL_STATUSES.includes(detail.project.status)) return;
  if (detail.project.status !== detail.status) {
    await db.update(projects).set({ status: detail.status }).where(eq(projects.id, projectId));
  }
}

// Item ---------------------------------------------------------------------

export type ApprovalWithUser = Approval & { user: User; comments: Comment[] };
export type RoundDetail = ReviewRound & { approvals: ApprovalWithUser[] };
export type VersionDetail = Version & {
  uploader: User;
  round: RoundDetail | null;
  comments: (Comment & { author: User | null })[];
};

export type ItemDetail = {
  item: Item;
  project: Project;
  versions: VersionDetail[]; // newest first
  current: VersionDetail | null;
  activity: (typeof activity.$inferSelect & { actor: User | null })[];
};

export async function getItemDetail(id: string): Promise<ItemDetail | null> {
  const it = await db.query.items.findFirst({
    where: eq(items.id, id),
    with: {
      project: true,
      versions: {
        orderBy: desc(versions.number),
        with: {
          uploader: true,
          round: { with: { approvals: { with: { user: true, comments: true }, orderBy: [approvals.createdAt, approvals.id] } } },
          comments: { with: { author: true }, orderBy: comments.createdAt },
        },
      },
    },
  });
  if (!it) return null;
  const act = await db.query.activity.findMany({
    where: eq(activity.itemId, id),
    orderBy: desc(activity.createdAt),
    limit: 100,
    with: { actor: true },
  });
  const { project, versions: vs, ...item } = it;
  const list = vs as VersionDetail[];
  return { item: item as Item, project, versions: list, current: list[0] ?? null, activity: act };
}

/** Approval row for the given token hash, with everything the review page needs. */
export async function getApprovalByTokenHash(tokenHash: string) {
  return db.query.approvals.findFirst({
    where: eq(approvals.tokenHash, tokenHash),
    with: {
      user: true,
      round: { with: { version: { with: { item: true } } } },
    },
  });
}

/** The current user's approval on the item's newest round, if any. */
export async function getMyApprovalForItem(itemId: string, userId: string) {
  const detail = await getItemDetail(itemId);
  const round = detail?.current?.round;
  if (!round) return null;
  return round.approvals.find((a) => a.userId === userId) ?? null;
}

/** Who should be told about decisions: owners, the designer, and the uploader. */
export async function teamRecipientsForVersion(projectId: string, uploaderId: string): Promise<User[]> {
  const [p] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const ids = new Set<string>([uploaderId]);
  if (p?.designerId) ids.add(p.designerId);
  if (p?.createdBy) ids.add(p.createdBy);
  const owners = await listOwners();
  for (const o of owners) ids.add(o.id);
  return db.select().from(users).where(and(inArray(users.id, [...ids])));
}

// Timeline -----------------------------------------------------------------

export async function listTimelineProjects(includeArchived = false) {
  const rows = await db.query.projects.findMany({
    where: includeArchived ? undefined : isNull(projects.archivedAt),
    with: {
      designer: true,
      items: { with: { versions: { with: { round: true }, orderBy: versions.number } } },
    },
    orderBy: [sql`${projects.startDate} asc nulls last`, projects.name],
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    designer: p.designer ? (p.designer.name?.trim() || p.designer.email) : null,
    startDate: p.startDate,
    dueDate: p.dueDate,
    plannedRounds: p.plannedRounds,
    reviewWindowDays: p.reviewWindowDays,
    revisionDays: p.revisionDays,
    rounds: p.items.flatMap((it) =>
      it.versions
        .filter((v) => v.round)
        .map((v) => ({ versionNumber: v.number, sentAt: v.round!.sentAt, dueAt: v.round!.dueAt, completedAt: v.round!.completedAt, status: v.round!.status })),
    ),
  }));
}
