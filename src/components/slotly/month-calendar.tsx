import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthKey(year: number, monthIndex: number) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return date.toISOString().slice(0, 7);
}

/** Month grid keyed by YYYY-MM-DD strings; min/max bound selectable dates. */
export function MonthCalendar({
  month,
  setMonth,
  selected,
  onSelect,
  today,
  min,
  max,
  counts,
  open,
  className,
}: {
  month: string;
  setMonth: (month: string) => void;
  selected?: string;
  onSelect: (date: string) => void;
  today: string;
  min?: string;
  max?: string;
  counts?: Record<string, number>;
  /** Days with availability; other days in range are disabled. */
  open?: Set<string>;
  className?: string;
}) {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(year, number - 1, 1));
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const previous = monthKey(year, number - 2);
  const next = monthKey(year, number);
  return (
    <div className={cn("select-none", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold" aria-live="polite">
          {first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            disabled={!!min && previous < min.slice(0, 7)}
            onClick={() => setMonth(previous)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            disabled={!!max && next > max.slice(0, 7)}
            onClick={() => setMonth(next)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="pb-1 text-xs font-medium text-muted-foreground">
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const disabled = (!!min && date < min) || (!!max && date > max) || (!!open && !open.has(date));
          const isSelected = selected === date;
          const count = counts?.[date] ?? 0;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              aria-label={`${date}${count ? `, ${count} bookings` : ""}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(date)}
              className={cn(
                "relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-[background-color,color,transform] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                disabled
                  ? "cursor-default text-muted-foreground/45"
                  : "bg-accent/70 text-foreground hover:bg-accent hover:text-brand-text active:scale-95",
                !min && !disabled && "bg-transparent hover:bg-muted",
                date === today && "font-bold",
                date === today && !isSelected && !disabled && "text-brand-text",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground",
              )}
            >
              {i + 1}
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-brand-text",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
