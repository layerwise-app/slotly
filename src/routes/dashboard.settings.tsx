import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "~/components/slotly/dashboard-page";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Profile settings | Slotly" }] }),
  component: () => <DashboardPage section="settings" />,
});
