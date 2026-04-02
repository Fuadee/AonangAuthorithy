insert into public.areas (code, name)
values
  ('AREA_1', 'พื้นที่ 1'),
  ('AREA_2', 'พื้นที่ 2')
on conflict (code) do update
set name = excluded.name;

insert into public.assignees (code, name, is_active)
values
  ('STAFF_A', 'นาย A', true),
  ('STAFF_B', 'นาย B', true)
on conflict (code) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

insert into public.survey_schedules (surveyor_name, area_id, area, weekday, max_jobs_per_day, active)
select
  seed.surveyor_name,
  areas.id,
  areas.name,
  seed.weekday,
  seed.max_jobs_per_day,
  true
from (
  values
    ('นาย A', 'AREA_1', 'Monday', 5),
    ('นาย A', 'AREA_1', 'Wednesday', 5),
    ('นาย B', 'AREA_2', 'Tuesday', 5),
    ('นาย B', 'AREA_2', 'Thursday', 5)
) as seed(surveyor_name, area_code, weekday, max_jobs_per_day)
join public.areas areas on areas.code = seed.area_code
on conflict (surveyor_name, area_id, weekday) do update
set
  area = excluded.area,
  max_jobs_per_day = excluded.max_jobs_per_day,
  active = excluded.active,
  updated_at = now();

update public.service_requests
set request_type = 'METER'
where request_type is null;
