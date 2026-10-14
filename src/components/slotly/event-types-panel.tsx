import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock3,
  Copy,
  CopyPlus,
  ExternalLink,
  Eye,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import {
  deleteEvent,
  saveEvent,
  type EventType,
} from "~/lib/scheduling.functions";
import { publicLocation } from "~/lib/location";
import { eventColor } from "~/lib/scheduling";
import { cn } from "~/lib/utils";
import { BookingExperience } from "./booking-experience";
import { EventEditor } from "./event-editor";
import {
  EmptyState,
  LOCATION_ICONS,
  PageHeader,
  errorMessage,
  formatMinutes,
  locationSummary,
} from "./shared";
import { useWorkspace } from "./workspace-context";

export function EventTypesPanel() {
  const { data, events, profile, name, demo, gate, refresh, bookingUrl } =
    useWorkspace();
  // The session key remounts the editor so each open starts from fresh state.
  const [editor, setEditor] = useState({
    open: false,
    event: null as EventType | null,
    session: 0,
  });
  const edit = (event: EventType | null) =>
    setEditor((current) => ({ open: true, event, session: current.session + 1 }));
  const [preview, setPreview] = useState<EventType | null>(null);
  const [deleting, setDeleting] = useState<EventType | null>(null);
  const toggle = useMutation({
    mutationFn: (event: EventType) =>
      saveEvent({ data: { ...event, active: !event.active } }),
    onSuccess: async (event) => {
      await refresh();
      toast.success(event.active ? "Event is live" : "Event turned off");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteEvent({ data: { id } }),
    onSuccess: async () => {
      await refresh();
      setDeleting(null);
      toast.success("Event type deleted");
    },
  });
  const copy = async (event: EventType) => {
    if (demo) return gate();
    try {
      await navigator.clipboard.writeText(bookingUrl(event));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't access the clipboard.");
    }
  };
  return (
    <>
      <PageHeader
        title="Event types"
        actions={
          <Button onClick={() => edit(null)}>
            <Plus />
            New event type
          </Button>
        }
      />
      {events.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event, index) => {
            const LocationIcon = LOCATION_ICONS[event.locationKind];
            const location = locationSummary(event.locationKind, event.locationValue);
            return (
              <article
                key={event.id}
                data-color={eventColor(event.color)}
                style={{ "--i": index } as React.CSSProperties}
                className={cn(
                  "animate-rise group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  !event.active && "bg-card/60",
                )}
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 z-20 w-1.5 bg-event" />
                <div className="flex items-start gap-3 p-5 pl-6">
                  <div className={cn("min-w-0 flex-1", !event.active && "opacity-60")}>
                    <h2 className="truncate text-lg font-semibold">
                      <button
                        type="button"
                        onClick={() => edit(event)}
                        className="rounded-md text-left outline-none after:absolute after:inset-0 focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {event.title}
                      </button>
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        {event.duration} min
                      </span>
                      {location && (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <LocationIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{location}</span>
                        </span>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[
                        `${formatMinutes(event.minNotice)} notice`,
                        `${event.bookingWindow} days ahead`,
                        `Every ${event.slotInterval} min`,
                        event.dailyLimit && `Max ${event.dailyLimit}/day`,
                      ]
                        .filter(Boolean)
                        .map((rule) => (
                          <span key={String(rule)} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {rule}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-1">
                    <Switch
                      aria-label={`Accept bookings for ${event.title}`}
                      checked={event.active}
                      disabled={toggle.isPending && toggle.variables?.id === event.id}
                      onCheckedChange={() => (demo ? gate() : toggle.mutate(event))}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`${event.title} options`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => edit(event)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            edit({
                              ...event,
                              id: "",
                              title: `${event.title} copy`.slice(0, 100),
                              slug: `${event.slug}-copy`.slice(0, 60),
                            })
                          }
                        >
                          <CopyPlus />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPreview(event)}>
                          <Eye />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => (demo ? gate() : setDeleting(event))}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="relative z-10 mt-auto flex items-center gap-2 border-t bg-muted/30 py-2.5 pr-3 pl-6">
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    /book/{profile.handle}/<span className="font-medium text-foreground">{event.slug}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => void copy(event)} disabled={!event.active}>
                    <Copy />
                    Copy
                  </Button>
                  {demo ? (
                    <Button variant="ghost" size="icon-sm" aria-label="Preview booking page" onClick={() => setPreview(event)}>
                      <Eye />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon-sm" aria-label={`Open ${event.title} booking page`} asChild disabled={!event.active}>
                      <a href={`/book/${profile.handle}/${event.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink />
                      </a>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Link2}
          title="Create your first event type"
          description="Each event type gets its own booking link."
          action={
            <Button onClick={() => edit(null)}>
              <Plus />
              New event type
            </Button>
          }
        />
      )}
      <EventEditor
        key={editor.session}
        event={editor.event}
        open={editor.open}
        onClose={() => setEditor((current) => ({ ...current, open: false }))}
      />
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto bg-background p-0 sm:max-w-5xl">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg font-semibold">Preview</DialogTitle>
            <DialogDescription>What guests see. Booking is disabled here.</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="px-3 pb-3 sm:px-6 sm:pb-6">
              <BookingExperience
                event={{
                  event: {
                    ...preview,
                    locationValue: publicLocation(preview.locationKind, preview.locationValue),
                  },
                  name: data?.user.name ?? name,
                  image: data?.user.image ?? null,
                  handle: profile.handle,
                  timezone: profile.timezone,
                  bio: profile.bio,
                  weekly: profile.weekly,
                  overrides: profile.overrides,
                }}
                preview={{ profile, rules: preview, onBook: gate }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Delete {deleting?.title}?</DialogTitle>
            <DialogDescription>
              The booking link stops working. Event types with bookings can't be deleted; turn them off instead.
            </DialogDescription>
          </DialogHeader>
          {remove.error && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(remove.error)}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              {remove.isPending && <Spinner />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
