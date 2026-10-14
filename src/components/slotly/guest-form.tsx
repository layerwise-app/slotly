import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { createBooking, type getBooking } from "~/lib/booking.functions";

export type PreviousBooking = NonNullable<Awaited<ReturnType<typeof getBooking>>>["booking"];

export function GuestForm({
  eventId,
  slot,
  zone,
  rescheduleToken,
  previous,
  onBack,
  onPreviewBook,
  onConflict,
}: {
  eventId: string;
  slot: number;
  zone: string;
  rescheduleToken?: string;
  previous?: PreviousBooking;
  onBack: () => void;
  /** Set in previews: submitting calls this instead of booking. */
  onPreviewBook?: () => void;
  onConflict: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(previous?.guestName ?? "");
  const [email, setEmail] = useState(previous?.guestEmail ?? "");
  const [notes, setNotes] = useState(previous?.notes ?? "");
  const book = useMutation({
    mutationFn: () =>
      createBooking({
        data: {
          eventId,
          start: slot,
          guestName: name,
          guestEmail: email,
          guestTimezone: zone,
          notes,
          rescheduleToken,
        },
      }),
    onSuccess: (result) => navigate({ to: "/booking/$token", params: { token: result.token } }),
    onError: onConflict,
  });
  const locked = !!rescheduleToken;
  return (
    <form
      className="animate-rise flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (onPreviewBook) onPreviewBook();
        else book.mutate();
      }}
    >
      <Button type="button" variant="ghost" size="sm" className="-ml-2 self-start" onClick={onBack}>
        <ArrowLeft />
        Back
      </Button>
      <h2 className="text-2xl font-semibold">{locked ? "Confirm your new time" : "Your details"}</h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="guest-name">Name</Label>
        <Input
          id="guest-name"
          required
          maxLength={100}
          autoComplete="name"
          autoFocus={!locked}
          readOnly={locked}
          className="h-11 bg-card text-base read-only:bg-muted"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="guest-email">Email</Label>
        <Input
          id="guest-email"
          required
          type="email"
          maxLength={254}
          autoComplete="email"
          readOnly={locked}
          className="h-11 bg-card text-base read-only:bg-muted"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="guest-notes">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="guest-notes"
          rows={3}
          maxLength={2000}
          readOnly={locked}
          placeholder="Anything that helps prepare"
          className="bg-card text-base read-only:bg-muted"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {book.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {book.error.message}
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            Pick another time
          </Button>
        </div>
      )}
      <Button type="submit" size="lg" className="h-12 rounded-xl text-base" disabled={book.isPending}>
        {book.isPending && <Spinner />}
        {locked ? "Confirm new time" : "Confirm booking"}
      </Button>
    </form>
  );
}
