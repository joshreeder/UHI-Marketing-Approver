"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { appSettingsSchema, getSettings, saveSettings } from "@/lib/settings";

export type SettingsState = { error?: string; success?: string };

const memberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().max(120).optional().default(""),
  role: z.enum(["owner", "designer"]),
});

export async function addTeamMember(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireOwner();
  const parsed = memberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Enter a valid email and pick a role." };
  const d = parsed.data;
  await db
    .insert(users)
    .values({ email: d.email, name: d.name || null, role: d.role })
    .onConflictDoUpdate({ target: users.email, set: { role: d.role, ...(d.name ? { name: d.name } : {}) } });
  revalidatePath("/settings");
  return { success: `${d.email} added as ${d.role}.` };
}

export async function removeTeamMember(userId: string) {
  const session = await requireOwner();
  if (userId === session.user.id) return;
  // Keep the user row (history references it); drop them to approver so they lose team access.
  await db.update(users).set({ role: "approver" }).where(eq(users.id, userId));
  revalidatePath("/settings");
}

export async function saveDefaults(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireOwner();
  const current = await getSettings();
  const parsed = appSettingsSchema.safeParse({
    defaults: {
      reviewWindowDays: Number(formData.get("reviewWindowDays")),
      plannedRounds: Number(formData.get("plannedRounds")),
      revisionDays: Number(formData.get("revisionDays")),
    },
    reminders: {
      halfwayEnabled: formData.get("halfwayEnabled") === "on",
      dueDateEnabled: formData.get("dueDateEnabled") === "on",
    },
    autoCompleteOnApproval: formData.get("autoCompleteOnApproval") === "on",
    timeZone: String(formData.get("timeZone") ?? "").trim() || current.timeZone,
    letter: {
      companyName: String(formData.get("letterCompanyName") ?? "").trim() || "United Heritage Insurance",
      addressLine: String(formData.get("letterAddressLine") ?? "").trim(),
      contactLine: String(formData.get("letterContactLine") ?? "").trim(),
    },
    letterhead: current.letterhead,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the numbers: review window 1–60, rounds 1–20, revision 0–60." };
  await saveSettings({ ...current, ...parsed.data });
  revalidatePath("/settings");
  revalidatePath("/projects/new");
  return { success: "Settings saved." };
}

const letterheadSchema = z.object({
  url: z.string().url(),
  fileName: z.string().trim().min(1).max(300),
  size: z.number().int().nonnegative(),
});

/** Called after the browser has put the .docx letterhead in Blob storage. */
export async function saveLetterhead(input: z.input<typeof letterheadSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireOwner();
  const parsed = letterheadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Upload details were incomplete. Try again." };
  if (!parsed.data.fileName.toLowerCase().endsWith(".docx")) return { ok: false, error: "The letterhead must be a Word file (.docx)." };
  const current = await getSettings();
  await saveSettings({ ...current, letterhead: { ...parsed.data, uploadedAt: new Date().toISOString() } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeLetterhead(): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireOwner();
  const current = await getSettings();
  await saveSettings({ ...current, letterhead: null });
  revalidatePath("/settings");
  return { ok: true };
}
