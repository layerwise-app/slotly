export const LOCATION_KINDS = [
  "none",
  "video",
  "phone",
  "in_person",
  "custom",
] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];
export const LOCATION_LABELS: Record<LocationKind, string> = {
  none: "No location",
  video: "Video call",
  phone: "Phone call",
  in_person: "In person",
  custom: "Custom",
};

/** Validates a location at the trust boundary; throws a user-facing error. */
export function parseLocation(kind: unknown, value: unknown) {
  if (!LOCATION_KINDS.includes(kind as LocationKind))
    throw new Error("Choose a valid location type.");
  const locationKind = kind as LocationKind;
  const text = typeof value === "string" ? value.trim() : "";
  if (locationKind === "none") return { locationKind, locationValue: "" };
  if (!text || text.length > 300)
    throw new Error("Enter a location of up to 300 characters.");
  if (
    locationKind === "video" &&
    !(URL.canParse(text) && /^https?:$/.test(new URL(text).protocol))
  )
    throw new Error("Enter a full video link starting with https://.");
  if (locationKind === "phone" && !/^\+?[0-9][0-9 ().-]{5,29}$/.test(text))
    throw new Error("Enter a valid phone number.");
  return { locationKind, locationValue: text };
}

// Video links and phone numbers are shared only after a guest books.
export function publicLocation(kind: LocationKind, value: string) {
  return kind === "in_person" || kind === "custom" ? value : "";
}
