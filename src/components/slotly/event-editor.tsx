import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { LOCATION_KINDS, LOCATION_LABELS, type LocationKind } from "~/lib/location";
import { COLORS, SLOT_INTERVALS, eventColor, slugify } from "~/lib/scheduling";
import { saveEvent, type EventType } from "~/lib/scheduling.functions";
import { errorMessage, formatMinutes } from "./shared";
import { useWorkspace } from "./workspace-context";

const DURATIONS = [15, 30, 45, 60];
const NOTICE_OPTIONS = [0, 15, 30, 60, 120, 240, 720, 1440, 2880, 10080];
const WINDOW_OPTIONS = [7, 14, 30, 60, 90, 180, 365];
const LOCATION_PLACEHOLDERS: Record<LocationKind, string> = {
  none: "",
  video: "https://meet.google.com/abc-defg-hij",
  phone: "+1 555 010 2030",
  in_person: "Street address or venue",
  custom: "How guests will reach you",
};

type Draft = Omit<EventType, "ownerId" | "createdAt">;

const NEW_EVENT: Draft = {
  id: "",
  title: "",
  slug: "",
  description: "",
  duration: 30,
  color: "amber",
  active: true,
  minNotice: 60,
  bookingWindow: 60,
  slotInterval: 30,
  dailyLimit: null,
  locationKind: "video",
  locationValue: "",
};

export function EventEditor({
  event,
  open,
  onClose,
}: {
  event: EventType | null;
  open: boolean;
  onClose: () => void;
}) {
  const { profile, demo, gate, refresh } = useWorkspace();
  const [draft, setDraft] = useState<Draft>(() =>
    event ? { ...event, color: eventColor(event.color) } : NEW_EVENT,
  );
  // New events follow the title until the URL is edited by hand.
  const [slugTouched, setSlugTouched] = useState(!!event?.id);
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const save = useMutation({
    mutationFn: () => saveEvent({ data: { ...draft, id: draft.id || undefined } }),
    onSuccess: async () => {
      await refresh();
      toast.success(draft.id ? "Changes saved" : "Event type created");
      onClose();
    },
  });
  const isNew = !draft.id;
  const needsValue = draft.locationKind !== "none";
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b p-6 pr-14">
          <SheetTitle className="text-xl font-semibold">
            {isNew ? "New event type" : `Edit ${event?.title}`}
          </SheetTitle>
          <SheetDescription>
            Guests book this at /book/{profile.handle}/{draft.slug || "…"}
          </SheetDescription>
        </SheetHeader>
        <form
          id="event-editor"
          className="flex-1 scroll-py-6 overflow-y-auto p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (demo) gate();
            else save.mutate();
          }}
        >
          <FieldGroup className="gap-8">
            <FieldSet>
              <FieldLegend className="font-heading text-base font-semibold">Details</FieldLegend>
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="event-title">Title</FieldLabel>
                  <Input
                    id="event-title"
                    required
                    maxLength={100}
                    placeholder="Intro call"
                    value={draft.title}
                    onChange={(e) =>
                      set({
                        title: e.target.value,
                        ...(slugTouched ? {} : { slug: slugify(e.target.value) }),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-slug">URL</FieldLabel>
                  <div className="flex h-9 items-center overflow-hidden rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                    <span className="hidden h-full items-center border-r bg-muted px-3 text-sm text-muted-foreground sm:flex">
                      /book/{profile.handle}/
                    </span>
                    <input
                      id="event-slug"
                      maxLength={60}
                      className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      placeholder="intro-call"
                      value={draft.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") });
                      }}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-description">Description</FieldLabel>
                  <Textarea
                    id="event-description"
                    rows={3}
                    maxLength={2000}
                    placeholder="What guests should expect"
                    value={draft.description}
                    onChange={(e) => set({ description: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-duration">Duration</FieldLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    {DURATIONS.map((minutes) => (
                      <Button
                        key={minutes}
                        type="button"
                        size="sm"
                        variant={draft.duration === minutes ? "default" : "outline"}
                        aria-pressed={draft.duration === minutes}
                        className="rounded-full px-3.5"
                        onClick={() => set({ duration: minutes })}
                      >
                        {minutes} min
                      </Button>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        id="event-duration"
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        required
                        className="h-8 w-20"
                        value={draft.duration}
                        onChange={(e) => set({ duration: e.target.valueAsNumber || 0 })}
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                  </div>
                </Field>
                <Field>
                  <FieldLabel id="event-color">Color</FieldLabel>
                  <div role="radiogroup" aria-labelledby="event-color" className="flex gap-2.5">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={draft.color === color}
                        aria-label={color}
                        data-color={color}
                        onClick={() => set({ color })}
                        className="flex size-8 items-center justify-center rounded-full bg-event text-white ring-offset-2 ring-offset-background transition-transform outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/60 aria-checked:ring-2 aria-checked:ring-event"
                      >
                        {draft.color === color && <Check className="size-4" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend className="font-heading text-base font-semibold">Booking rules</FieldLegend>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="event-notice">Minimum notice</FieldLabel>
                  <NativeSelect
                    id="event-notice"
                    className="w-full"
                    value={draft.minNotice}
                    onChange={(e) => set({ minNotice: Number(e.target.value) })}
                  >
                    {[...new Set([...NOTICE_OPTIONS, draft.minNotice])]
                      .sort((a, b) => a - b)
                      .map((value) => (
                        <NativeSelectOption key={value} value={value}>
                          {formatMinutes(value)}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-window">Bookable up to</FieldLabel>
                  <NativeSelect
                    id="event-window"
                    className="w-full"
                    value={draft.bookingWindow}
                    onChange={(e) => set({ bookingWindow: Number(e.target.value) })}
                  >
                    {[...new Set([...WINDOW_OPTIONS, draft.bookingWindow])]
                      .sort((a, b) => a - b)
                      .map((value) => (
                        <NativeSelectOption key={value} value={value}>
                          {value} days ahead
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="event-interval">Start times every</FieldLabel>
                  <NativeSelect
                    id="event-interval"
                    className="w-full"
                    value={draft.slotInterval}
                    onChange={(e) => set({ slotInterval: Number(e.target.value) })}
                  >
                    {SLOT_INTERVALS.map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {value} minutes
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="event-limit">Daily limit</FieldLabel>
                    <Switch
                      size="sm"
                      aria-label="Limit bookings per day"
                      checked={draft.dailyLimit !== null}
                      onCheckedChange={(on) => set({ dailyLimit: on ? 3 : null })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="event-limit"
                      type="number"
                      min={1}
                      max={50}
                      required={draft.dailyLimit !== null}
                      disabled={draft.dailyLimit === null}
                      className="w-20"
                      value={draft.dailyLimit ?? ""}
                      placeholder="—"
                      onChange={(e) => set({ dailyLimit: e.target.valueAsNumber || 1 })}
                    />
                    <span className="text-sm text-muted-foreground">bookings per day</span>
                  </div>
                </Field>
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend className="font-heading text-base font-semibold">Location</FieldLegend>
              <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                <NativeSelect
                  aria-label="Location type"
                  className="w-full"
                  value={draft.locationKind}
                  onChange={(e) =>
                    set({ locationKind: e.target.value as LocationKind, locationValue: "" })
                  }
                >
                  {LOCATION_KINDS.map((kind) => (
                    <NativeSelectOption key={kind} value={kind}>
                      {LOCATION_LABELS[kind]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {needsValue && (
                  <Input
                    aria-label={LOCATION_LABELS[draft.locationKind]}
                    required
                    maxLength={300}
                    type={draft.locationKind === "video" ? "url" : draft.locationKind === "phone" ? "tel" : "text"}
                    placeholder={LOCATION_PLACEHOLDERS[draft.locationKind]}
                    value={draft.locationValue}
                    onChange={(e) => set({ locationValue: e.target.value })}
                  />
                )}
              </div>
              {(draft.locationKind === "video" || draft.locationKind === "phone") && (
                <FieldDescription>Shared with guests after they book.</FieldDescription>
              )}
            </FieldSet>

            <Field orientation="horizontal" className="rounded-xl border bg-muted/40 p-4">
              <div className="flex-1">
                <FieldLabel htmlFor="event-active">Accept bookings</FieldLabel>
                <FieldDescription>Turn off to pause this link without deleting it.</FieldDescription>
              </div>
              <Switch
                id="event-active"
                checked={draft.active}
                onCheckedChange={(active) => set({ active })}
              />
            </Field>
          </FieldGroup>
        </form>
        <SheetFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t p-4 sm:px-6">
          {save.error && (
            <p role="alert" className="mr-auto text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="event-editor" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {isNew ? "Create event type" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
