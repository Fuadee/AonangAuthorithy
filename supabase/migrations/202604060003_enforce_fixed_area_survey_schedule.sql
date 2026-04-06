-- Enforce fixed area -> surveyor -> weekday mapping.
-- AREA_1 => นาย A => Monday, Wednesday
-- AREA_2 => นาย B => Tuesday, Thursday
-- AREA_3 => นาย B => Tuesday, Thursday

update public.survey_schedules
set active = false,
    updated_at = now()
where active = true
  and (
    (area_code = 'AREA_1' and (surveyor_name <> 'นาย A' or weekday not in ('Monday', 'Wednesday')))
    or (area_code = 'AREA_2' and (surveyor_name <> 'นาย B' or weekday not in ('Tuesday', 'Thursday')))
    or (area_code = 'AREA_3' and (surveyor_name <> 'นาย B' or weekday not in ('Tuesday', 'Thursday')))
  );

insert into public.survey_schedules (surveyor_name, area_id, area_code, area, weekday, max_jobs_per_day, active)
select
  seed.surveyor_name,
  areas.id,
  areas.code,
  areas.name,
  seed.weekday,
  5,
  true
from (
  values
    ('นาย A', 'AREA_1', 'Monday'),
    ('นาย A', 'AREA_1', 'Wednesday'),
    ('นาย B', 'AREA_2', 'Tuesday'),
    ('นาย B', 'AREA_2', 'Thursday'),
    ('นาย B', 'AREA_3', 'Tuesday'),
    ('นาย B', 'AREA_3', 'Thursday')
) as seed(surveyor_name, area_code, weekday)
join public.areas areas on areas.code = seed.area_code
on conflict (surveyor_name, area_code, weekday) do update
set
  area_id = excluded.area_id,
  area = excluded.area,
  active = true,
  updated_at = now();
