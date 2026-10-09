import { Loader2 } from "lucide-react";
import { SlotlyLogo } from "./brand";

export function SlotlyLoading() {
  return (
    <div className="slotly-loading">
      <SlotlyLogo />
      <div className="loading-content">
        <Loader2 size={23} className="animate-spin" />
        <p>Making a little room for your schedule...</p>
        <div className="loading-card slot-skeleton" />
        <div className="loading-card slot-skeleton" />
        <div className="loading-card slot-skeleton" />
      </div>
    </div>
  );
}
