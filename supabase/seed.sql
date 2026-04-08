insert into public.areas (code, name)
values
  ('AREA_1', 'อ่าวนาง'),
  ('AREA_2', 'หนองทะเล'),
  ('AREA_3', 'ไสไทย')
on conflict (code) do update
set name = excluded.name;

insert into public.assignees (code, name, is_active)
values
  ('STAFF_A', 'นาย เดชา เกาะกลาง', true),
  ('STAFF_B', 'นาย ชัยยุทธ สายนุ้ย', true)
on conflict (code) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

create unique index if not exists survey_schedules_unique_assignee_area_weekday
on public.survey_schedules (assignee_id, area_id, weekday);

insert into public.survey_schedules (
  assignee_id,
  assignee_code,
  surveyor_name,
  area_id,
  area_code,
  area,
  weekday,
  max_jobs_per_day,
  active
)
select
  assignees.id,
  assignees.code,
  assignees.name,
  areas.id,
  areas.code,
  areas.name,
  seed.weekday,
  seed.max_jobs_per_day,
  true
from (
  values
    ('STAFF_A', 'AREA_1', 'Monday', 5),
    ('STAFF_A', 'AREA_1', 'Wednesday', 5),
    ('STAFF_B', 'AREA_2', 'Tuesday', 5),
    ('STAFF_B', 'AREA_2', 'Thursday', 5),
    ('STAFF_B', 'AREA_3', 'Tuesday', 5),
    ('STAFF_B', 'AREA_3', 'Thursday', 5)
) as seed(assignee_code, area_code, weekday, max_jobs_per_day)
join public.assignees assignees on assignees.code = seed.assignee_code
join public.areas areas on areas.code = seed.area_code
on conflict (assignee_id, area_id, weekday) do update
set
  assignee_code = excluded.assignee_code,
  surveyor_name = excluded.surveyor_name,
  area_code = excluded.area_code,
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
  and (
    requests.area_code is distinct from areas.code
    or requests.area_name is distinct from areas.name
  );

update public.service_requests
set request_type = 'METER'
where request_type is null;