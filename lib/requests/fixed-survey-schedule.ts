import { isAreaCode, type AreaCode } from '@/lib/requests/areas';
import { getBangkokTodayDateKey, toBangkokDateKey } from '@/lib/datetime';

export const WEEKDAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type Weekday = (typeof WEEKDAY_ORDER)[number];

function parseDateOnlyAsUtcDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toBangkokWeekday(dateOnly: string): Weekday | null {
  const parsedDate = parseDateOnlyAsUtcDate(dateOnly);
  if (!parsedDate) {
    return null;
  }

  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long'
  }).format(parsedDate);

  return WEEKDAY_ORDER.find((item) => item === weekday) ?? null;
}

function addDaysToDateOnly(dateOnly: string, days: number): string | null {
  const parsedDate = parseDateOnlyAsUtcDate(dateOnly);
  if (!parsedDate) {
    return null;
  }

  parsedDate.setUTCDate(parsedDate.getUTCDate() + days);
  return parsedDate.toISOString().slice(0, 10);
}

export const FIXED_SURVEY_SCHEDULE: Record<
  AreaCode,
  {
    surveyorCode: string;
    surveyorName: string;
    weekdays: Weekday[];
  }
> = {
  AREA_1: {
    surveyorCode: 'STAFF_A',
    surveyorName: 'นาย เดชา เกาะกลาง',
    weekdays: ['Monday', 'Wednesday']
  },
  AREA_2: {
    surveyorCode: 'STAFF_B',
    surveyorName: 'นาย ชัยยุทธ สายนุ้ย',
    weekdays: ['Tuesday', 'Thursday']
  },
  AREA_3: {
    surveyorCode: 'STAFF_B',
    surveyorName: 'นาย ชัยยุทธ สายนุ้ย',
    weekdays: ['Tuesday', 'Thursday']
  }
};

export function getFixedSurveyScheduleByAreaCode(
  areaCode: string
): { surveyorCode: string; surveyorName: string; weekdays: Weekday[] } | null {
  if (!isAreaCode(areaCode)) {
    return null;
  }

  return FIXED_SURVEY_SCHEDULE[areaCode];
}

export function isDateAllowedForArea(areaCode: string, dateOnly: string): boolean {
  const fixedSchedule = getFixedSurveyScheduleByAreaCode(areaCode);
  if (!fixedSchedule) {
    return false;
  }

  const weekday = toBangkokWeekday(dateOnly);
  if (!weekday) {
    return false;
  }

  return fixedSchedule.weekdays.includes(weekday);
}

export function getAllowedWeekdaysForSurveyor(surveyorName: string): Weekday[] {
  const normalizedName = surveyorName.trim();
  if (!normalizedName) {
    return [];
  }

  const allowedWeekdays = new Set<Weekday>();
  for (const schedule of Object.values(FIXED_SURVEY_SCHEDULE)) {
    if (schedule.surveyorName !== normalizedName) {
      continue;
    }

    for (const weekday of schedule.weekdays) {
      allowedWeekdays.add(weekday);
    }
  }

  return WEEKDAY_ORDER.filter((weekday) => allowedWeekdays.has(weekday));
}

export function getAllowedWeekdaysForArea(areaCode: string): Weekday[] {
  const fixedSchedule = getFixedSurveyScheduleByAreaCode(areaCode);
  if (!fixedSchedule) {
    return [];
  }

  return WEEKDAY_ORDER.filter((weekday) => fixedSchedule.weekdays.includes(weekday));
}

export function isDateAllowedForSurveyor(surveyorName: string, dateOnly: string): boolean {
  const allowedWeekdays = getAllowedWeekdaysForSurveyor(surveyorName);
  if (!allowedWeekdays.length) {
    return false;
  }

  const weekday = toBangkokWeekday(dateOnly);
  if (!weekday) {
    return false;
  }

  return allowedWeekdays.includes(weekday);
}

export function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getNextAllowedDateForArea(areaCode: string, fromDateUtc: Date): string | null {
  const fixedSchedule = getFixedSurveyScheduleByAreaCode(areaCode);
  if (!fixedSchedule) {
    return null;
  }

  const fromDateKey = toBangkokDateKey(fromDateUtc) ?? getBangkokTodayDateKey();

  for (let dayOffset = 1; dayOffset <= 60; dayOffset += 1) {
    const candidateDateKey = addDaysToDateOnly(fromDateKey, dayOffset);
    if (!candidateDateKey) {
      continue;
    }

    const weekday = toBangkokWeekday(candidateDateKey);
    if (!weekday) {
      continue;
    }

    if (fixedSchedule.weekdays.includes(weekday)) {
      return candidateDateKey;
    }
  }

  return null;
}
