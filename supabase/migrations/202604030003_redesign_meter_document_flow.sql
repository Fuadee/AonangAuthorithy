alter table public.service_requests
  add column if not exists collect_docs_on_site boolean not null default false;

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
        'WAIT_DOCUMENT_REVIEW',
        'WAIT_DOCUMENT_FROM_CUSTOMER',
        'READY_FOR_SURVEY',
        'IN_SURVEY',
        'WAIT_BILLING',
        'WAIT_ACTION_CONFIRMATION',
        'WAIT_MANAGER_REVIEW',
        'COMPLETED'
      )
    );

update public.service_requests
set status = 'WAIT_DOCUMENT_FROM_CUSTOMER'
where status = 'WAIT_DOCUMENT_FOLLOWUP';

create index if not exists idx_service_requests_wait_document_from_customer
  on public.service_requests (request_type, status)
  where status = 'WAIT_DOCUMENT_FROM_CUSTOMER';

create index if not exists idx_service_requests_ready_for_survey
  on public.service_requests (request_type, status)
  where status = 'READY_FOR_SURVEY';
