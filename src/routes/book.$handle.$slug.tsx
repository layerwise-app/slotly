import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarX2 } from "lucide-react";
import { BookingExperience } from "~/components/slotly/booking-experience";
import { MessageCard, PublicShell } from "~/components/slotly/public-shell";
import { Button } from "~/components/ui/button";
import { getPublicEvent } from "~/lib/booking.functions";

export const Route = createFileRoute("/book/$handle/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    reschedule:
      typeof search.reschedule === "string" ? search.reschedule : undefined,
  }),
  loader: async ({ params }) => {
    const event = await getPublicEvent({ data: params });
    if (!event) throw notFound();
    return event;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.event.title} with ${loaderData.name} | Slotly`
          : "Book a time | Slotly",
      },
    ],
  }),
  notFoundComponent: () => (
    <PublicShell>
      <MessageCard
        icon={CalendarX2}
        title="This booking link isn't available"
        description="It may be turned off or renamed. Ask your host for a new link."
      >
        <Button variant="outline" asChild>
          <Link to="/">Go to Slotly</Link>
        </Button>
      </MessageCard>
    </PublicShell>
  ),
  component: PublicBooking,
});

function PublicBooking() {
  const event = Route.useLoaderData();
  const { reschedule } = Route.useSearch();
  return (
    <PublicShell>
      <BookingExperience event={event} rescheduleToken={reschedule} />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link
          to="/"
          className="rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Powered by Slotly
        </Link>
      </p>
    </PublicShell>
  );
}
