"use client";

import { ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Downloads a copy version as a Word document, on the letterhead when one is configured. */
export function DownloadWordMenu({ versionId, hasLetterhead, size = "xs", variant = "ghost" }: { versionId: string; hasLetterhead: boolean; size?: "xs" | "sm" | "default"; variant?: "ghost" | "outline" | "default" }) {
  const href = `/api/export/${versionId}`;
  if (!hasLetterhead) {
    return (
      <Button variant={variant} size={size} nativeButton={false} render={<a href={href} />}>
        <FileText className="size-3.5" />
        Download Word
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant={variant} size={size}>
            <FileText className="size-3.5" />
            Download Word
            <ChevronDown className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem render={<a href={href} />}>On letterhead</DropdownMenuItem>
        <DropdownMenuItem render={<a href={`${href}?letterhead=0`} />}>Plain document</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
