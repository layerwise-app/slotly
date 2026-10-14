import type { ReactNode } from "react";
import {
  MapPin,
  MessageSquareText,
  Phone,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { eventColor } from "~/lib/scheduling";
import { LOCATION_LABELS, type LocationKind } from "~/lib/location";
import { cn } from "~/lib/utils";

export function errorMessage(error: Error) {
  if (/unique|constraint/i.test(error.message))
    return "That URL or username is already taken.";
  return error.message || "Something went wrong. Try again.";
}

export function EventDot({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-color={eventColor(color)}
      className={cn("inline-block size-2.5 shrink-0 rounded-full bg-event", className)}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("rounded-2xl border border-dashed bg-card/60 p-10", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="rounded-xl bg-accent text-brand-text">
          <Icon />
        </EmptyMedia>
        <EmptyTitle className="text-base font-semibold">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

export const LOCATION_ICONS: Record<LocationKind, LucideIcon> = {
  none: MapPin,
  video: Video,
  phone: Phone,
  in_person: MapPin,
  custom: MessageSquareText,
};

/** One line for lists: the label, plus the value when it is safe to show. */
export function locationSummary(kind: LocationKind, value: string) {
  if (kind === "none") return "";
  if (kind === "video" || kind === "phone") return LOCATION_LABELS[kind];
  return value || LOCATION_LABELS[kind];
}

export function locationHref(kind: LocationKind, value: string) {
  if (kind === "video") return value;
  if (kind === "phone") return `tel:${value.replace(/[^+0-9]/g, "")}`;
  if (kind === "in_person")
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
  return undefined;
}

export function formatMinutes(total: number) {
  if (total === 0) return "None";
  if (total % 1440 === 0) return `${total / 1440} ${total === 1440 ? "day" : "days"}`;
  if (total % 60 === 0) return `${total / 60} ${total === 60 ? "hour" : "hours"}`;
  return `${total} min`;
}

export function formatDay(timestamp: number, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-[28px]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
