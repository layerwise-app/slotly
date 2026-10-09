import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "~/components/slotly/dashboard-page";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Event types | Slotly" }] }),
  component: () => <DashboardPage section="events" />,
});
