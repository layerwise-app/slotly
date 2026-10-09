import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  Link2,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CalendarIllustration, SlotlyLogo } from "~/components/slotly/brand";
import { getAuthSession } from "~/lib/auth.functions";
import { seo } from "~/utils/seo";
import "~/styles/landing.css";

export const Route = createFileRoute("/")({
  loader: async () => {
    const session = await getAuthSession();
    return { signedIn: !!session && !session.user.banned, today: Date.now() };
  },
  head: () => ({
    meta: seo({
      title: "Slotly | A little less back-and-forth",
      description:
        "Your time, your way. Thoughtful scheduling for great conversations.",
    }),
  }),
  component: Home,
});

function Home() {
  const { signedIn, today } = Route.useLoaderData();
  const destination = signedIn ? "/dashboard" : "/sign-up";
  return (
    <div className="slotly-landing">
      <header className="landing-header">
        <SlotlyLogo />
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="landing-desktop-link" href="#your-time">
            Why Slotly
          </a>
          <a className="landing-desktop-link" href="#how-it-works">
            How it works
          </a>
          <Link to="/demo">
            Explore demo
            <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="landing-auth">
          {!signedIn && (
            <Link className="landing-sign-in" to="/sign-in">
              Sign in
            </Link>
          )}
          <Link className="primary-button landing-nav-cta" to={destination}>
            {signedIn ? "Your dashboard" : "Get started"}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              <span className="status-dot" />
              THOUGHTFUL SCHEDULING. JUST FOR YOU.
            </span>
            <h1>
              A little less
              <br />
              back-and-forth.
              <br />
              <span>A lot more living.</span>
            </h1>
            <p>
              One simple link. Meetings that fit your rhythm.
              <br className="landing-desktop-break" /> Make room for the
              conversations that matter,
              <br className="landing-desktop-break" /> without the scheduling
              dance.
            </p>
            <div className="landing-hero-actions">
              <Link className="primary-button" to={destination}>
                {signedIn ? "Open your workspace" : "Make time yours"}
                <ArrowRight size={16} />
              </Link>
              <Link className="landing-demo-button" to="/demo">
                <span>
                  <Play size={12} fill="currentColor" />
                </span>
                Take a little look
              </Link>
            </div>
            <div className="landing-hero-note">
              <ShieldCheck size={14} />
              Built for individuals. Your availability stays yours.
            </div>
          </div>
          <LandingBookingPreview today={today} />
        </section>
        <div className="landing-principles">
          <span>
            <Link2 size={16} />
            One link. Endless possibilities.
          </span>
          <span>
            <Globe2 size={16} />
            Their timezone. Your rhythm.
          </span>
          <span>
            <ShieldCheck size={16} />
            No overlapping bookings.
          </span>
        </div>
        <section className="landing-features" id="your-time">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">
              A SMALL TOOL. A LITTLE MORE FREEDOM.
            </span>
            <h2>Your calendar should work for you.</h2>
            <p>All the essentials. None of the unnecessary noise.</p>
          </div>
          <div className="landing-feature-grid">
            {[
              {
                Icon: Link2,
                title: "A link for every conversation",
                text: "Quick chats, discovery calls, or a proper deep dive. Give each meeting its own duration and shareable booking link.",
                label: "YOUR LINK",
                color: "green",
              },
              {
                Icon: Clock3,
                title: "Meet on your terms",
                text: "Set weekly hours, make exceptions for specific dates, and leave a little breathing room between meetings.",
                label: "YOUR RHYTHM",
                color: "blue",
              },
              {
                Icon: CalendarCheck2,
                title: "Plans change. No problem.",
                text: "Keep every booking in one place. Guests can cancel or find a new time, and your schedule stays protected.",
                label: "YOUR PEACE OF MIND",
                color: "violet",
              },
            ].map(({ Icon, title, text, label, color }) => (
              <article className={`landing-feature color-${color}`} key={title}>
                <span className="landing-feature-icon">
                  <Icon size={24} />
                </span>
                <span className="landing-feature-label">{label}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-how" id="how-it-works">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">
              LESS COORDINATING. MORE CONNECTING.
            </span>
            <h2>Good meetings are three little steps away.</h2>
          </div>
          <div className="landing-step-grid">
            {[
              {
                number: "01",
                title: "Make room",
                description:
                  "Create an event type and choose when you are happy to meet.",
              },
              {
                number: "02",
                title: "Share a little link",
                description:
                  "Send your booking URL. They pick a time in their own timezone.",
              },
              {
                number: "03",
                title: "Show up, connect",
                description:
                  "The time is reserved. Add it to your calendar and enjoy the conversation.",
              },
            ].map((step) => (
              <article key={step.number}>
                <span className="landing-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-final-cta">
          <div>
            <span className="landing-eyebrow">
              <Sparkles size={13} />
              YOUR TIME IS A LITTLE PRECIOUS.
            </span>
            <h2>
              Make a little more room
              <br />
              for what matters.
            </h2>
            <p>
              A thoughtful home for your schedule. A simpler way to connect.
            </p>
            <Link className="primary-button" to={destination}>
              {signedIn ? "Go to your dashboard" : "Create your workspace"}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <CalendarIllustration />
        </section>
      </main>
      <footer className="landing-footer">
        <SlotlyLogo />
        <span>Less scheduling. More living.</span>
        <div>
          <Link to="/demo">Explore demo</Link>
          <Link to="/dashboard">
            Your workspace
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </footer>
    </div>
  );
}

function LandingBookingPreview({ today }: { today: number }) {
  const selected = new Date(today + 86400000);
  while (selected.getUTCDay() === 0 || selected.getUTCDay() === 6)
    selected.setUTCDate(selected.getUTCDate() + 1);
  const year = selected.getUTCFullYear();
  const month = selected.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return (
    <div className="landing-hero-visual">
      <div className="landing-orbit orbit-one" />
      <div className="landing-orbit orbit-two" />
      <span className="landing-visual-spark spark-one">+</span>
      <span className="landing-visual-spark spark-two">+</span>
      <div className="landing-booking-card">
        <div className="landing-booking-bar">
          <span>
            <span />
            <span />
            <span />
          </span>
          <span>
            <Link2 size={10} />
            slotly / you / quick-chat
          </span>
          <ShieldCheck size={13} />
        </div>
        <div className="landing-booking-preview" aria-hidden="true">
          <div className="landing-preview-host">
            <span className="landing-preview-avatar">Y</span>
            <div>
              <span>A LITTLE TIME WITH YOU</span>
              <h3>Quick chat</h3>
              <p>A little time to connect, ask a question, or say hello.</p>
            </div>
          </div>
          <div className="landing-preview-meta">
            <span>
              <Clock3 size={12} />
              15 minutes
            </span>
            <span>
              <Globe2 size={12} />
              Your timezone
            </span>
          </div>
          <div className="landing-preview-calendar">
            <div className="landing-preview-month">
              {first.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
              <span>
                <ChevronLeft size={13} />
                <ChevronRight size={13} />
              </span>
            </div>
            <div className="landing-preview-days">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <span
                  className="landing-preview-weekday"
                  key={`weekday-${index}`}
                >
                  {day}
                </span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`empty-${i}`} />
              ))}
              {Array.from({ length }, (_, i) => (
                <span
                  className={i + 1 === selected.getUTCDate() ? "chosen" : ""}
                  key={i}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
          <div className="landing-preview-times">
            <span>9:00 AM</span>
            <span className="chosen">
              9:15 AM
              <Check size={12} />
            </span>
            <span>9:30 AM</span>
          </div>
        </div>
        <div className="landing-preview-footer">
          <span className="status-dot" />A BOOKING PAGE PREVIEW
          <Link to="/demo">
            Try the demo
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
      <div className="landing-confirmation-tag" aria-hidden="true">
        <span>
          <Check size={19} />
        </span>
        <div>
          <strong>A little time, reserved.</strong>
          <small>Quick chat, 15 minutes, just you two</small>
        </div>
      </div>
      <span className="landing-visual-caption">
        A simple link. A good conversation.
      </span>
    </div>
  );
}
