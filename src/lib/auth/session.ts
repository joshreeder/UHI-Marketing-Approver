import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "ah_session";
const SESSION_DAYS = 30;

export type SessionInfo = {
  sessionId: string;
  user: User;
  /** Non-null for approver link sessions; restricts access to one item. */
  scopeItemId: string | null;
  isTeam: boolean;
  isOwner: boolean;
};

export function isTeamRole(role: User["role"]): boolean {
  return role === "owner" || role === "designer";
}

/** Creates a session row and returns the raw token to put in the cookie. */
export async function createSession(userId: string, scopeItemId: string | null = null) {
  const token = generateToken();
  const expiresAt = addDays(new Date(), SESSION_DAYS);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt, scopeItemId });
  return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

/** Reads the session cookie and resolves the current user. Cached per request. */
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(raw)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const team = isTeamRole(row.user.role) && row.session.scopeItemId == null;
  return {
    sessionId: row.session.id,
    user: row.user,
    scopeItemId: row.session.scopeItemId,
    isTeam: team,
    isOwner: team && row.user.role === "owner",
  };
});

/** Redirects to sign-in unless the current session is an unscoped team session. */
export async function requireTeam(): Promise<SessionInfo> {
  const s = await getSession();
  if (!s || !s.isTeam) redirect("/sign-in");
  return s;
}

export async function requireOwner(): Promise<SessionInfo> {
  const s = await requireTeam();
  if (!s.isOwner) redirect("/?error=owner-only");
  return s;
}

/**
 * True when the session may read the given item: team sessions see everything,
 * approver sessions only their scoped item.
 */
export function canAccessItem(s: SessionInfo | null, itemId: string): boolean {
  if (!s) return false;
  if (s.isTeam) return true;
  return s.scopeItemId === itemId;
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(raw)));
  }
  jar.delete(SESSION_COOKIE);
}
