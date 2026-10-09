import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowDown,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Globe2,
  Loader2,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
import { SlotlyLogo } from "~/components/slotly/brand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { getBooking, cancelBooking } from "~/lib/scheduling.functions";
import { calendarFile, formatDate, formatTime } from "~/lib/scheduling";

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
    <div className="public-page">
      <SlotlyLogo />
      <div className="public-missing">
        <h1>We could not find that booking.</h1>
        <p>Check the confirmation link you received or contact your host.</p>
        <Link to="/" className="secondary-button">
          Back to Slotly
        </Link>
      </div>
    </div>
  ),
  component: BookingConfirmation,
});

function BookingConfirmation() {
  const { booking, hostName, handle, slug, active } = Route.useLoaderData();
  const router = useRouter();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancel = useMutation({
    mutationFn: () => cancelBooking({ data: { token: booking.token } }),
    onSuccess: async () => {
      setConfirmCancel(false);
      await router.invalidate();
      toast.success("Your booking is cancelled");
    },
  });
  const isCancelled = booking.status === "cancelled";
  const isPast = booking.start <= Date.now();
  return (
    <div className="public-page">
      <header className="public-header">
        <SlotlyLogo />
        <span className="confirmation-header">
          <ShieldCheck size={15} />A little less back-and-forth
        </span>
      </header>
      <main className="confirmation-card">
        <div
          className={`confirmation-icon ${isCancelled ? "is-cancelled" : ""}`}
        >
          {isCancelled ? <X size={30} /> : <Check size={30} />}
        </div>
        <span className="eyebrow">
          {isCancelled
            ? "PLANS CHANGE. THAT IS OKAY."
            : isPast
              ? "THANKS FOR MAKING THE TIME"
              : "IT IS ON THE CALENDAR"}
        </span>
        <h1>
          {isCancelled
            ? "Your booking is cancelled."
            : isPast
              ? "A conversation, well spent."
              : "You're booked. See you soon."}
        </h1>
        <p className="confirmation-subtitle">
          {isCancelled
            ? "This time is available again. You can book a new conversation when you are ready."
            : `A little time with ${hostName}. Your booking details are below.`}
        </p>
        <div className="confirmation-details">
          <h2>{booking.title}</h2>
          <p>
            <CalendarDays size={18} />
            {formatDate(booking.start, booking.guestTimezone)}
          </p>
          <p>
            <Clock3 size={18} />
            {formatTime(booking.start, booking.guestTimezone)} -{" "}
            {formatTime(booking.end, booking.guestTimezone)}
          </p>
          <p>
            <Globe2 size={18} />
            {booking.guestTimezone.replace(/_/g, " ")}
          </p>
          <div className="confirmation-detail-divider" />
          <p>
            <Mail size={18} />
            <span>
              {booking.guestName}
              <small>{booking.guestEmail}</small>
            </span>
          </p>
          {booking.notes && (
            <p className="confirmation-notes">{booking.notes}</p>
          )}
          <span
            className={`confirmation-status ${isCancelled ? "is-cancelled" : ""}`}
          >
            <span className="status-dot" />
            {isCancelled ? "Cancelled" : "Confirmed"}
          </span>
        </div>
        {!isCancelled && (
          <button
            className="primary-button full-button"
            onClick={() => calendarFile(booking)}
          >
            <ArrowDown size={16} />
            Add to your calendar
          </button>
        )}
        <button
          className="secondary-button full-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("Private confirmation link copied");
            } catch {
              toast.error(
                "Unable to access your clipboard. Copy this page URL manually.",
              );
            }
          }}
        >
          <Copy size={15} />
          Copy confirmation link
        </button>
        <p className="confirmation-keep">
          Keep your private confirmation link to manage this booking.
          <br />
          Only share it with people you trust.
        </p>
        <div className="confirmation-actions">
          {!isCancelled && !isPast && (
            <>
              {active && (
                <Link
                  to="/book/$handle/$slug"
                  params={{ handle, slug }}
                  search={{ reschedule: booking.token }}
                >
                  Reschedule
                </Link>
              )}
              <button onClick={() => setConfirmCancel(true)}>
                Cancel booking
              </button>
            </>
          )}
          {isCancelled && active && (
            <Link
              to="/book/$handle/$slug"
              params={{ handle, slug }}
              search={{ reschedule: undefined }}
            >
              Book a new time
            </Link>
          )}
        </div>
      </main>
      <footer className="confirmation-footer">
        Less scheduling. More living.
        <span>
          Made with <strong>slotly.</strong>
        </span>
      </footer>
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="slotly-dialog">
          <DialogHeader>
            <DialogTitle>Need to cancel?</DialogTitle>
            <DialogDescription>
              Your time will become available again. You can always book a new
              conversation.
            </DialogDescription>
          </DialogHeader>
          {cancel.error && (
            <p className="form-error" role="alert">
              {cancel.error.message}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setConfirmCancel(false)}
            >
              Keep my booking
            </button>
            <button
              className="danger-button"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending && (
                <Loader2 className="animate-spin" size={15} />
              )}
              {cancel.isPending ? "Cancelling..." : "Cancel booking"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
