import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { consumeTeamSignInToken } from "@/lib/auth/magic-link";
import { createSession, isTeamRole, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { env } from "@/lib/env";

/** Consumes the single-use token (POST only, so link scanners cannot trigger it) and starts the session. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get("token");
  const fail = NextResponse.redirect(`${env.APP_URL}/sign-in?error=expired`, { status: 303 });
  if (typeof token !== "string" || !token) return fail;

  const email = await consumeTeamSignInToken(token);
  if (!email) return fail;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !isTeamRole(user.role)) return fail;

  const { token: sessionToken, expiresAt } = await createSession(user.id, null);
  const res = NextResponse.redirect(`${env.APP_URL}/`, { status: 303 });
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(expiresAt));
  return res;
}

export async function GET() {
  return NextResponse.redirect(`${env.APP_URL}/sign-in`, { status: 303 });
}
