-- Align responsible mapping with production rule:
-- AREA_1 => นาย A, AREA_2 => นาย B, AREA_3 => นาย B.

update public.survey_schedules
set active = false,
    updated_at = now()
where area_code = 'AREA_3'
  and surveyor_name = 'นาย C'
  and active = true;

insert into public.survey_schedules (surveyor_name, area_id, area_code, area, weekday, max_jobs_per_day, active)
select
  'นาย B',
  schedules.area_id,
  schedules.area_code,
  schedules.area,
  schedules.weekday,
  schedules.max_jobs_per_day,
  true
from public.survey_schedules schedules
where schedules.area_code = 'AREA_3'
  and schedules.surveyor_name = 'นาย C'
on conflict (surveyor_name, area_code, weekday) do update
set
  area_id = excluded.area_id,
  area = excluded.area,
  max_jobs_per_day = excluded.max_jobs_per_day,
  active = true,
  updated_at = now();
