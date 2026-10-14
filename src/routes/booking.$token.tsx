import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarPlus, CalendarX2, Check, Copy, History, X } from "lucide-react";
import { MessageCard, PublicShell } from "~/components/slotly/public-shell";
import {
  EventDot,
  LOCATION_ICONS,
  errorMessage,
  locationHref,
} from "~/components/slotly/shared";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { LOCATION_LABELS } from "~/lib/location";
import { cancelBooking, getBooking } from "~/lib/booking.functions";
import { calendarFile, formatDate, formatTime } from "~/lib/scheduling";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/booking/$token")({
  loader: async ({ params }) => {
    const result = await getBooking({ data: params });
    if (!result) throw notFound();
    return result;
  },
  head: () => ({
    meta: [
      { title: "Your booking | Slotly" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  notFoundComponent: () => (
    <PublicShell>
      <MessageCard
        icon={CalendarX2}
        title="Booking not found"
        description="Check the link you saved, or ask your host to send a new one."
      >
        <Button variant="outline" asChild>
          <Link to="/">Go to Slotly</Link>
        </Button>
      </MessageCard>
    </PublicShell>
  ),
  component: BookingConfirmation,
});

function BookingConfirmation() {
  const { booking, hostName, handle, slug, active, color, locationKind, locationValue } =
    Route.useLoaderData();
  const [cancel, setCancel] = useState({ open: false, session: 0 });
  const zone = booking.guestTimezone;
  const state =
    booking.status === "cancelled" ? "cancelled" : booking.start <= Date.now() ? "past" : "upcoming";
  const href = locationHref(locationKind, locationValue);
  const LocationIcon = LOCATION_ICONS[locationKind];
  const canceller = booking.cancelledBy === "host" ? hostName : "you";
  const heading = {
    upcoming: "You're booked",
    past: "This booking has passed",
    cancelled: "Booking cancelled",
  }[state];
  const subtitle = {
    upcoming: "Save it to your calendar. Keep this page's link to make changes.",
    past: `Thanks for meeting with ${hostName}.`,
    cancelled: `Cancelled by ${canceller}${booking.cancelledAt ? ` on ${formatDate(booking.cancelledAt, zone)}` : ""}.`,
  }[state];
  const book = (label: string, primary: boolean) =>
    active && (
      <Button variant={primary ? "default" : "outline"} asChild>
        <Link to="/book/$handle/$slug" params={{ handle, slug }} search={{ reschedule: undefined }}>
          {label}
        </Link>
      </Button>
    );

  return (
    <PublicShell>
      <section className="mx-auto max-w-xl pt-4 sm:pt-10">
        <div className="flex flex-col items-center text-center">
          <span
            className={cn(
              "animate-pop flex size-16 items-center justify-center rounded-full",
              state === "cancelled"
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground shadow-[0_8px_24px_-8px] shadow-primary",
            )}
          >
            {state === "cancelled" ? <X className="size-8" /> : <Check className="size-8" strokeWidth={2.5} />}
          </span>
          <h1 className="animate-rise mt-5 text-3xl font-semibold sm:text-4xl" style={{ "--i": 1 } as React.CSSProperties}>
            {heading}
          </h1>
          <p className="animate-rise mt-2 text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
            {subtitle}
          </p>
        </div>

        <article
          className="animate-rise mt-8 overflow-hidden rounded-3xl border bg-card shadow-xs"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <dl className="divide-y px-5 sm:px-8">
            <Row label="What">
              <span className="flex items-center gap-2.5">
                <EventDot color={color} />
                {booking.title}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {Math.round((booking.end - booking.start) / 60000)} min with {hostName}
              </span>
            </Row>
            <Row label="When">
              <span className={cn(state === "cancelled" && "text-muted-foreground line-through")}>
                {formatDate(booking.start, zone)}
                <br />
                {formatTime(booking.start, zone)} – {formatTime(booking.end, zone)}
              </span>
              <span className="text-sm font-normal text-muted-foreground">{zone.replace(/_/g, " ")}</span>
            </Row>
            {locationKind !== "none" && state !== "cancelled" && (
              <Row label="Where">
                <span className="flex items-start gap-2">
                  <LocationIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {href ? (
                    <a
                      href={href}
                      target={locationKind === "phone" ? undefined : "_blank"}
                      rel="noreferrer"
                      className="min-w-0 break-words text-brand-text underline-offset-4 hover:underline"
                    >
                      {locationKind === "video" ? "Join video call" : locationValue}
                    </a>
                  ) : (
                    <span className="min-w-0 break-words">{locationValue || LOCATION_LABELS[locationKind]}</span>
                  )}
                </span>
                {locationKind === "video" && (
                  <span className="truncate text-sm font-normal text-muted-foreground">{locationValue}</span>
                )}
              </Row>
            )}
            <Row label="Who">
              {booking.guestName}
              <span className="truncate text-sm font-normal text-muted-foreground">{booking.guestEmail}</span>
            </Row>
            {booking.notes && (
              <Row label="Notes">
                <span className="font-normal whitespace-pre-line">{booking.notes}</span>
              </Row>
            )}
            {state === "cancelled" && booking.cancelReason && (
              <Row label="Reason">
                <span className="font-normal whitespace-pre-line">{booking.cancelReason}</span>
              </Row>
            )}
          </dl>
          <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-5 py-4 sm:flex-row sm:items-center sm:px-8">
            {state === "upcoming" && (
              <>
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
                  onClick={() => setCancel((c) => ({ open: true, session: c.session + 1 }))}
                >
                  Cancel booking
                </Button>
                {active && (
                  <Button variant="outline" asChild>
                    <Link to="/book/$handle/$slug" params={{ handle, slug }} search={{ reschedule: booking.token }}>
                      <History />
                      Reschedule
                    </Link>
                  </Button>
                )}
                <Button
                  onClick={() =>
                    calendarFile({
                      id: booking.id,
                      title: `${booking.title} with ${hostName}`,
                      start: booking.start,
                      end: booking.end,
                      notes: booking.notes,
                      location: locationValue,
                    })
                  }
                >
                  <CalendarPlus />
                  Add to calendar
                </Button>
              </>
            )}
            {state === "past" && book("Book again", false)}
            {state === "cancelled" && book("Book a new time", true)}
            {!active && state !== "upcoming" && (
              <p className="text-sm text-muted-foreground">This event type isn't taking bookings right now.</p>
            )}
          </div>
        </article>

        {state === "upcoming" && (
          <div className="mt-4 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            Private link to this booking
            <Button variant="ghost" size="xs" onClick={() => void copyLink()}>
              <Copy />
              Copy
            </Button>
          </div>
        )}
      </section>
      <Dialog open={cancel.open} onOpenChange={(open) => setCancel((c) => ({ ...c, open }))}>
        <DialogContent>
          <CancelForm
            key={cancel.session}
            token={booking.token}
            hostName={hostName}
            onDone={() => setCancel((c) => ({ ...c, open: false }))}
          />
        </DialogContent>
      </Dialog>
    </PublicShell>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col gap-0.5 font-medium">{children}</dd>
    </div>
  );
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy. Copy the address from your browser instead.");
  }
}

function CancelForm({
  token,
  hostName,
  onDone,
}: {
  token: string;
  hostName: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const cancel = useMutation({
    mutationFn: () => cancelBooking({ data: { token, reason } }),
    onSuccess: async () => {
      await router.invalidate();
      onDone();
      toast.success("Booking cancelled");
    },
  });
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        cancel.mutate();
      }}
    >
      <DialogHeader>
        <DialogTitle>Cancel this booking?</DialogTitle>
        <DialogDescription>The time opens up again for {hostName}.</DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="cancel-reason">Reason (optional)</FieldLabel>
        <Textarea
          id="cancel-reason"
          value={reason}
          maxLength={500}
          rows={3}
          placeholder={`Let ${hostName} know why`}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {cancel.error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(cancel.error)}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Keep booking
        </Button>
        <Button type="submit" variant="destructive" disabled={cancel.isPending}>
          {cancel.isPending && <Spinner />}
          Cancel booking
        </Button>
      </DialogFooter>
    </form>
  );
}
