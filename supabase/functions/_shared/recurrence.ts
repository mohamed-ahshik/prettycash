export interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface DueDate {
  year: number;
  month: number;
  day: number;
  lastDay: number;
  ambiguous: boolean;
}

export function normalizeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return 'UTC';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return 'UTC';
  }
}

export function getLocalDateTimeParts(date: Date, timeZone: string): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getDueDate(year: number, month: number, dayOfMonth: number): DueDate {
  const lastDay = daysInMonth(year, month);
  return {
    year,
    month,
    day: Math.min(Math.max(dayOfMonth, 1), lastDay),
    lastDay,
    ambiguous: dayOfMonth > lastDay,
  };
}

export function isNotificationWindow(
  parts: Pick<LocalDateTimeParts, 'hour' | 'minute'>,
  notificationHour: number,
): boolean {
  return parts.hour > notificationHour || (parts.hour === notificationHour && parts.minute >= 0);
}

export function formatLocalDate(parts: Pick<LocalDateTimeParts, 'year' | 'month' | 'day'>): string {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}
