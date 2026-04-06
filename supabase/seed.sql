insert into public.areas (code, name)
values
  ('AREA_1', 'อ่าวนาง'),
  ('AREA_2', 'หนองทะเล'),
  ('AREA_3', 'ไสไทย')
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

insert into public.survey_schedules (surveyor_name, area_id, area_code, area, weekday, max_jobs_per_day, active)
select
  seed.surveyor_name,
  areas.id,
  areas.code,
  areas.name,
  seed.weekday,
  seed.max_jobs_per_day,
  true
from (
  values
    ('นาย A', 'AREA_1', 'Monday', 5),
    ('นาย A', 'AREA_1', 'Wednesday', 5),
    ('นาย B', 'AREA_2', 'Tuesday', 5),
    ('นาย B', 'AREA_2', 'Thursday', 5),
    ('นาย B', 'AREA_3', 'Tuesday', 5),
    ('นาย B', 'AREA_3', 'Thursday', 5)
) as seed(surveyor_name, area_code, weekday, max_jobs_per_day)
join public.areas areas on areas.code = seed.area_code
on conflict (surveyor_name, area_code, weekday) do update
set
  area_id = excluded.area_id,
  area = excluded.area,
  max_jobs_per_day = excluded.max_jobs_per_day,
  active = excluded.active,
  updated_at = now();

update public.survey_schedules schedules
set area_id = areas.id,
    area_code = areas.code,
    area = areas.name,
    updated_at = now()
from public.areas areas
where (schedules.area_id = areas.id or schedules.area_code = areas.code)
  and not (
    coalesce(schedules.area_code, areas.code) = 'AREA_2'
    and coalesce(schedules.area, '') = 'พื้นที่ 2'
  )
  and (
    schedules.area_id is distinct from areas.id
    or schedules.area_code is distinct from areas.code
    or schedules.area is distinct from areas.name
  );

update public.service_requests requests
set area_code = areas.code,
    area_name = areas.name,
    updated_at = now()
from public.areas areas
where requests.area_id = areas.id
  and not (
    coalesce(requests.area_code, areas.code) = 'AREA_2'
    and coalesce(requests.area_name, '') = 'พื้นที่ 2'
  )
  and (requests.area_code is distinct from areas.code or requests.area_name is distinct from areas.name);

update public.service_requests
set request_type = 'METER'
where request_type is null;
