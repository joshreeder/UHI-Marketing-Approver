import Image from "next/image";
import type { Version } from "@/lib/db/schema";
import { copyBodyClass } from "@/lib/copy-styles";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type LetterInfo = { companyName: string; addressLine: string; contactLine: string };
const DEFAULT_LETTER: LetterInfo = { companyName: "United Heritage Insurance", addressLine: "", contactLine: "" };

/**
 * Renders a copy version. Email layout: From / Subject header. Letter layout: a US-Letter page on the
 * letterhead (logo, company line, footer from Settings) so the team sees roughly what the Word download
 * will look like without opening Word. HTML was sanitised on save, so it is safe to inject.
 */
export function CopyPreview({ version, letter = DEFAULT_LETTER, className }: { version: Version; letter?: LetterInfo; className?: string }) {
  if (version.copyLayout === "letter") {
    return (
      <div className={className}>
        <article
          className="mx-auto flex w-full max-w-[816px] flex-col bg-white shadow-md ring-1 ring-line"
          style={{ aspectRatio: "8.5 / 11", minHeight: 0 }}
        >
          <header className="flex items-start justify-between gap-6 px-[8%] pt-[6%]">
            <Image src="/brand/united-heritage-logo.png" alt="" width={144} height={120} className="h-auto w-[18%] max-w-[144px]" />
            <div className="text-right text-[0.8em] leading-snug text-slate">
              <div className="font-medium text-navy">{letter.companyName}</div>
              {letter.addressLine ? <div>{letter.addressLine}</div> : null}
              {letter.contactLine ? <div>{letter.contactLine}</div> : null}
            </div>
          </header>
          <div className="mx-[8%] mt-[3%] border-t-2 border-navy" />
          <div className="flex-1 overflow-auto px-[8%] py-[4%]">
            <p className="mb-6 text-sm text-slate">{fmtDate(version.createdAt)}</p>
            {version.emailSubject ? <h1 className="mb-4 text-lg font-medium text-ink">{version.emailSubject}</h1> : null}
            <div className={cn("copy-body", copyBodyClass)} dangerouslySetInnerHTML={{ __html: version.emailHtml ?? "" }} />
            {version.emailFromName ? (
              <p className="mt-8 text-[15px] text-ink">
                Sincerely,
                <br />
                <span className="mt-6 inline-block font-medium">{version.emailFromName}</span>
              </p>
            ) : null}
          </div>
          <footer className="hairline-t border-line mx-[8%] mb-[4%] pt-2 text-center text-[0.7em] text-slate">
            {[letter.companyName, letter.addressLine, letter.contactLine].filter(Boolean).join(" · ")}
          </footer>
        </article>
        <p className="mt-2 text-center text-xs text-slate">Letter preview. The Word download places this text on the real letterhead from Settings.</p>
      </div>
    );
  }

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
        <div className={cn("copy-body", copyBodyClass)} dangerouslySetInnerHTML={{ __html: version.emailHtml ?? "" }} />
      </article>
    </div>
  );
}
