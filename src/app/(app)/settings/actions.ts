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
  });
  if (!parsed.success) return { error: "Check the numbers: review window 1–60, rounds 1–20, revision 0–60." };
  await saveSettings({ ...current, ...parsed.data });
  revalidatePath("/settings");
  revalidatePath("/projects/new");
  return { success: "Settings saved." };
}
