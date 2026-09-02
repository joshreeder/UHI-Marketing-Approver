import { cn } from "@/lib/utils";

export function FormMessage({ message, tone = "error", className }: { message?: string | null; tone?: "error" | "success" | "info"; className?: string }) {
  if (!message) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        tone === "error" && "bg-brand-red-tint text-brand-red",
        tone === "success" && "bg-[var(--status-approved-bg)] text-[var(--status-approved)]",
        tone === "info" && "bg-navy-tint text-navy-deep",
        className,
      )}
    >
      {message}
    </p>
  );
}
