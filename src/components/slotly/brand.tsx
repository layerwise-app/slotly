import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function SlotlyLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="slotly-logo" aria-label="Slotly home">
      <span className="logo-mark">
        <span />
        <span />
        <span />
      </span>
      {!compact && (
        <span>
          slotly<span className="logo-period">.</span>
        </span>
      )}
    </Link>
  );
}

export function CalendarIllustration() {
  return (
    <div className="calendar-art" aria-hidden="true">
      <span className="art-spark one">+</span>
      <span className="art-spark two">+</span>
      <div className="art-circle" />
      <div className="art-card">
        <div className="art-card-top">
          <span />
          <span />
          <b>YOUR TIME, SIMPLIFIED</b>
        </div>
        <div className="art-days">
          {Array.from({ length: 14 }, (_, i) => (
            <span className={i === 9 ? "art-selected" : ""} key={i}>
              {i === 9 ? <CalendarDays size={15} /> : i + 1}
            </span>
          ))}
        </div>
      </div>
      <span className="art-float">
        <ArrowUpRight size={20} />
      </span>
    </div>
  );
}
