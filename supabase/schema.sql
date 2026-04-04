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
  latitude double precision,
  longitude double precision,
  location_note text,
  area_id uuid not null references public.areas(id),
  assignee_id uuid not null references public.assignees(id),
  area_code text not null,
  area_name text not null,
  assignee_code text not null,
  assignee_name text not null,
  assigned_surveyor text,
  scheduled_survey_date date,
  survey_date_initial date,
  survey_date_current date,
  previous_survey_date date,
  request_type text not null default 'METER' check (request_type in ('METER', 'EXPANSION')),
  status text not null default 'NEW' check (status in ('NEW', 'PENDING_SURVEY_REVIEW', 'SURVEY_ACCEPTED', 'SURVEY_DOCS_INCOMPLETE', 'SURVEY_RESCHEDULE_REQUESTED', 'SURVEY_COMPLETED', 'WAIT_LAYOUT_DRAWING', 'READY_TO_SEND_KRABI', 'QUEUED_FOR_KRABI_DISPATCH', 'SENT_TO_KRABI', 'KRABI_IN_PROGRESS', 'KRABI_ESTIMATION_COMPLETED', 'WAIT_DOCUMENT_REVIEW', 'WAIT_DOCUMENT_FROM_CUSTOMER', 'READY_FOR_SURVEY', 'IN_SURVEY', 'WAIT_CUSTOMER_FIX', 'WAIT_FIX_REVIEW', 'READY_FOR_RESURVEY', 'WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION', 'WAIT_MANAGER_REVIEW', 'COMPLETED')),
  survey_note text,
  survey_reschedule_date date,
  survey_rescheduled_at timestamptz,
  survey_reschedule_reason text,
  survey_reviewed_at timestamptz,
  survey_completed_at timestamptz,
  survey_result text check (survey_result in ('PASS', 'FAIL')),
  fix_verification_mode text check (fix_verification_mode in ('PHOTO_OR_RESURVEY', 'RESURVEY_ONLY')),
  customer_fix_note text,
  customer_fix_reported_at timestamptz,
  photo_review_status text check (photo_review_status in ('PENDING', 'APPROVED', 'REJECTED')),
  photo_reviewed_at timestamptz,
  photo_reviewed_by text,
  fix_approved_via text check (fix_approved_via in ('PHOTO', 'RESURVEY')),
  document_status text check (document_status in ('COMPLETE', 'INCOMPLETE')) ,
  collect_docs_on_site boolean not null default false,
  documents_received_at timestamptz,
  awaiting_customer_documents_since timestamptz,
  allow_proceed_with_incomplete_docs boolean not null default false,
  incomplete_docs_note text,
  proceed_override_by text,
  proceed_override_at timestamptz,
  proceed_override_reason text,
  billing_amount numeric(12, 2),
  billing_note text,
  billed_at timestamptz,
  billed_by text,
  invoice_signed_at timestamptz,
  invoice_signed_by text,
  paid_at timestamptz,
  paid_by text,
  ready_to_send_krabi_at timestamptz,
  queued_for_dispatch_at timestamptz,
  planned_dispatch_date date,
  dispatched_to_krabi_at timestamptz,
  dispatched_to_krabi_by text,
  krabi_received_at timestamptz,
  krabi_in_progress_at timestamptz,
  krabi_completed_at timestamptz,
  constraint service_requests_location_coordinates_pair
    check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_requests_created_at on public.service_requests (created_at desc);
create index if not exists idx_service_requests_status on public.service_requests (status);
create index if not exists idx_service_requests_request_type on public.service_requests (request_type);
create index if not exists idx_survey_schedules_area_active on public.survey_schedules (area_code, active);
create index if not exists idx_service_requests_survey_queue on public.service_requests (assigned_surveyor, scheduled_survey_date);

create index if not exists idx_service_requests_surveyor_status on public.service_requests (assigned_surveyor, status, scheduled_survey_date);

create index if not exists idx_service_requests_wait_billing on public.service_requests (request_type, status) where status = 'WAIT_BILLING';
create index if not exists idx_service_requests_wait_action_confirmation on public.service_requests (request_type, status) where status = 'WAIT_ACTION_CONFIRMATION';
create index if not exists idx_service_requests_wait_manager_review on public.service_requests (request_type, status) where status = 'WAIT_MANAGER_REVIEW';
create index if not exists idx_service_requests_ready_to_send_krabi on public.service_requests (status, planned_dispatch_date) where status in ('READY_TO_SEND_KRABI', 'QUEUED_FOR_KRABI_DISPATCH');
