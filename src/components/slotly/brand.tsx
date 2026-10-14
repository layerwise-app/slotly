import { Link } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

/** Stacked time slots with the middle one picked. Mirrors public/favicon.svg. */
export function SlotlyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="10" fill="#FFB224" />
      <rect x="7" y="7.5" width="18" height="4.5" rx="2.25" fill="#1F1300" opacity=".25" />
      <rect x="7" y="13.75" width="18" height="4.5" rx="2.25" fill="#1F1300" />
      <rect x="7" y="20" width="11" height="4.5" rx="2.25" fill="#1F1300" opacity=".25" />
    </svg>
  );
}

export function SlotlyLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      to="/"
      aria-label="Slotly home"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <SlotlyMark className="size-7" />
      {!compact && (
        <span className="font-heading text-xl font-semibold tracking-tight">
          Slotly
        </span>
      )}
    </Link>
  );
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S"
  );
}
