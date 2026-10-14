import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "~/components/slotly/dashboard-page";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview | Slotly" }] }),
  component: () => <DashboardPage section="overview" />,
});
