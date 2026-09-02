import type { Metadata } from "next";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { magicLinks } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

/**
 * Landing page for sign-in links. It only *looks at* the token; the click below is what consumes it.
 * Email security scanners (Microsoft Safe Links, Proofpoint, Mimecast) pre-fetch links with a GET,
 * which used to burn the single-use token before the person ever clicked.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let valid = false;
  if (token) {
    const rows = await db
      .select({ id: magicLinks.id })
      .from(magicLinks)
      .where(and(eq(magicLinks.tokenHash, hashToken(token)), eq(magicLinks.purpose, "team_signin"), isNull(magicLinks.usedAt), gt(magicLinks.expiresAt, new Date())))
      .limit(1);
    valid = rows.length > 0;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <BrandLogo href={null} size={64} />
        </div>
        {valid && token ? (
          <>
            <h1 className="mt-6 text-lg text-ink">You’re almost in</h1>
            <p className="mt-1 text-sm text-slate">Click below to finish signing in to Approval Hub.</p>
            <form action="/auth/verify/complete" method="post" className="mt-6">
              <input type="hidden" name="token" value={token} />
              <Button type="submit" className="w-full">
                Continue to Approval Hub
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-lg text-ink">This sign-in link has expired</h1>
            <p className="mt-1 text-sm text-slate">Links work once and expire after 15 minutes. Request a new one and try again.</p>
            <Button className="mt-6 w-full" nativeButton={false} render={<Link href="/sign-in" />}>
              Request a new link
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
