import { isSupportedIanaTimeZone } from "@/server/tenancy/validation";

export function operationalDateKey(instant: Date, timeZone: string): string {
  assertTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function formatOperationalDateTime(instant: Date, timeZone: string): string {
  assertTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);
}

export function occursOnOperationalDate(
  instant: Date,
  requestedDate: string,
  timeZone: string,
): boolean {
  return operationalDateKey(instant, timeZone) === requestedDate;
}

function assertTimeZone(timeZone: string): void {
  if (!isSupportedIanaTimeZone(timeZone)) {
    throw new Error("Unsupported operational time zone.");
  }
}
