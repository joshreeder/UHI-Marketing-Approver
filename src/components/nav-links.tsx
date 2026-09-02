"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Dashboard", active: pathname === "/" || pathname.startsWith("/projects") || pathname.startsWith("/items") },
    { href: "/?filter=archived", label: "Archive", active: false },
    ...(isOwner ? [{ href: "/settings", label: "Settings", active: pathname.startsWith("/settings") }] : []),
    { href: "/help", label: "Help", active: pathname.startsWith("/help") },
  ];
  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            l.active ? "bg-navy-tint text-navy-deep font-medium" : "text-slate hover:bg-canvas hover:text-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
