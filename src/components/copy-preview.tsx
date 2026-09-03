import type { Version } from "@/lib/db/schema";
import { copyBodyClass } from "@/lib/copy-styles";
import { cn } from "@/lib/utils";

/** Renders a copy version like a printed page / email. HTML was sanitised on save, so it is safe to inject. */
export function CopyPreview({ version, className }: { version: Version; className?: string }) {
  const isEmail = !!version.emailSubject || !!version.emailFromName;
  return (
    <div className={className}>
      <article className="mx-auto max-w-2xl rounded-md bg-white px-6 py-8 shadow-sm ring-1 ring-line sm:px-10 sm:py-10">
        {isEmail ? (
          <header className="hairline-b border-line mb-6 pb-4 text-sm">
            {version.emailFromName ? (
              <p className="text-slate">
                From: <span className="text-ink">{version.emailFromName}</span>
              </p>
            ) : null}
            {version.emailSubject ? (
              <p className="mt-1 text-slate">
                Subject: <span className="font-medium text-ink">{version.emailSubject}</span>
              </p>
            ) : null}
          </header>
        ) : null}
        <div
          className={cn("copy-body", copyBodyClass)}
          dangerouslySetInnerHTML={{ __html: version.emailHtml ?? "" }}
        />
      </article>
    </div>
  );
}
