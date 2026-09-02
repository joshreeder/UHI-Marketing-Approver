"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { items, projects, type ProjectStatus } from "@/lib/db/schema";
import { requireTeam } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { refreshProjectStatus } from "@/lib/queries";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const optionalDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());
const optionalNumber = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).nullable());
const intField = (min: number, max: number) => z.preprocess((v) => Number(v), z.number().int().min(min).max(max));

const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Give the project a name.").max(200),
    description: z.string().trim().max(5000).optional().default(""),
    designerId: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()),
    startDate: optionalDate,
    dueDate: optionalDate,
    estHours: optionalNumber,
    plannedRounds: intField(0, 20),
    reviewWindowDays: intField(1, 60),
    revisionDays: intField(0, 60),
    firstItemTitle: z.string().trim().max(200).optional().default(""),
  })
  .refine((d) => !d.startDate || !d.dueDate || d.startDate <= d.dueDate, {
    message: "Due date must be on or after the start date.",
    path: ["dueDate"],
  });

function parseProject(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false as const, fieldErrors, error: "Check the highlighted fields." };
  }
  return { ok: true as const, data: parsed.data };
}

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireTeam();
  const parsed = parseProject(formData);
  if (!parsed.ok) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  const [project] = await db
    .insert(projects)
    .values({
      name: d.name,
      description: d.description || null,
      designerId: d.designerId,
      startDate: d.startDate,
      dueDate: d.dueDate,
      estHours: d.estHours,
      plannedRounds: d.plannedRounds,
      reviewWindowDays: d.reviewWindowDays,
      revisionDays: d.revisionDays,
      createdBy: session.user.id,
    })
    .returning();
  await logActivity({ projectId: project.id, actorId: session.user.id, type: "project_created" });

  let itemId: string | null = null;
  if (d.firstItemTitle) {
    const [item] = await db.insert(items).values({ projectId: project.id, title: d.firstItemTitle, type: "file" }).returning();
    itemId = item.id;
    await logActivity({ projectId: project.id, itemId: item.id, actorId: session.user.id, type: "item_created", meta: { title: item.title } });
  }
  await refreshProjectStatus(project.id);
  revalidatePath("/");
  redirect(itemId ? `/items/${itemId}` : `/projects/${project.id}`);
}

export async function updateProject(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireTeam();
  const parsed = parseProject(formData);
  if (!parsed.ok) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
  const d = parsed.data;
  await db
    .update(projects)
    .set({
      name: d.name,
      description: d.description || null,
      designerId: d.designerId,
      startDate: d.startDate,
      dueDate: d.dueDate,
      estHours: d.estHours,
      plannedRounds: d.plannedRounds,
      reviewWindowDays: d.reviewWindowDays,
      revisionDays: d.revisionDays,
    })
    .where(eq(projects.id, projectId));
  await logActivity({ projectId, actorId: session.user.id, type: "project_updated" });
  await refreshProjectStatus(projectId);
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

const manual = z.enum(["active", "done", "on_hold", "cancelled"]);

export async function setProjectStatus(projectId: string, formData: FormData) {
  const session = await requireTeam();
  const choice = manual.parse(formData.get("status"));
  if (choice === "active") {
    // Clear the manual override; derived status takes over.
    await db.update(projects).set({ status: "in_progress" }).where(eq(projects.id, projectId));
    await logActivity({ projectId, actorId: session.user.id, type: "project_status_changed", meta: { status: "active" } });
  } else {
    await db.update(projects).set({ status: choice as ProjectStatus }).where(eq(projects.id, projectId));
    await logActivity({ projectId, actorId: session.user.id, type: choice === "done" ? "project_completed" : "project_status_changed", meta: { status: choice } });
  }
  await refreshProjectStatus(projectId);
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}

export async function archiveProject(projectId: string, formData: FormData) {
  const session = await requireTeam();
  const unarchive = formData.get("unarchive") === "1";
  await db.update(projects).set({ archivedAt: unarchive ? null : new Date() }).where(eq(projects.id, projectId));
  if (!unarchive) await logActivity({ projectId, actorId: session.user.id, type: "project_archived" });
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(unarchive ? `/projects/${projectId}` : "/");
}

const itemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  reviewWindowDays: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).max(60).nullable()),
});

export async function addItem(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireTeam();
  const parsed = itemSchema.safeParse({ title: formData.get("title"), reviewWindowDays: formData.get("reviewWindowDays") });
  if (!parsed.success) return { error: "Give the item a title." };
  const [item] = await db
    .insert(items)
    .values({ projectId, title: parsed.data.title, type: "file", reviewWindowDays: parsed.data.reviewWindowDays })
    .returning();
  await logActivity({ projectId, itemId: item.id, actorId: session.user.id, type: "item_created", meta: { title: item.title } });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/items/${item.id}`);
}
