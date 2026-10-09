import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "~/components/slotly/dashboard-page";

export const Route = createFileRoute("/dashboard/availability")({
  head: () => ({ meta: [{ title: "Availability | Slotly" }] }),
  component: () => <DashboardPage section="availability" />,
});
