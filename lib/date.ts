// All dates are stored as ISO calendar days: "yyyy-mm-dd".
// Helpers here work purely on local calendar days to avoid timezone drift.

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse "yyyy-mm-dd" as a LOCAL date at midnight (not UTC).
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// Whole-day difference: b - a (positive if b is after a).
export function daysBetween(a: string, b: string): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

// Monday-based start of the ISO week containing `iso`.
export function startOfWeek(iso: string): string {
  const d = parseISO(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

// "Monday"
export function weekdayName(iso: string): string {
  return WEEKDAYS[parseISO(iso).getDay()];
}

// "13 Jul"
export function formatShort(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// "13 Jul 2026"
export function formatLong(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayInitial(iso: string): string {
  return DAY_INITIALS[parseISO(iso).getDay()];
}

// Descending clone of a list sorted by an ISO date field.
export function sortByDateDesc<T>(items: T[], key: (t: T) => string): T[] {
  return [...items].sort((a, b) => key(b).localeCompare(key(a)));
}

export function sortByDateAsc<T>(items: T[], key: (t: T) => string): T[] {
  return [...items].sort((a, b) => key(a).localeCompare(key(b)));
}
