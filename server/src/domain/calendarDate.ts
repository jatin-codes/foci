const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) return false;

  // Round-tripping rejects dates that match the pattern but do not exist (e.g. 2025-02-30).
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && toCalendarDate(parsed) === value;
}

export function toCalendarDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}
