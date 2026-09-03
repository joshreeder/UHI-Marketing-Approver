import Link from "next/link";
import { cn } from "@/lib/utils";
import { htmlToText } from "@/lib/copy";

type ThumbVersion = { id: string; mime: string | null; previewUrl: string | null; emailHtml: string | null; emailSubject: string | null; fileName: string | null } | null;

/** Small tile for a piece's latest version: rendered thumbnail, a text snippet for copy, or a format badge. */
export function VersionThumb({ version, title, href, size = "sm", className }: { version: ThumbVersion; title: string; href?: string; size?: "sm" | "md"; className?: string }) {
  const dims = size === "sm" ? "h-12 w-9" : "h-24 w-[72px]";
  let inner: React.ReactNode;
  if (!version) {
    inner = <span className="text-[9px] text-muted-ink">—</span>;
  } else if (version.previewUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    inner = <img src={`/api/files/${version.id}?thumb=1`} alt="" className="h-full w-full object-cover object-top" loading="lazy" />;
  } else if (version.emailHtml) {
    const text = version.emailSubject || htmlToText(version.emailHtml);
    inner = (
      <span className={cn("block overflow-hidden p-1 text-left leading-tight text-ink", size === "sm" ? "text-[6px]" : "text-[8px]")}>
        {text.slice(0, size === "sm" ? 60 : 160)}
      </span>
    );
  } else {
    const badge = version.mime?.includes("wordprocessingml") ? "DOC" : version.mime?.includes("presentationml") ? "PPT" : version.mime === "application/pdf" ? "PDF" : version.mime?.startsWith("image/") ? "IMG" : "FILE";
    inner = <span className={cn("font-medium text-slate", size === "sm" ? "text-[9px]" : "text-xs")}>{badge}</span>;
  }
  const tile = (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-white ring-1 ring-line", dims, className)} title={title}>
      {inner}
    </span>
  );
  return href ? (
    <Link href={href} className="shrink-0">
      {tile}
    </Link>
  ) : (
    tile
  );
}
