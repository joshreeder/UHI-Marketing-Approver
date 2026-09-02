import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand-logo";
import { ResendLinkForm } from "./resend-form";

export const metadata: Metadata = { title: "Link expired" };

export default async function ExpiredPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <BrandLogo href={null} size={64} />
        </div>
        <h1 className="mt-6 text-center text-lg text-ink">This link has expired</h1>
        <p className="mt-1 text-center text-sm text-slate">
          {item
            ? "Enter your email and we will send you a fresh link to the current version."
            : "It may have been replaced by a newer version. Check your inbox for the latest email from Approval Hub."}
        </p>
        {item ? (
          <div className="mt-6">
            <ResendLinkForm itemId={item} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
