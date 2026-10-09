import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SlotlyLogo } from "~/components/slotly/brand";

export function NotFound({ children }: { children?: ReactNode }) {
  return (
    <div className="public-page">
      <SlotlyLogo />
      <div className="public-missing">
        <span className="eyebrow">A SMALL DETOUR</span>
        <h1>This page is taking a little time off.</h1>
        <p>
          {children ||
            "The link may have changed. Let us get you back to your schedule."}
        </p>
        <Link to="/" className="primary-button">
          Back to Slotly
        </Link>
      </div>
    </div>
  );
}
