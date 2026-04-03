alter table public.service_requests
  add column if not exists document_status text,
  add column if not exists allow_proceed_with_incomplete_docs boolean not null default false,
  add column if not exists incomplete_docs_note text,
  add column if not exists proceed_override_by text,
  add column if not exists proceed_override_at timestamptz,
  add column if not exists proceed_override_reason text;

alter table public.service_requests
  drop constraint if exists service_requests_document_status_check;

alter table public.service_requests
  add constraint service_requests_document_status_check
    check (document_status in ('COMPLETE', 'INCOMPLETE') or document_status is null);

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
        'WAIT_DOCUMENT_FOLLOWUP',
        'WAIT_BILLING',
        'WAIT_ACTION_CONFIRMATION',
        'WAIT_MANAGER_REVIEW',
        'COMPLETED'
      )
    );

update public.service_requests
set status = 'WAIT_DOCUMENT_REVIEW'
where status = 'SURVEY_COMPLETED' and request_type = 'METER';

create index if not exists idx_service_requests_wait_document_review
  on public.service_requests (request_type, status)
  where status = 'WAIT_DOCUMENT_REVIEW';

create index if not exists idx_service_requests_wait_document_followup
  on public.service_requests (request_type, status)
  where status = 'WAIT_DOCUMENT_FOLLOWUP';

create index if not exists idx_service_requests_incomplete_allowed
  on public.service_requests (allow_proceed_with_incomplete_docs, document_status)
  where allow_proceed_with_incomplete_docs = true and document_status = 'INCOMPLETE';
