import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { CalendarIllustration, SlotlyLogo } from "./brand";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <SlotlyLogo />
        <div className="auth-story-content">
          <span className="eyebrow">YOUR TIME IS A LITTLE PRECIOUS</span>
          <h1>
            Less scheduling.
            <br />
            More living.
          </h1>
          <p>
            A thoughtful little home for your calendar.
            <br />
            Make room for the conversations that matter.
          </p>
          <CalendarIllustration />
          <span className="auth-story-note">
            <ShieldCheck size={15} />
            Your availability stays yours. Always.
          </span>
        </div>
        <span className="auth-story-footer">
          Built for your time, not the other way around.
        </span>
      </aside>
      <main className="auth-form-main">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} />
          Back to Slotly
        </Link>
        <div className="auth-mobile-logo">
          <SlotlyLogo />
        </div>
        <div className="auth-card-wrap">{children}</div>
        <p className="auth-form-footer">
          A little less back-and-forth. A lot more possibility.
        </p>
      </main>
    </div>
  );
}
