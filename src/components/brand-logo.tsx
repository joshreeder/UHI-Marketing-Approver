import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ href = "/", size = 44, className }: { href?: string | null; size?: number; className?: string }) {
  const img = (
    <Image
      src="/brand/united-heritage-logo.png"
      alt="United Heritage Insurance"
      width={Math.round(size * 1.5625)}
      height={size}
      priority
      className={cn("h-auto", className)}
      style={{ height: size, width: "auto" }}
    />
  );
  return href ? (
    <Link href={href} className="flex items-center" aria-label="Approval Hub home">
      {img}
    </Link>
  ) : (
    img
  );
}
