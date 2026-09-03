import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export const appSettingsSchema = z.object({
  defaults: z.object({
    reviewWindowDays: z.number().int().min(1).max(60).default(3),
    plannedRounds: z.number().int().min(1).max(20).default(3),
    revisionDays: z.number().int().min(0).max(60).default(2),
  }),
  reminders: z.object({
    halfwayEnabled: z.boolean().default(true),
    dueDateEnabled: z.boolean().default(true),
  }),
  autoCompleteOnApproval: z.boolean().default(false),
  /** Text printed on the on-screen letterhead page (the Word download uses the real letterhead file). */
  letter: z
    .object({
      companyName: z.string().max(120).default("United Heritage Insurance"),
      addressLine: z.string().max(200).default(""),
      contactLine: z.string().max(200).default(""),
    })
    .default({ companyName: "United Heritage Insurance", addressLine: "", contactLine: "" }),
  /** Word letterhead (.docx) used when copy versions are downloaded as Word documents. */
  letterhead: z
    .object({
      url: z.string().url(),
      fileName: z.string().min(1).max(300),
      size: z.number().int().nonnegative(),
      uploadedAt: z.string(),
    })
    .nullable()
    .default(null),
});

export type Letterhead = NonNullable<AppSettings["letterhead"]>;

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = appSettingsSchema.parse({
  defaults: {},
  reminders: {},
});

const KEY = "app";

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const parsed = appSettingsSchema.safeParse(rows[0]?.value ?? {});
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(next: AppSettings) {
  await db
    .insert(settings)
    .values({ key: KEY, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: next, updatedAt: new Date() } });
}
