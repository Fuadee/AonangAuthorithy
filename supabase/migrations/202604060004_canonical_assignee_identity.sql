-- Canonicalize surveyor identity to assignee.id across schedules and service requests.

alter table public.survey_schedules
  add column if not exists assignee_id uuid;

alter table public.survey_schedules
  add column if not exists assignee_code text;

alter table public.service_requests
  add column if not exists assigned_surveyor_id uuid;

insert into public.assignees (code, name, is_active)
values
  ('STAFF_A', 'นาย เดชา เกาะกลาง', true),
  ('STAFF_B', 'นาย ชัยยุทธ สายนุ้ย', true)
on conflict (code) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

update public.survey_schedules schedules
set assignee_id = assignees.id,
    assignee_code = assignees.code,
    surveyor_name = assignees.name,
    updated_at = now()
from public.assignees assignees
where assignees.code = case
  when schedules.surveyor_name in ('นาย A', 'นาย เดชา เกาะกลาง') then 'STAFF_A'
  when schedules.surveyor_name in ('นาย B', 'นาย ชัยยุทธ สายนุ้ย') then 'STAFF_B'
  when upper(coalesce(schedules.assignee_code, '')) in ('STAFF_A', 'STAFF_B') then upper(schedules.assignee_code)
  else null
end
  and (
    schedules.assignee_id is distinct from assignees.id
    or schedules.assignee_code is distinct from assignees.code
    or schedules.surveyor_name is distinct from assignees.name
  );

update public.service_requests requests
set assigned_surveyor_id = assignees.id,
    assigned_surveyor = assignees.name,
    updated_at = now()
from public.assignees assignees
where assignees.code = case
  when requests.assigned_surveyor in ('นาย A', 'นาย เดชา เกาะกลาง') then 'STAFF_A'
  when requests.assigned_surveyor in ('นาย B', 'นาย ชัยยุทธ สายนุ้ย') then 'STAFF_B'
  when requests.assignee_code in ('STAFF_A', 'STAFF_B') then requests.assignee_code
  else null
end
  and (
    requests.assigned_surveyor_id is distinct from assignees.id
    or requests.assigned_surveyor is distinct from assignees.name
  );

update public.service_requests requests
set assigned_surveyor_id = assignees.id,
    updated_at = now()
from public.assignees assignees
where requests.assigned_surveyor_id is null
  and requests.assignee_code = assignees.code;

update public.survey_schedules schedules
set surveyor_name = assignees.name,
    updated_at = now()
from public.assignees assignees
where schedules.assignee_id = assignees.id
  and schedules.surveyor_name is distinct from assignees.name;

alter table public.survey_schedules
  drop constraint if exists survey_schedules_surveyor_name_area_code_weekday_key;

alter table public.survey_schedules
  drop constraint if exists survey_schedules_surveyor_name_area_id_weekday_key;

create unique index if not exists survey_schedules_assignee_area_weekday_key
  on public.survey_schedules (assignee_id, area_code, weekday)
  where assignee_id is not null;

create index if not exists idx_survey_schedules_assignee_area_active
  on public.survey_schedules (assignee_id, area_code, active);

alter table public.survey_schedules
  drop constraint if exists survey_schedules_assignee_id_fkey;

alter table public.survey_schedules
  add constraint survey_schedules_assignee_id_fkey
  foreign key (assignee_id) references public.assignees(id);

alter table public.service_requests
  drop constraint if exists service_requests_assigned_surveyor_id_fkey;

alter table public.service_requests
  add constraint service_requests_assigned_surveyor_id_fkey
  foreign key (assigned_surveyor_id) references public.assignees(id);

create index if not exists idx_service_requests_assigned_surveyor_id_date
  on public.service_requests (assigned_surveyor_id, scheduled_survey_date);

create index if not exists idx_service_requests_assigned_surveyor_id_status_date
  on public.service_requests (assigned_surveyor_id, status, scheduled_survey_date);

-- Keep only canonical fixed schedule rows by assignee+area+weekday.
delete from public.survey_schedules schedules
where schedules.active = true
  and (
    (schedules.area_code = 'AREA_1' and (schedules.assignee_code <> 'STAFF_A' or schedules.weekday not in ('Monday', 'Wednesday')))
    or (schedules.area_code = 'AREA_2' and (schedules.assignee_code <> 'STAFF_B' or schedules.weekday not in ('Tuesday', 'Thursday')))
    or (schedules.area_code = 'AREA_3' and (schedules.assignee_code <> 'STAFF_B' or schedules.weekday not in ('Tuesday', 'Thursday')))
  );

insert into public.survey_schedules (assignee_id, assignee_code, surveyor_name, area_id, area_code, area, weekday, max_jobs_per_day, active)
select
  assignees.id,
  assignees.code,
  assignees.name,
  areas.id,
  areas.code,
  areas.name,
  seed.weekday,
  5,
  true
from (
  values
    ('STAFF_A', 'AREA_1', 'Monday'),
    ('STAFF_A', 'AREA_1', 'Wednesday'),
    ('STAFF_B', 'AREA_2', 'Tuesday'),
    ('STAFF_B', 'AREA_2', 'Thursday'),
    ('STAFF_B', 'AREA_3', 'Tuesday'),
    ('STAFF_B', 'AREA_3', 'Thursday')
) as seed(assignee_code, area_code, weekday)
join public.assignees assignees on assignees.code = seed.assignee_code
join public.areas areas on areas.code = seed.area_code
on conflict (assignee_id, area_code, weekday) do update
set
  assignee_code = excluded.assignee_code,
  surveyor_name = excluded.surveyor_name,
  area_id = excluded.area_id,
  area = excluded.area,
  max_jobs_per_day = excluded.max_jobs_per_day,
  active = excluded.active,
  updated_at = now();

-- Backfill safety log marker for operational verification.
do $$
begin
  raise notice '[survey-schedule-backfill] done: canonical assignee identity migration applied';
end $$;
