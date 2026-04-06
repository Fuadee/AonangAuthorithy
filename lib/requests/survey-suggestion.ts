import { isAreaCode, type AreaCode } from '@/lib/requests/areas';
import { getResponsibleByAreaCode } from '@/lib/requests/area-responsible';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const WEEKDAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type SurveySchedule = {
  id: string;
  surveyor_name: string;
  area_code: AreaCode;
  area: string;
  weekday: Weekday;
  max_jobs_per_day: number;
  active: boolean;
};

export type Weekday = (typeof WEEKDAY_ORDER)[number];

export type SuggestionMissReason = 'INVALID_AREA_CODE' | 'AREA_NOT_FOUND' | 'NO_SCHEDULE_FOR_AREA' | 'ONLY_INACTIVE_SCHEDULE';

export type SurveySuggestionResult = {
  area_code: string;
  schedules: Array<{
    surveyor_name: string;
    weekday: Weekday;
    max_jobs_per_day: number;
  }>;
  suggestion: {
    surveyor: string;
    suggested_date: string;
    current_jobs: number;
    max_jobs_per_day: number;
  } | null;
  message?: string;
  reason?: SuggestionMissReason;
};

export type SurveySuggestionDebug = {
  input_area_code: string;
  area_exists: boolean;
  total_schedule_rows: number;
  active_schedule_rows: number;
  schedule_areas: string[];
};

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getNextDateForWeekday(baseDate: Date, weekday: Weekday): Date {
  const target = WEEKDAY_ORDER.indexOf(weekday);
  const current = baseDate.getUTCDay();
  const offset = (target - current + 7) % 7;
  return addDays(baseDate, offset);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getSuggestedSurveyByArea(areaCodeInput: string): Promise<{ result: SurveySuggestionResult; debug: SurveySuggestionDebug }> {
  const supabase = createServerSupabaseClient();
  const areaCode = areaCodeInput.trim();

  if (!isAreaCode(areaCode)) {
    return {
      result: {
        area_code: areaCode,
        schedules: [],
        suggestion: null,
        reason: 'INVALID_AREA_CODE',
        message: 'รหัสพื้นที่ไม่ถูกต้อง'
      },
      debug: {
        input_area_code: areaCode,
        area_exists: false,
        total_schedule_rows: 0,
        active_schedule_rows: 0,
        schedule_areas: []
      }
    };
  }

  const { data: areaRow, error: areaError } = await supabase
    .from('areas')
    .select('code')
    .eq('code', areaCode)
    .maybeSingle();

  if (areaError) {
    throw new Error(areaError.message);
  }

  if (!areaRow) {
    return {
      result: {
        area_code: areaCode,
        schedules: [],
        suggestion: null,
        reason: 'AREA_NOT_FOUND',
        message: 'ไม่พบพื้นที่นี้ในระบบ'
      },
      debug: {
        input_area_code: areaCode,
        area_exists: false,
        total_schedule_rows: 0,
        active_schedule_rows: 0,
        schedule_areas: []
      }
    };
  }

  const { data: allSchedules, error: allSchedulesError } = await supabase
    .from('survey_schedules')
    .select('id,surveyor_name,area_code,area,weekday,max_jobs_per_day,active')
    .eq('area_code', areaCode)
    .order('weekday', { ascending: true });

  if (allSchedulesError) {
    throw new Error(allSchedulesError.message);
  }

  const typedSchedules = (allSchedules ?? []) as SurveySchedule[];
  const activeSchedules = typedSchedules.filter((item) => item.active);
  const mappedResponsible = getResponsibleByAreaCode(areaCode);
  const mappedSchedules =
    mappedResponsible === null ? [] : activeSchedules.filter((item) => item.surveyor_name === mappedResponsible);

  const baseDebug: SurveySuggestionDebug = {
    input_area_code: areaCode,
    area_exists: true,
    total_schedule_rows: typedSchedules.length,
    active_schedule_rows: mappedSchedules.length,
    schedule_areas: typedSchedules.map((item) => item.area_code)
  };

  if (!typedSchedules.length) {
    return {
      result: {
        area_code: areaCode,
        schedules: [],
        suggestion: null,
        reason: 'NO_SCHEDULE_FOR_AREA',
        message: 'ไม่พบพื้นที่ในตาราง schedule'
      },
      debug: baseDebug
    };
  }

  if (!activeSchedules.length) {
    return {
      result: {
        area_code: areaCode,
        schedules: [],
        suggestion: null,
        reason: 'ONLY_INACTIVE_SCHEDULE',
        message: 'schedule ของพื้นที่นี้มีแต่ inactive'
      },
      debug: baseDebug
    };
  }

  if (!mappedSchedules.length) {
    return {
      result: {
        area_code: areaCode,
        schedules: [],
        suggestion: null,
        reason: 'NO_SCHEDULE_FOR_AREA',
        message: 'ยังไม่พบตารางคิวที่ตรงกับผู้รับผิดชอบตามพื้นที่'
      },
      debug: baseDebug
    };
  }

  const today = startOfTodayUtc();

  for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
    const pivotDate = addDays(today, dayOffset);

    for (const schedule of mappedSchedules) {
      const candidateDate = getNextDateForWeekday(pivotDate, schedule.weekday);
      if (formatDateOnly(candidateDate) !== formatDateOnly(pivotDate)) {
        continue;
      }

      const dateOnly = formatDateOnly(candidateDate);

      const { count, error: countError } = await supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_surveyor', schedule.surveyor_name)
        .eq('scheduled_survey_date', dateOnly);

      if (countError) {
        throw new Error(countError.message);
      }

      const currentJobs = count ?? 0;
      if (currentJobs < schedule.max_jobs_per_day) {
        return {
          result: {
            area_code: areaCode,
            schedules: mappedSchedules.map((item) => ({
              surveyor_name: item.surveyor_name,
              weekday: item.weekday,
              max_jobs_per_day: item.max_jobs_per_day
            })),
            suggestion: {
              surveyor: schedule.surveyor_name,
              suggested_date: dateOnly,
              current_jobs: currentJobs,
              max_jobs_per_day: schedule.max_jobs_per_day
            }
          },
          debug: baseDebug
        };
      }
    }
  }

  return {
    result: {
      area_code: areaCode,
      schedules: mappedSchedules.map((item) => ({
        surveyor_name: item.surveyor_name,
        weekday: item.weekday,
        max_jobs_per_day: item.max_jobs_per_day
      })),
      suggestion: null,
      message: 'ไม่พบคิวว่างในช่วง 60 วันข้างหน้า'
    },
    debug: baseDebug
  };
}
