import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { Button } from "@/components/ui/button";
import type { SessionInfo } from "@/lib/auth/session";
import { displayName } from "@/lib/format";
import { NavLinks } from "./nav-links";

export function AppShell({ session, children }: { session: SessionInfo; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="hairline-b border-line bg-white">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo size={52} />
            <span className="hidden text-sm font-medium text-ink sm:inline">Approval Hub</span>
          </div>
          <NavLinks isOwner={session.isOwner} />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate md:inline" title={session.user.email}>
              {displayName(session.user)}
            </span>
            <form action="/auth/sign-out" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="py-6 text-center text-xs text-muted-ink">
        <Link href="/" className="hover:text-slate">
          Approval Hub
        </Link>{" "}
        · United Heritage Insurance
      </footer>
    </div>
  );
}
