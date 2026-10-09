import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthSession } from "~/lib/auth.functions";
import { getWorkspace } from "~/lib/scheduling.functions";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session || session.user.banned) throw redirect({ to: "/sign-in" });
  },
  loader: async () => {
    const workspace = await getWorkspace();
    if (!workspace) throw redirect({ to: "/sign-in" });
    return workspace;
  },
  head: () => ({ meta: [{ title: "Your workspace | Slotly" }] }),
  component: Outlet,
});
