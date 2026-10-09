import { getRouteApi } from "@tanstack/react-router";
import { SlotlyWorkspace, type Section } from "./workspace";

const dashboardRoute = getRouteApi("/dashboard");

export function DashboardPage({ section }: { section: Section }) {
  return (
    <SlotlyWorkspace
      initialData={dashboardRoute.useLoaderData()}
      activeSection={section}
    />
  );
}
