create table if not exists public.survey_schedules (
  id uuid primary key default gen_random_uuid(),
  surveyor_name text not null,
  area_id uuid not null references public.areas(id),
  area text not null,
  weekday text not null check (weekday in ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  max_jobs_per_day integer not null check (max_jobs_per_day > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (surveyor_name, area_id, weekday)
);

alter table public.survey_schedules
  add column if not exists area_code text;

update public.survey_schedules schedules
set area_code = areas.code
from public.areas areas
where schedules.area_id = areas.id
  and schedules.area_code is null;

alter table public.survey_schedules
  alter column area_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'survey_schedules_area_code_fkey'
  ) then
    alter table public.survey_schedules
      add constraint survey_schedules_area_code_fkey
      foreign key (area_code) references public.areas(code);
  end if;
end $$;


create unique index if not exists ux_survey_schedules_surveyor_area_code_weekday
  on public.survey_schedules (surveyor_name, area_code, weekday);

drop index if exists idx_survey_schedules_area_active;
create index if not exists idx_survey_schedules_area_active
  on public.survey_schedules (area_code, active);

alter table public.service_requests
add column if not exists assigned_surveyor text,
add column if not exists scheduled_survey_date date;

create index if not exists idx_service_requests_survey_queue
  on public.service_requests (assigned_surveyor, scheduled_survey_date);
