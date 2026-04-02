create extension if not exists pgcrypto;

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assignees (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.survey_schedules (
  id uuid primary key default gen_random_uuid(),
  surveyor_name text not null,
  area_id uuid not null references public.areas(id),
  area_code text not null references public.areas(code),
  area text not null,
  weekday text not null check (weekday in ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  max_jobs_per_day integer not null check (max_jobs_per_day > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (surveyor_name, area_code, weekday)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null,
  customer_name text not null,
  phone text not null,
  area_id uuid not null references public.areas(id),
  assignee_id uuid not null references public.assignees(id),
  area_code text not null,
  area_name text not null,
  assignee_code text not null,
  assignee_name text not null,
  assigned_surveyor text,
  scheduled_survey_date date,
  request_type text not null default 'METER' check (request_type in ('METER', 'EXPANSION')),
  status text not null default 'NEW' check (status in ('NEW', 'PENDING_SURVEY_REVIEW', 'SURVEY_ACCEPTED', 'SURVEY_DOCS_INCOMPLETE', 'SURVEY_RESCHEDULE_REQUESTED', 'SURVEY_COMPLETED')),
  survey_note text,
  survey_reschedule_date date,
  survey_reviewed_at timestamptz,
  survey_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_requests_created_at on public.service_requests (created_at desc);
create index if not exists idx_service_requests_status on public.service_requests (status);
create index if not exists idx_service_requests_request_type on public.service_requests (request_type);
create index if not exists idx_survey_schedules_area_active on public.survey_schedules (area_code, active);
create index if not exists idx_service_requests_survey_queue on public.service_requests (assigned_surveyor, scheduled_survey_date);

create index if not exists idx_service_requests_surveyor_status on public.service_requests (assigned_surveyor, status, scheduled_survey_date);
