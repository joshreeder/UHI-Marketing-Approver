import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export async function POST() {
  await destroySession();
  return NextResponse.redirect(`${env.APP_URL}/sign-in`, { status: 303 });
}
