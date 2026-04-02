import { createServerSupabaseClient } from '@/lib/supabase/server';

const WEEKDAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type SurveySchedule = {
  id: string;
  surveyor_name: string;
  area_id: string;
  area: string;
  weekday: Weekday;
  max_jobs_per_day: number;
  active: boolean;
};

export type Weekday = (typeof WEEKDAY_ORDER)[number];

export type SurveySuggestionResult = {
  area_id: string;
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

export async function getSuggestedSurveyByArea(areaId: string): Promise<SurveySuggestionResult> {
  const supabase = createServerSupabaseClient();

  const { data: schedules, error: schedulesError } = await supabase
    .from('survey_schedules')
    .select('id,surveyor_name,area_id,area,weekday,max_jobs_per_day,active')
    .eq('area_id', areaId)
    .eq('active', true)
    .order('weekday', { ascending: true });

  if (schedulesError) {
    throw new Error(schedulesError.message);
  }

  const typedSchedules = (schedules ?? []) as SurveySchedule[];

  if (!typedSchedules.length) {
    return {
      area_id: areaId,
      schedules: [],
      suggestion: null,
      message: 'ยังไม่ได้ตั้งตารางสำรวจสำหรับพื้นที่นี้'
    };
  }

  const today = startOfTodayUtc();

  for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
    const pivotDate = addDays(today, dayOffset);

    for (const schedule of typedSchedules) {
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
          area_id: areaId,
          schedules: typedSchedules.map((item) => ({
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
        };
      }
    }
  }

  return {
    area_id: areaId,
    schedules: typedSchedules.map((item) => ({
      surveyor_name: item.surveyor_name,
      weekday: item.weekday,
      max_jobs_per_day: item.max_jobs_per_day
    })),
    suggestion: null,
    message: 'ไม่พบคิวว่างในช่วง 60 วันข้างหน้า'
  };
}
