import {
  daysInMonth,
  getDueDate,
  getLocalDateTimeParts,
  isNotificationWindow,
  normalizeTimeZone,
} from '../_shared/recurrence';

describe('normalizeTimeZone', () => {
  it('keeps a valid IANA timezone', () => {
    expect(normalizeTimeZone('Asia/Singapore')).toBe('Asia/Singapore');
  });

  it('falls back to UTC for missing or invalid values', () => {
    expect(normalizeTimeZone(undefined)).toBe('UTC');
    expect(normalizeTimeZone('')).toBe('UTC');
    expect(normalizeTimeZone('Not/AZone')).toBe('UTC');
  });
});

describe('getLocalDateTimeParts', () => {
  it('uses the user timezone when it is a different calendar day', () => {
    expect(
      getLocalDateTimeParts(new Date('2026-04-30T23:30:00Z'), 'Asia/Singapore'),
    ).toEqual({ year: 2026, month: 5, day: 1, hour: 7, minute: 30 });
  });

  it('handles a negative UTC offset', () => {
    expect(
      getLocalDateTimeParts(new Date('2026-05-01T01:00:00Z'), 'America/New_York'),
    ).toEqual({ year: 2026, month: 4, day: 30, hour: 21, minute: 0 });
  });

  it('falls back to UTC for an invalid zone', () => {
    expect(
      getLocalDateTimeParts(new Date('2026-04-30T23:30:00Z'), 'Not/AZone'),
    ).toEqual({ year: 2026, month: 4, day: 30, hour: 23, minute: 30 });
  });
});

describe('daysInMonth', () => {
  it('handles 30-day months, February, and leap years', () => {
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(31);
  });
});

describe('getDueDate', () => {
  it('clamps day 31 to the last day of an ambiguous month', () => {
    expect(getDueDate(2026, 4, 31)).toEqual({
      year: 2026,
      month: 4,
      day: 30,
      lastDay: 30,
      ambiguous: true,
    });
  });

  it('clamps day 31 to February 28 or 29', () => {
    expect(getDueDate(2026, 2, 31)).toMatchObject({ day: 28, ambiguous: true });
    expect(getDueDate(2024, 2, 31)).toMatchObject({ day: 29, ambiguous: true });
  });

  it('does not mark a valid day as ambiguous', () => {
    expect(getDueDate(2026, 3, 31)).toEqual({
      year: 2026,
      month: 3,
      day: 31,
      lastDay: 31,
      ambiguous: false,
    });
  });
});

describe('isNotificationWindow', () => {
  it('opens at 09:00 local time', () => {
    expect(isNotificationWindow({ hour: 8, minute: 59 }, 9)).toBe(false);
    expect(isNotificationWindow({ hour: 9, minute: 0 }, 9)).toBe(true);
    expect(isNotificationWindow({ hour: 17, minute: 0 }, 9)).toBe(true);
  });
});
