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

alter table public.service_requests
add column if not exists assigned_surveyor text,
add column if not exists scheduled_survey_date date;

create index if not exists idx_survey_schedules_area_active
  on public.survey_schedules (area_id, active);

create index if not exists idx_service_requests_survey_queue
  on public.service_requests (assigned_surveyor, scheduled_survey_date);
