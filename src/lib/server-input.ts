import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

// Shared by server-function validators and handlers; never runs in the browser.
export function text(value: unknown, label: string, max = 200, required = true) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new Error(`Please enter a valid ${label}.`);
  return value.trim();
}

export function integer(value: unknown, label: string, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Invalid ${label}.`);
  return value;
}

export function timezone(value: unknown) {
  const zone = text(value, "timezone", 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
  } catch {
    throw new Error("Choose a valid timezone.");
  }
  return zone;
}

export async function requireOwner() {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session || session.user.banned)
    throw new Error("Please sign in to manage your scheduling workspace.");
  return session.user;
}

export async function saveSafely<T>(
  query: PromiseLike<T>,
  duplicateMessage = "That value is already in use.",
) {
  try {
    return await query;
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : "";
    if (/unique/i.test(cause)) throw new Error(duplicateMessage);
    console.error(
      "Slotly database write failed",
      cause || (error instanceof Error ? error.name : "Unknown error"),
    );
    throw new Error("We could not save this change. Please try again.");
  }
}
