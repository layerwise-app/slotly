import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "~/components/slotly/dashboard-page";

export const Route = createFileRoute("/dashboard/bookings")({
  head: () => ({ meta: [{ title: "Bookings | Slotly" }] }),
  component: () => <DashboardPage section="bookings" />,
});
