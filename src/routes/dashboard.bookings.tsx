import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "~/components/slotly/dashboard-page";

export const Route = createFileRoute("/dashboard/bookings")({
  // Host booking emails link to `?booking=<id>` to open that booking.
  validateSearch: (search: Record<string, unknown>) => ({
    booking: typeof search.booking === "string" ? search.booking : undefined,
  }),
  head: () => ({ meta: [{ title: "Bookings | Slotly" }] }),
  component: () => <DashboardPage section="bookings" />,
});
