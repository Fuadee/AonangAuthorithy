import { isAreaCode, type AreaCode } from '@/lib/requests/areas';

export const WEEKDAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type Weekday = (typeof WEEKDAY_ORDER)[number];

export const FIXED_SURVEY_SCHEDULE: Record<
  AreaCode,
  {
    surveyorName: string;
    weekdays: Weekday[];
  }
> = {
  AREA_1: {
    surveyorName: 'นาย เดชา เกาะกลาง',
    weekdays: ['Monday', 'Wednesday']
  },
  AREA_2: {
    surveyorName: 'นาย ชัยยุทธ สายนุ้ย',
    weekdays: ['Tuesday', 'Thursday']
  },
  AREA_3: {
    surveyorName: 'นาย ชัยยุทธ สายนุ้ย',
    weekdays: ['Tuesday', 'Thursday']
  }
};

export function getFixedSurveyScheduleByAreaCode(areaCode: string): { surveyorName: string; weekdays: Weekday[] } | null {
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

  const parsedDate = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const weekday = WEEKDAY_ORDER[parsedDate.getUTCDay()];
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

  const parsedDate = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const weekday = WEEKDAY_ORDER[parsedDate.getUTCDay()];
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

  const cursor = new Date(fromDateUtc);
  cursor.setUTCDate(cursor.getUTCDate() + 1);

  for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
    const candidate = new Date(cursor);
    candidate.setUTCDate(cursor.getUTCDate() + dayOffset);
    const weekday = WEEKDAY_ORDER[candidate.getUTCDay()];

    if (fixedSchedule.weekdays.includes(weekday)) {
      return formatDateOnlyUtc(candidate);
    }
  }

  return null;
}
