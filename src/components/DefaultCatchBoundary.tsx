import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { SlotlyLogo } from "~/components/slotly/brand";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="public-page">
      <SlotlyLogo />
      <div className="public-missing">
        <h1>A little hiccup in the schedule.</h1>
        <p>
          We could not load this page. Please try again in a moment, or return
          to your workspace.
        </p>
        <div className="error-actions">
          <button
            className="primary-button"
            onClick={() => void router.invalidate()}
          >
            <RefreshCw size={15} />
            Try again
          </button>
          <Link to="/" className="secondary-button">
            Back to Slotly
          </Link>
        </div>
      </div>
    </div>
  );
}
