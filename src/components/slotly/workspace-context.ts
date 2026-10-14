import { createContext, use } from "react";
import type {
  Booking,
  EventType,
  Profile,
  Workspace,
} from "~/lib/scheduling.functions";

export type Section =
  | "overview"
  | "events"
  | "availability"
  | "bookings"
  | "settings";

export type WorkspaceApi = {
  /** Null in the demo, where nothing is persisted. */
  data: Workspace | null;
  name: string;
  profile: Profile;
  events: EventType[];
  bookings: Booking[];
  demo: boolean;
  /** Opens the sign-up prompt in the demo. */
  gate: () => void;
  refresh: () => Promise<void>;
  go: (section: Section) => void;
  bookingUrl: (event: EventType) => string;
};

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace() {
  const value = use(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside the workspace.");
  return value;
}
