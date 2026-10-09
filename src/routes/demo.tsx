import { createFileRoute } from "@tanstack/react-router";
import { SlotlyWorkspace } from "~/components/slotly/workspace";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: seo({
      title: "Explore Slotly | Demo workspace",
      description:
        "Explore a read-only preview of Slotly's scheduling workspace. No account needed.",
    }),
  }),
  component: () => <SlotlyWorkspace initialData={null} demo />,
});
