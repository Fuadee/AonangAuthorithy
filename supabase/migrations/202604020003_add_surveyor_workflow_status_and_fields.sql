alter table public.service_requests
  add column if not exists survey_note text,
  add column if not exists survey_reschedule_date date,
  add column if not exists survey_reviewed_at timestamptz,
  add column if not exists survey_completed_at timestamptz;

update public.service_requests
set status = case
  when status = 'IN_PROGRESS' then 'SURVEY_ACCEPTED'
  when status = 'COMPLETED' then 'SURVEY_COMPLETED'
  when status = 'CANCELLED' then 'NEW'
  else status
end;

alter table public.service_requests
  drop constraint if exists service_requests_status_check;

alter table public.service_requests
  add constraint service_requests_status_check
  check (
    status in (
      'NEW',
      'PENDING_SURVEY_REVIEW',
      'SURVEY_ACCEPTED',
      'SURVEY_DOCS_INCOMPLETE',
      'SURVEY_RESCHEDULE_REQUESTED',
      'SURVEY_COMPLETED'
    )
  );

create index if not exists idx_service_requests_surveyor_status
  on public.service_requests (assigned_surveyor, status, scheduled_survey_date);
