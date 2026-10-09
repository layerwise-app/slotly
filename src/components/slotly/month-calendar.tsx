import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthCalendar({
  month,
  setMonth,
  selected,
  onSelect,
  disablePast = true,
  counts,
}: {
  month: string;
  setMonth: (month: string) => void;
  selected?: string;
  onSelect: (date: string) => void;
  disablePast?: boolean;
  counts?: Record<string, number>;
}) {
  const [year, number] = month.split("-").map(Number);
  const first = new Date(year!, number! - 1, 1);
  const length = new Date(year!, number!, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const shift = (by: number) => {
    const date = new Date(year!, number! - 1 + by, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  };
  return (
    <div className="month-calendar">
      <div className="month-heading">
        <h3>
          {first.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div>
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => shift(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => shift(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="month-grid">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
          <span className="weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const disabled =
            disablePast &&
            (date < todayKey || Date.parse(date) > Date.now() + 180 * 86400000);
          return (
            <button
              key={date}
              disabled={disabled}
              aria-label={`${date}${counts?.[date] ? `, ${counts[date]} bookings` : ""}`}
              aria-pressed={selected === date}
              className={`calendar-day ${selected === date ? "selected" : ""} ${date === todayKey ? "today" : ""}`}
              onClick={() => onSelect(date)}
            >
              {i + 1}
              {counts?.[date] ? <span className="booking-dot" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
