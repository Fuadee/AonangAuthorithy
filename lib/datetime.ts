const THAI_LOCALE = 'th-TH';
const BANGKOK_TIME_ZONE = 'Asia/Bangkok';

// NOTE:
// - Database should store datetime fields as UTC (timestamptz).
// - UI should always render datetime in Asia/Bangkok.
// - Date-only fields (YYYY-MM-DD) must be formatted as date-only to avoid day shifts.

export function safeParseDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function parseDateOnlyAsUtcDate(value: string): Date | null {
  if (!isDateOnly(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function formatBangkokDateParts(date: Date): { year: string; month: string; day: string } | null {
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

function formatWithOptions(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  const parsed = safeParseDate(value);
  if (!parsed) {
    return '-';
  }

  return new Intl.DateTimeFormat(THAI_LOCALE, { timeZone: BANGKOK_TIME_ZONE, ...options }).format(parsed);
}

export function formatThaiDateTime(value: string | number | Date | null | undefined): string {
  return formatWithOptions(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: undefined
  });
}

export function formatThaiDateTimeFull(value: string | number | Date | null | undefined): string {
  return formatWithOptions(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatThaiDate(value: string | number | Date | null | undefined): string {
  return formatWithOptions(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatThaiShortDate(value: string | number | Date | null | undefined): string {
  return formatWithOptions(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatThaiTime(value: string | number | Date | null | undefined): string {
  const formatted = formatWithOptions(value, {
    hour: '2-digit',
    minute: '2-digit'
  });

  return formatted === '-' ? formatted : `${formatted} น.`;
}

export function formatThaiTimelineDate(value: string | number | Date | null | undefined): string {
  return formatThaiDateTimeFull(value);
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const parsed = parseDateOnlyAsUtcDate(value);
  if (!parsed) {
    return '-';
  }

  return new Intl.DateTimeFormat(THAI_LOCALE, {
    timeZone: BANGKOK_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

export function toBangkokDateKey(value: string | number | Date | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' && isDateOnly(value)) {
    const normalized = value.trim();
    return parseDateOnlyAsUtcDate(normalized) ? normalized : null;
  }

  const parsed = safeParseDate(value);
  if (!parsed) {
    return null;
  }

  const parts = formatBangkokDateParts(parsed);
  if (!parts) {
    return null;
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getBangkokTodayDateKey(now: Date = new Date()): string {
  const todayKey = toBangkokDateKey(now);
  if (!todayKey) {
    throw new Error('ไม่สามารถคำนวณวันที่ปัจจุบันของโซนเวลา Asia/Bangkok ได้');
  }

  return todayKey;
}

export function isFutureBangkokDate(value: string | number | Date | null | undefined, now: Date = new Date()): boolean {
  const candidateDateKey = toBangkokDateKey(value);
  if (!candidateDateKey) {
    return false;
  }

  return candidateDateKey > getBangkokTodayDateKey(now);
}

export function toUnixMs(value: string | number | Date | null | undefined): number | null {
  const parsed = safeParseDate(value);
  return parsed ? parsed.getTime() : null;
}
