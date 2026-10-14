import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { cancelBooking } from "~/lib/booking.functions";
import type { Booking } from "~/lib/scheduling.functions";
import { calendarFile, formatDate, formatTime } from "~/lib/scheduling";
import { LOCATION_LABELS } from "~/lib/location";
import { EventDot, errorMessage, locationHref } from "./shared";
import { useWorkspace } from "./workspace-context";

export function bookingStatus(item: Booking, now = Date.now()) {
  if (item.status === "cancelled") return "Cancelled";
  return item.end < now ? "Completed" : "Confirmed";
}

export function StatusBadge({ item }: { item: Booking }) {
  const status = bookingStatus(item);
  return (
    <Badge
      variant={status === "Cancelled" ? "destructive" : "secondary"}
      className={status === "Confirmed" ? "bg-accent text-brand-text" : undefined}
    >
      {status}
    </Badge>
  );
}

export function BookingSheet({
  bookingId,
  onClose,
}: {
  bookingId: string | null;
  onClose: () => void;
}) {
  const { bookings, events, profile, demo, gate, refresh } = useWorkspace();
  const item = bookings.find((booking) => booking.id === bookingId);
  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
        {item && (
          <Details
            key={item.id}
            item={item}
            event={events.find((event) => event.id === item.eventId)}
            zone={profile.timezone}
            handle={profile.handle}
            demo={demo}
            gate={gate}
            refresh={refresh}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Details({
  item,
  event,
  zone,
  handle,
  demo,
  gate,
  refresh,
}: {
  item: Booking;
  event: ReturnType<typeof useWorkspace>["events"][number] | undefined;
  zone: string;
  handle: string;
  demo: boolean;
  gate: () => void;
  refresh: () => Promise<void>;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const cancel = useMutation({
    mutationFn: () => cancelBooking({ data: { id: item.id, reason } }),
    onSuccess: async () => {
      await refresh();
      setCancelling(false);
      toast.success("Booking cancelled");
    },
  });
  const upcoming = item.status === "confirmed" && item.start > Date.now();
  const location =
    event && event.locationKind !== "none"
      ? { kind: event.locationKind, value: event.locationValue }
      : null;
  const href = location && locationHref(location.kind, location.value);
  return (
    <>
      <SheetHeader className="gap-2 border-b p-6 pr-14">
        <StatusBadge item={item} />
        <SheetTitle className="text-xl font-semibold">{item.guestName}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <EventDot color={event?.color ?? "amber"} />
          {item.title}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 scroll-py-6 overflow-y-auto p-6">
        <dl className="grid gap-5 text-sm">
          <Row label="When">
            {formatDate(item.start, zone)}
            <span className="block text-muted-foreground">
              {formatTime(item.start, zone)} – {formatTime(item.end, zone)}
            </span>
          </Row>
          {item.guestTimezone !== zone && (
            <Row label="Guest's time">
              {formatTime(item.start, item.guestTimezone)} –{" "}
              {formatTime(item.end, item.guestTimezone)}
              <span className="block text-muted-foreground">
                {item.guestTimezone.replace(/_/g, " ")}
              </span>
            </Row>
          )}
          <Row label="Email">
            <a className="text-brand-text underline-offset-4 hover:underline" href={`mailto:${item.guestEmail}`}>
              {item.guestEmail}
            </a>
          </Row>
          {location && (
            <Row label={LOCATION_LABELS[location.kind]}>
              {href ? (
                <a className="break-all text-brand-text underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
                  {location.value}
                </a>
              ) : (
                location.value
              )}
            </Row>
          )}
          {item.notes && (
            <Row label="Notes">
              <p className="whitespace-pre-wrap">{item.notes}</p>
            </Row>
          )}
          {item.status === "cancelled" && (
            <Row label={`Cancelled by ${item.cancelledBy === "host" ? "you" : "guest"}`}>
              {item.cancelReason || <span className="text-muted-foreground">No reason given</span>}
            </Row>
          )}
          <Row label="Booked">
            {formatDate(item.createdAt, zone)}
          </Row>
        </dl>
        {cancelling && (
          <div className="animate-pop mt-6 flex flex-col gap-3 rounded-2xl border bg-muted/50 p-4">
            <label htmlFor="cancel-reason" className="text-sm font-medium">
              Reason <span className="font-normal text-muted-foreground">(shown to the guest)</span>
            </label>
            <Textarea
              id="cancel-reason"
              autoFocus
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional"
              className="bg-card"
            />
            {cancel.error && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(cancel.error)}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelling(false)}>
                Keep booking
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                {cancel.isPending && <Spinner />}
                Cancel booking
              </Button>
            </div>
          </div>
        )}
      </div>
      <SheetFooter className="grid grid-cols-2 gap-2 border-t p-4 sm:p-6">
        <Button
          variant="outline"
          onClick={() =>
            calendarFile({
              ...item,
              location: location?.value,
            })
          }
        >
          <CalendarPlus />
          Add to calendar
        </Button>
        {demo ? (
          <Button variant="outline" onClick={gate}>
            <ExternalLink />
            Guest page
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <a href={`/booking/${item.token}`} target="_blank" rel="noreferrer">
              <ExternalLink />
              Guest page
            </a>
          </Button>
        )}
        {upcoming && !cancelling && (
          <>
            {demo || !event ? (
              <Button variant="outline" onClick={gate} disabled={!demo}>
                <RefreshCw />
                Reschedule
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link
                  to="/book/$handle/$slug"
                  params={{ handle, slug: event.slug }}
                  search={{ reschedule: item.token }}
                >
                  <RefreshCw />
                  Reschedule
                </Link>
              </Button>
            )}
            <Button variant="destructive" onClick={() => (demo ? gate() : setCancelling(true))}>
              Cancel booking
            </Button>
          </>
        )}
      </SheetFooter>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
