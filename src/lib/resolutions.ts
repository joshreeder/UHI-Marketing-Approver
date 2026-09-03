/** Turning approver comments into a checklist when the next version is uploaded. Pure helpers, shared by server and client. */

export type Resolution = "addressed" | "deferred" | "declined";

export type CommentResolution = { commentId: string; resolution: Resolution };

export type OpenComment = {
  id: string;
  body: string;
  author: string;
  versionNumber: number;
  pageNo: number | null;
  pinned: boolean;
};

export type ChangeSummary = { addressed: string[]; deferred: string[]; declined: string[] };

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  addressed: "Done",
  deferred: "Next version",
  declined: "Won't do",
};

export const RESOLUTION_CLASS: Record<Resolution, string> = {
  addressed: "text-[var(--status-approved)] bg-[var(--status-approved-bg)]",
  deferred: "text-[var(--status-in-review)] bg-[var(--status-in-review-bg)]",
  declined: "text-slate bg-canvas",
};

type CommentLike = {
  id: string;
  body: string;
  pageNo: number | null;
  x: number | null;
  resolution: string | null;
  addressedInVersionId: string | null;
  author: { name: string | null; email: string } | null;
};

/**
 * Comments still waiting on the designer: anything not marked done or declined. Deferred comments
 * stay open so they show up again on the following version.
 */
export function openCommentsFromVersions(versions: { number: number; comments: CommentLike[] }[]): OpenComment[] {
  const out: OpenComment[] = [];
  for (const v of [...versions].sort((a, b) => a.number - b.number)) {
    for (const c of v.comments) {
      const closed = c.resolution === "addressed" || c.resolution === "declined" || !!c.addressedInVersionId;
      if (closed) continue;
      out.push({
        id: c.id,
        body: c.body,
        author: c.author ? c.author.name?.trim() || c.author.email : "Approver",
        versionNumber: v.number,
        pageNo: c.pageNo,
        pinned: c.x != null,
      });
    }
  }
  return out;
}

export function summarizeResolutions(comments: { id: string; body: string }[], resolutions: CommentResolution[]): ChangeSummary {
  const byId = new Map(comments.map((c) => [c.id, c.body]));
  const s: ChangeSummary = { addressed: [], deferred: [], declined: [] };
  for (const r of resolutions) {
    const body = byId.get(r.commentId);
    if (body) s[r.resolution].push(body);
  }
  return s;
}

export function summaryIsEmpty(s: ChangeSummary | null | undefined): boolean {
  return !s || (s.addressed.length === 0 && s.deferred.length === 0 && s.declined.length === 0);
}
