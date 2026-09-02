import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { BrandLogo } from "@/components/brand-logo";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const session = await getSession();
  if (session?.isTeam) redirect("/");
  const { error, next } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <BrandLogo href={null} size={64} />
        </div>
        <h1 className="mt-6 text-center text-lg text-ink">Sign in to Approval Hub</h1>
        <p className="mt-1 text-center text-sm text-slate">Enter your work email and we will send you a one-time link.</p>
        <div className="mt-6">
          <SignInForm
            next={next}
            initialError={
              error === "expired"
                ? "That sign-in link has expired or was already used. Request a new one."
                : error === "owner-only"
                  ? "Only the owner can open that page."
                  : undefined
            }
          />
        </div>
      </div>
      <p className="mt-6 text-xs text-muted-ink">Approvers: use the link in your email — no sign-in needed.</p>
    </div>
  );
}
