alter table public.service_requests
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by text;

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
        'SURVEY_COMPLETED',
        'WAIT_BILLING',
        'BILLED',
        'WAIT_SURVEYOR_SIGN',
        'WAIT_PAYMENT',
        'WAIT_MANAGER_REVIEW',
        'COMPLETED'
      )
    );

create index if not exists idx_service_requests_wait_manager_review
  on public.service_requests (request_type, status)
  where status = 'WAIT_MANAGER_REVIEW';
