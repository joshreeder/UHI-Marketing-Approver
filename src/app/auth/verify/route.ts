import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { consumeTeamSignInToken } from "@/lib/auth/magic-link";
import { createSession, isTeamRole, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const fail = NextResponse.redirect(`${env.APP_URL}/sign-in?error=expired`);
  if (!token) return fail;

  const email = await consumeTeamSignInToken(token);
  if (!email) return fail;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !isTeamRole(user.role)) return fail;

  const { token: sessionToken, expiresAt } = await createSession(user.id, null);
  const res = NextResponse.redirect(`${env.APP_URL}/`);
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(expiresAt));
  return res;
}
