"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isTeamRole } from "@/lib/auth/session";
import { createTeamSignInLink, tooManyRecentLinks } from "@/lib/auth/magic-link";
import { sendEmail } from "@/lib/email/send";
import { SignInEmail } from "@/lib/email/templates";

export type SignInState = { ok: boolean; message?: string; email?: string };

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function requestSignInLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
  const { email } = parsed.data;

  if (await tooManyRecentLinks(email)) {
    return { ok: false, message: "Too many sign-in links requested. Check your inbox or try again in 15 minutes." };
  }

  // Bootstrap: if no team member exists yet, the first person to sign in becomes the owner.
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let user = existing[0];
  if (!user || !isTeamRole(user.role)) {
    const team = await db.select({ id: users.id }).from(users).where(eq(users.role, "owner")).limit(1);
    if (team.length === 0) {
      if (user) {
        await db.update(users).set({ role: "owner" }).where(eq(users.id, user.id));
      } else {
        [user] = await db.insert(users).values({ email, role: "owner" }).returning();
      }
    } else {
      // Do not reveal who is on the team; the response looks the same either way.
      return { ok: true, email };
    }
  }

  const url = await createTeamSignInLink(email);
  const result = await sendEmail({ to: email, subject: "Your Approval Hub sign-in link", react: SignInEmail({ url }) });
  if (!result.ok) return { ok: false, message: `Could not send email: ${result.error}` };
  return { ok: true, email };
}
