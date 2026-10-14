import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarOff, CopyCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import { DAY_NAMES, TIMEZONES, dateKey, minutes, type DateOverride, type WeekDay } from "~/lib/scheduling";
import { saveProfile } from "~/lib/scheduling.functions";
import { cn } from "~/lib/utils";
import { EmptyState, PageHeader, errorMessage } from "./shared";
import { useWorkspace } from "./workspace-context";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const BUFFERS = [0, 5, 10, 15, 30, 45, 60, 90, 120];

export function AvailabilityEditor() {
  const { profile, demo, gate, refresh } = useWorkspace();
  const [weekly, setWeekly] = useState<WeekDay[]>(profile.weekly);
  const [zone, setZone] = useState(profile.timezone);
  const [bufferBefore, setBufferBefore] = useState(profile.bufferBefore);
  const [bufferAfter, setBufferAfter] = useState(profile.bufferAfter);
  const [overrides, setOverrides] = useState<DateOverride[]>(profile.overrides);
  // Bumping the session remounts the dialog with an empty form.
  const [adding, setAdding] = useState({ open: false, session: 0 });
  const today = dateKey(Date.now(), zone);
  const upcoming = overrides.filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const invalid = weekly.some((day) => day.enabled && day.start >= day.end);
  const hours = weekly.reduce(
    (total, day) => total + (day.enabled && day.start < day.end ? (minutes(day.end) - minutes(day.start)) / 60 : 0),
    0,
  );
  const next = { weekly, timezone: zone, bufferBefore, bufferAfter, overrides: upcoming };
  const dirty =
    JSON.stringify(next) !==
    JSON.stringify({
      weekly: profile.weekly,
      timezone: profile.timezone,
      bufferBefore: profile.bufferBefore,
      bufferAfter: profile.bufferAfter,
      overrides: profile.overrides.filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    });
  const save = useMutation({
    // Past overrides no longer affect slots, so they are dropped on save.
    mutationFn: () => saveProfile({ data: { ...profile, ...next } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Availability saved");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const updateDay = (day: number, patch: Partial<WeekDay>) =>
    setWeekly((current) => current.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  const zones = [...new Set([...TIMEZONES, zone])];

  return (
    <>
      <PageHeader
        title="Availability"
        description={`${Number(hours.toFixed(1))} hours a week in ${zone.replace(/_/g, " ")}`}
        actions={
          <Button disabled={!dirty || invalid || save.isPending} onClick={() => (demo ? gate() : save.mutate())}>
            {save.isPending && <Spinner />}
            Save changes
          </Button>
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="ring-border">
          <CardHeader>
            <CardTitle className="font-semibold">Weekly hours</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {DAY_ORDER.map((dayIndex) => {
              const day = weekly.find((item) => item.day === dayIndex)!;
              const bad = day.enabled && day.start >= day.end;
              return (
                <div
                  key={dayIndex}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b py-3 last:border-0 sm:grid-cols-[150px_minmax(0,1fr)_auto]"
                >
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(enabled) => updateDay(dayIndex, { enabled })}
                    />
                    <span className="w-10 sm:w-auto">{DAY_NAMES[dayIndex]!.slice(0, 3)}</span>
                  </label>
                  {day.enabled ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Input
                        type="time"
                        step={300}
                        aria-label={`${DAY_NAMES[dayIndex]} start`}
                        aria-invalid={bad || undefined}
                        className="w-[7.5rem]"
                        value={day.start}
                        onChange={(e) => updateDay(dayIndex, { start: e.target.value })}
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        type="time"
                        step={300}
                        aria-label={`${DAY_NAMES[dayIndex]} end`}
                        aria-invalid={bad || undefined}
                        className="w-[7.5rem]"
                        value={day.end}
                        onChange={(e) => updateDay(dayIndex, { end: e.target.value })}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unavailable</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("col-span-2 justify-self-start sm:col-span-1", !day.enabled && "invisible")}
                    disabled={bad}
                    onClick={() => {
                      setWeekly((current) =>
                        current.map((item) => (item.enabled ? { ...item, start: day.start, end: day.end } : item)),
                      );
                      toast.success(`Copied ${day.start}–${day.end} to all working days`);
                    }}
                  >
                    <CopyCheck />
                    Copy to all
                  </Button>
                  {bad && (
                    <p role="alert" className="col-span-full text-sm text-destructive">
                      End time must be after start time.
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="ring-border">
            <CardHeader>
              <CardTitle className="font-semibold">Time zone and buffers</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="availability-zone">Time zone</Label>
                <NativeSelect id="availability-zone" className="w-full" value={zone} onChange={(e) => setZone(e.target.value)}>
                  {zones.map((item) => (
                    <NativeSelectOption key={item} value={item}>
                      {item.replace(/_/g, " ")}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["Before", bufferBefore, setBufferBefore],
                    ["After", bufferAfter, setBufferAfter],
                  ] as const
                ).map(([label, value, setValue]) => (
                  <div key={label} className="flex flex-col gap-2">
                    <Label htmlFor={`buffer-${label}`}>{label} meetings</Label>
                    <NativeSelect
                      id={`buffer-${label}`}
                      className="w-full"
                      value={value}
                      onChange={(e) => setValue(Number(e.target.value))}
                    >
                      {BUFFERS.map((item) => (
                        <NativeSelectOption key={item} value={item}>
                          {item ? `${item} min` : "No buffer"}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="ring-border">
            <CardHeader>
              <CardTitle className="font-semibold">Date overrides</CardTitle>
              <CardDescription>Days off or different hours.</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setAdding((current) => ({ open: true, session: current.session + 1 }))}>
                  <Plus />
                  Add
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {upcoming.length ? (
                <ul className="flex flex-col gap-2">
                  {upcoming.map((item) => (
                    <li key={item.date} className="animate-pop flex items-center gap-3 rounded-xl border bg-background px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {new Date(`${item.date}T12:00:00Z`).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          })}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.unavailable ? "Unavailable" : `${item.start}–${item.end}`}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove override for ${item.date}`}
                        onClick={() => setOverrides((current) => current.filter((o) => o.date !== item.date))}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={CalendarOff} title="No overrides" className="p-6" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <OverrideDialog
        key={adding.session}
        open={adding.open}
        min={today}
        onClose={() => setAdding((current) => ({ ...current, open: false }))}
        onAdd={(item) => {
          setOverrides((current) => [...current.filter((o) => o.date !== item.date), item]);
          setAdding((current) => ({ ...current, open: false }));
        }}
      />
    </>
  );
}

function OverrideDialog({
  open,
  min,
  onClose,
  onAdd,
}: {
  open: boolean;
  min: string;
  onClose: () => void;
  onAdd: (item: DateOverride) => void;
}) {
  const [item, setItem] = useState<DateOverride>({ date: "", unavailable: true, start: "09:00", end: "17:00" });
  const valid = item.date >= min && (item.unavailable || item.start < item.end);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Add a date override</DialogTitle>
          <DialogDescription>Replaces your weekly hours for that day.</DialogDescription>
        </DialogHeader>
        <form
          id="override-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onAdd(item);
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="override-date">Date</Label>
            <Input
              id="override-date"
              type="date"
              required
              min={min}
              value={item.date}
              onChange={(e) => setItem({ ...item, date: e.target.value })}
            />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2.5 text-sm font-medium">
            Unavailable all day
            <Switch checked={item.unavailable} onCheckedChange={(unavailable) => setItem({ ...item, unavailable })} />
          </label>
          {!item.unavailable && (
            <div className="animate-pop grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="override-start">From</Label>
                <Input id="override-start" type="time" step={300} value={item.start} onChange={(e) => setItem({ ...item, start: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="override-end">To</Label>
                <Input id="override-end" type="time" step={300} value={item.end} onChange={(e) => setItem({ ...item, end: e.target.value })} />
              </div>
            </div>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="override-form" disabled={!valid}>
            Add override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
