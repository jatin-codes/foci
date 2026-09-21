import { describe, expect, it } from 'vitest';
import { isCalendarDate, toCalendarDate } from '../../src/domain/calendarDate.js';

describe('isCalendarDate', () => {
  it.each(['2025-01-01', '2024-02-29', '1999-12-31'])('accepts %s', (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each([
    ['a non-existent day', '2025-02-30'],
    ['a leap day in a non-leap year', '2025-02-29'],
    ['an out-of-range month', '2025-13-01'],
    ['a day-first format', '01-02-2025'],
    ['unpadded parts', '2025-1-5'],
    ['a full timestamp', '2025-01-01T00:00:00Z'],
    ['free text', 'tomorrow'],
    ['an empty string', ''],
  ])('rejects %s (%s)', (_reason, value) => {
    expect(isCalendarDate(value)).toBe(false);
  });
});

describe('toCalendarDate', () => {
  it('returns the UTC calendar date of an instant', () => {
    expect(toCalendarDate(new Date('2025-06-15T23:59:59.999Z'))).toBe('2025-06-15');
  });
});
