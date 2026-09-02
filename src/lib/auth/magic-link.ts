import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { addMinutes } from "date-fns";
import { db } from "@/lib/db";
import { magicLinks } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { generateToken, hashToken } from "./tokens";

const TEAM_LINK_MINUTES = 15;

/** Creates a single-use team sign-in link. Returns the absolute URL to email. */
export async function createTeamSignInLink(email: string): Promise<string> {
  const token = generateToken();
  await db.insert(magicLinks).values({
    email: email.toLowerCase(),
    tokenHash: hashToken(token),
    purpose: "team_signin",
    expiresAt: addMinutes(new Date(), TEAM_LINK_MINUTES),
  });
  return `${env.APP_URL}/auth/verify?token=${encodeURIComponent(token)}`;
}

/** Consumes a team sign-in token. Returns the email when valid, otherwise null. */
export async function consumeTeamSignInToken(token: string): Promise<string | null> {
  const hash = hashToken(token);
  const rows = await db
    .select()
    .from(magicLinks)
    .where(
      and(
        eq(magicLinks.tokenHash, hash),
        eq(magicLinks.purpose, "team_signin"),
        isNull(magicLinks.usedAt),
        gt(magicLinks.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const link = rows[0];
  if (!link) return null;
  await db.update(magicLinks).set({ usedAt: new Date() }).where(eq(magicLinks.id, link.id));
  return link.email;
}

/** Simple per-email rate limit: at most 5 unexpired links at a time. */
export async function tooManyRecentLinks(email: string): Promise<boolean> {
  const rows = await db
    .select({ id: magicLinks.id })
    .from(magicLinks)
    .where(and(eq(magicLinks.email, email.toLowerCase()), gt(magicLinks.expiresAt, new Date())));
  return rows.length >= 5;
}
