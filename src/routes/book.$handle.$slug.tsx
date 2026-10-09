import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BookingExperience } from "~/components/slotly/booking-experience";
import { SlotlyLogo } from "~/components/slotly/brand";
import { getPublicEvent } from "~/lib/scheduling.functions";

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
    <div className="public-page">
      <SlotlyLogo />
      <div className="public-missing">
        <h1>This link is taking a little time off.</h1>
        <p>
          The event may be inactive or the link has changed. Ask your host for a
          fresh booking link.
        </p>
        <Link className="secondary-button" to="/">
          Back to Slotly
        </Link>
      </div>
    </div>
  ),
  component: PublicBooking,
});

function PublicBooking() {
  const event = Route.useLoaderData();
  const { reschedule } = Route.useSearch();
  return (
    <div className="public-page">
      <header className="public-header">
        <SlotlyLogo />
        <Link to="/" className="back-link">
          <ArrowLeft size={15} />
          Back to Slotly
        </Link>
      </header>
      <div className="public-booker-wrap">
        <div className="public-intro">
          <span className="eyebrow">GOOD CONVERSATIONS START HERE</span>
          <p>A little time. A real connection.</p>
        </div>
        <BookingExperience event={event} rescheduleToken={reschedule} />
        <div className="public-footer">
          <span>
            <ShieldCheck size={14} />
            Thoughtfully scheduled with <strong>slotly.</strong>
          </span>
          <Link to="/sign-up">
            Make time yours
            <ArrowLeft className="rotate-180" size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
