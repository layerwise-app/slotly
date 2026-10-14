import { Check, Clock3, Video } from "lucide-react";
import { cn } from "~/lib/utils";

const SLOTS = ["9:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"];
const PICKED = 1;

/**
 * Looping booking demo driven by CSS keyframes in landing.css. Without motion
 * it rests on the picked-slot state.
 */
export function HeroWidget({ today, className }: { today: number; className?: string }) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(today + (i + 1) * 86400000));
  const weekday = (date: Date) => date.getUTCDay() % 6 !== 0;
  const pick = days.findIndex((date, i) => i >= 2 && weekday(date));
  const picked = days[pick]!;
  const label = picked.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <div
      role="img"
      aria-label="A guest picks a date, then a time, and the booking is confirmed."
      className={cn("hw relative w-full max-w-[400px]", className)}
    >
      <div aria-hidden="true" className="relative overflow-hidden rounded-[28px] border bg-card p-5 shadow-[0_1px_2px_rgb(28_25_23/0.05),0_24px_60px_-20px_rgb(28_25_23/0.25)] sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-ink font-heading text-xs font-semibold text-white">AR</span>
          <div className="min-w-0">
            <p className="font-heading text-lg leading-tight font-semibold">Intro call</p>
            <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                20 min
              </span>
              <span className="inline-flex items-center gap-1">
                <Video className="size-3" />
                Video call
              </span>
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {days.map((date, i) => (
            <span
              key={i}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-2xl py-2 text-center",
                weekday(date) ? "bg-accent" : "text-muted-foreground/50",
                i === pick && "hw-day-pick bg-primary text-primary-foreground",
              )}
            >
              <span className="text-[10px] font-medium uppercase opacity-70">
                {date.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" })}
              </span>
              <span className="text-sm font-semibold tabular-nums">{date.getUTCDate()}</span>
              {i === pick && <span data-at="day" className="hw-tap absolute inset-0 rounded-2xl ring-4 ring-primary" />}
            </span>
          ))}
        </div>
        <p className="mt-5 mb-2.5 text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex flex-col gap-2">
          {SLOTS.map((time, i) => (
            <span key={time} className="hw-slot relative block h-11" style={{ "--i": i } as React.CSSProperties}>
              {i === PICKED ? (
                <>
                  <span className="hw-plain absolute inset-0 flex items-center justify-center rounded-xl border-2 border-primary/50 text-sm font-semibold text-brand-text">
                    {time}
                  </span>
                  <span className="hw-split absolute inset-0 grid grid-cols-2 gap-2">
                    <span className="flex items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white">{time}</span>
                    <span className="relative flex items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                      Next
                      <span data-at="next" className="hw-tap absolute inset-0 rounded-xl ring-4 ring-primary" />
                    </span>
                  </span>
                  <span data-at="slot" className="hw-tap absolute inset-0 rounded-xl ring-4 ring-primary/60" />
                </>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-primary/50 text-sm font-semibold text-brand-text">
                  {time}
                </span>
              )}
            </span>
          ))}
        </div>
        <div className="hw-confirm absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/95 p-6 text-center backdrop-blur-sm">
          <span className="hw-check flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-7" strokeWidth={3} />
          </span>
          <p className="font-heading text-2xl font-semibold">You're booked</p>
          <p className="text-sm text-muted-foreground">
            {label} · {SLOTS[PICKED]}
          </p>
          <span className="mt-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-brand-text">Invite sent</span>
        </div>
      </div>
    </div>
  );
}
