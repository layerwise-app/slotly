import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Globe2,
  Loader2,
  LockKeyhole,
  Users,
} from "lucide-react";
import { MonthCalendar } from "./month-calendar";
import {
  createBooking,
  getAvailableSlots,
  getBooking,
  type getPublicEvent,
} from "~/lib/scheduling.functions";
import {
  DEFAULT_WEEK,
  TIMEZONES,
  dateKey,
  fitsAvailability,
  formatDate,
  formatTime,
} from "~/lib/scheduling";

type PublicEvent = NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;

export function BookingExperience({
  event: publicEvent,
  demo = false,
  rescheduleToken,
  onDemoBook,
}: {
  event: PublicEvent;
  demo?: boolean;
  rescheduleToken?: string;
  onDemoBook?: () => void;
}) {
  const { event, name, image, timezone: hostZone, bio } = publicEvent;
  const [zone, setZone] = useState(hostZone);
  const [date, setDate] = useState(() =>
    dateKey(Date.now() + 86400000, hostZone),
  );
  const [month, setMonth] = useState(date.slice(0, 7));
  const [slot, setSlot] = useState<number | null>(null);
  const [hour12, setHour12] = useState(true);
  useEffect(() => {
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localDate = dateKey(Date.now() + 86400000, localZone);
    setZone(localZone);
    setDate(localDate);
    setMonth(localDate.slice(0, 7));
  }, []);
  const previous = useQuery({
    queryKey: ["reschedule", rescheduleToken],
    queryFn: () => getBooking({ data: { token: rescheduleToken! } }),
    enabled: !!rescheduleToken,
  });
  const slots = useQuery({
    queryKey: ["slots", event.id, date, zone, rescheduleToken],
    queryFn: () =>
      getAvailableSlots({
        data: { eventId: event.id, date, timezone: zone, rescheduleToken },
      }),
    enabled: !demo,
    refetchInterval: 30000,
    staleTime: 10000,
  });
  const demoSlots = () => {
    const base = Date.parse(`${date}T00:00:00Z`);
    const result: number[] = [];
    for (
      let start = base - 86400000;
      start < base + 2 * 86400000;
      start += 30 * 60000
    ) {
      if (
        start > Date.now() + 30 * 60000 &&
        dateKey(start, zone) === date &&
        fitsAvailability(start, start + event.duration * 60000, {
          timezone: hostZone,
          weekly: DEFAULT_WEEK,
          overrides: [],
        })
      )
        result.push(start);
    }
    return result;
  };
  const available = demo ? demoSlots() : slots.data || [];
  const rescheduleInvalid =
    rescheduleToken &&
    !previous.isPending &&
    (!previous.data ||
      previous.data.booking.eventId !== event.id ||
      previous.data.booking.status !== "confirmed" ||
      previous.data.booking.start <= Date.now());
  const zones = [...new Set([...TIMEZONES, hostZone, zone])];
  return (
    <div className={`booker ${slot ? "booker-form-step" : ""}`}>
      <aside className="booker-details">
        <span className="booker-avatar">
          {image ? (
            <img src={image} alt={name} />
          ) : (
            name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
          )}
        </span>
        <p className="host-name">{name}</p>
        <h1>{event.title}</h1>
        <p className="booker-description">{event.description}</p>
        <div className="booker-meta">
          <span>
            <Clock3 size={17} />
            {event.duration} minutes
          </span>
          <span>
            <Users size={17} />
            One-on-one
          </span>
          {slot && (
            <span>
              <CalendarDays size={17} />
              <span>
                {formatDate(slot, zone)}
                <small>
                  {formatTime(slot, zone, hour12)} -{" "}
                  {formatTime(slot + event.duration * 60000, zone, hour12)}
                </small>
              </span>
            </span>
          )}
          <label>
            <Globe2 size={17} />
            <select
              aria-label="Booking timezone"
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setSlot(null);
              }}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        {bio && <p className="host-bio">{bio}</p>}
        <div className="booker-trust">
          <LockKeyhole size={13} />
          Your time. Thoughtfully protected.
        </div>
      </aside>
      {rescheduleInvalid ? (
        <div className="booker-unavailable">
          <CalendarDays size={30} />
          <h2>This booking cannot be rescheduled.</h2>
          <p>
            It may have been cancelled or already taken place. Check your
            original booking page for details.
          </p>
        </div>
      ) : previous.isPending && rescheduleToken ? (
        <div className="booker-unavailable">
          <Loader2 className="animate-spin" size={26} />
          <p>Loading your booking...</p>
        </div>
      ) : slot ? (
        <GuestForm
          key={`${slot}-${rescheduleToken}`}
          event={publicEvent}
          slot={slot}
          zone={zone}
          demo={demo}
          rescheduleToken={rescheduleToken}
          previous={previous.data?.booking}
          onBack={() => setSlot(null)}
          onDemoBook={onDemoBook}
          onConflict={() => void slots.refetch()}
        />
      ) : (
        <>
          <section className="booker-calendar">
            <span className="booking-step-label">
              {rescheduleToken ? "PICK A NEW TIME" : "PICK A DATE"}
            </span>
            <MonthCalendar
              month={month}
              setMonth={setMonth}
              selected={date}
              onSelect={setDate}
            />
            <p className="calendar-help">
              <span className="status-dot" />
              Times shown in your selected timezone.
            </p>
          </section>
          <section className="booker-slots">
            <div className="slots-heading">
              <h3>
                {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
              <div className="hour-format">
                <button
                  className={hour12 ? "selected" : ""}
                  onClick={() => setHour12(true)}
                >
                  12h
                </button>
                <button
                  className={!hour12 ? "selected" : ""}
                  onClick={() => setHour12(false)}
                >
                  24h
                </button>
              </div>
            </div>
            <span className="available-count">
              {slots.isPending && !demo
                ? "Finding a little time..."
                : `${available.length} available times`}
            </span>
            <div className="slot-list">
              {!demo && slots.isPending ? (
                Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="slot-skeleton" />
                ))
              ) : !demo && slots.isError ? (
                <div className="slots-empty">
                  <p>We could not load these times.</p>
                  <button
                    className="secondary-button"
                    onClick={() => void slots.refetch()}
                  >
                    Try again
                  </button>
                </div>
              ) : available.length ? (
                available.map((start) => (
                  <button
                    className="time-slot"
                    key={start}
                    onClick={() => setSlot(start)}
                  >
                    {formatTime(start, zone, hour12)}
                    <ArrowRight size={15} />
                  </button>
                ))
              ) : (
                <div className="slots-empty">
                  <Clock3 size={25} />
                  <strong>A little quiet here.</strong>
                  <p>No available times on this date. Try another day.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function GuestForm({
  event,
  slot,
  zone,
  demo,
  rescheduleToken,
  previous,
  onBack,
  onDemoBook,
  onConflict,
}: {
  event: PublicEvent;
  slot: number;
  zone: string;
  demo: boolean;
  rescheduleToken?: string;
  previous?: NonNullable<Awaited<ReturnType<typeof getBooking>>>["booking"];
  onBack: () => void;
  onDemoBook?: () => void;
  onConflict: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(previous?.guestName || "");
  const [email, setEmail] = useState(previous?.guestEmail || "");
  const [notes, setNotes] = useState(previous?.notes || "");
  const book = useMutation({
    mutationFn: () =>
      createBooking({
        data: {
          eventId: event.event.id,
          start: slot,
          guestName: name,
          guestEmail: email,
          guestTimezone: zone,
          notes,
          rescheduleToken,
        },
      }),
    onSuccess: (result) =>
      navigate({ to: "/booking/$token", params: { token: result.token } }),
    onError: onConflict,
  });
  return (
    <section className="guest-form-section">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} />
        Choose another time
      </button>
      <div className="guest-form-heading">
        <span className="booking-step-label">ONE LAST LITTLE THING</span>
        <h2>
          {rescheduleToken
            ? "Confirm your new time"
            : "Let us know a little about you."}
        </h2>
        <p>
          {rescheduleToken
            ? "Your original booking moves only when this new time is secured."
            : "Your next conversation is just a few details away."}
        </p>
      </div>
      <form
        className="slotly-form"
        onSubmit={(e) => {
          e.preventDefault();
          demo ? onDemoBook?.() : book.mutate();
        }}
      >
        <label>
          Your name
          <input
            autoFocus
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Alex Morgan"
            value={name}
            readOnly={!!rescheduleToken}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Email address
          <input
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            placeholder="alex@example.com"
            value={email}
            readOnly={!!rescheduleToken}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Anything you would like to share?{" "}
          <span className="optional-label">(optional)</span>
          <textarea
            rows={3}
            maxLength={2000}
            placeholder="A little context for your conversation..."
            value={notes}
            readOnly={!!rescheduleToken}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {book.error && (
          <div className="form-error" role="alert">
            {book.error.message}
            <button type="button" className="text-button" onClick={onBack}>
              Choose another time
            </button>
          </div>
        )}
        <button
          className="primary-button full-button"
          disabled={book.isPending}
        >
          {book.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          {book.isPending
            ? "Securing your time..."
            : demo
              ? "Preview confirmation"
              : rescheduleToken
                ? "Confirm new time"
                : "Confirm booking"}
        </button>
        <p className="guest-form-note">
          {demo
            ? "This is a preview. No booking will be created."
            : "Your details are shared only with your host. You can cancel or reschedule from your confirmation page."}
        </p>
      </form>
    </section>
  );
}
