import { isAreaCode, type AreaCode } from '@/lib/requests/areas';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  WEEKDAY_ORDER,
  type Weekday,
  formatDateOnlyUtc,
  getFixedSurveyScheduleByAreaCode
} from '@/lib/requests/fixed-survey-schedule';

export type SurveySchedule = {
  id: string;
  surveyor_name: string;
  area_code: AreaCode;
  area: string;
  weekday: Weekday;
  max_jobs_per_day: number;
  active: boolean;
};

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
  const fixedSchedule = getFixedSurveyScheduleByAreaCode(areaCode);
  const mappedSchedules =
    fixedSchedule === null
      ? []
      : activeSchedules.filter((item) => item.surveyor_name === fixedSchedule.surveyorName && fixedSchedule.weekdays.includes(item.weekday));

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

  if (!fixedSchedule) {
    return {
      result: {
        area_code: areaCode,
        schedules: [],
        suggestion: null,
        reason: 'NO_SCHEDULE_FOR_AREA',
        message: 'ยังไม่พบตารางคิวแบบ fixed schedule สำหรับพื้นที่นี้'
      },
      debug: baseDebug
    };
  }

  const fixedSchedules = fixedSchedule.weekdays.map((weekday) => {
    const matchingActiveSchedule = mappedSchedules.find((item) => item.weekday === weekday);
    return {
      surveyor_name: fixedSchedule.surveyorName,
      weekday,
      max_jobs_per_day: matchingActiveSchedule?.max_jobs_per_day ?? 5
    };
  });

  const today = startOfTodayUtc();
  const searchStartDate = addDays(today, 1);

  for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
    const candidateDate = addDays(searchStartDate, dayOffset);
    const candidateWeekday = WEEKDAY_ORDER[candidateDate.getUTCDay()];
    const matchingFixedSchedule = fixedSchedules.find((item) => item.weekday === candidateWeekday);

    if (!matchingFixedSchedule) {
      continue;
    }

    const dateOnly = formatDateOnlyUtc(candidateDate);

    const { count, error: countError } = await supabase
      .from('service_requests')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_surveyor', fixedSchedule.surveyorName)
      .eq('scheduled_survey_date', dateOnly);

    if (countError) {
      throw new Error(countError.message);
    }

    const currentJobs = count ?? 0;
    if (currentJobs < matchingFixedSchedule.max_jobs_per_day) {
      return {
        result: {
          area_code: areaCode,
          schedules: fixedSchedules,
          suggestion: {
            surveyor: fixedSchedule.surveyorName,
            suggested_date: dateOnly,
            current_jobs: currentJobs,
            max_jobs_per_day: matchingFixedSchedule.max_jobs_per_day
          }
        },
        debug: baseDebug
      };
    }
  }

  return {
    result: {
      area_code: areaCode,
      schedules: fixedSchedules,
      suggestion: null,
      message: 'ไม่พบคิวว่างในช่วง 60 วันข้างหน้า'
    },
    debug: baseDebug
  };
}
