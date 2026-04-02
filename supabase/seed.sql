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

insert into public.survey_schedules (surveyor_name, area_code, area, weekday, max_jobs_per_day, active)
values
  ('นาย A', 'AREA_1', 'พื้นที่ 1', 'Monday', 5, true),
  ('นาย A', 'AREA_1', 'พื้นที่ 1', 'Wednesday', 5, true),
  ('นาย B', 'AREA_2', 'พื้นที่ 2', 'Tuesday', 5, true),
  ('นาย B', 'AREA_2', 'พื้นที่ 2', 'Thursday', 5, true)
on conflict (surveyor_name, area_code, weekday) do update
set
  area = excluded.area,
  max_jobs_per_day = excluded.max_jobs_per_day,
  active = excluded.active,
  updated_at = now();

update public.survey_schedules schedules
set area_code = areas.code,
    area = areas.name,
    updated_at = now()
from public.areas areas
where schedules.area_id = areas.id
  and schedules.area_code is distinct from areas.code;

update public.service_requests requests
set area_code = areas.code,
    area_name = areas.name,
    updated_at = now()
from public.areas areas
where requests.area_id = areas.id
  and (requests.area_code is distinct from areas.code or requests.area_name is distinct from areas.name);

update public.service_requests
set request_type = 'METER'
where request_type is null;
