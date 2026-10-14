import { SlotlyMark } from "./brand";

export function SlotlyLoading() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center">
      <SlotlyMark className="size-10 animate-pulse" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
