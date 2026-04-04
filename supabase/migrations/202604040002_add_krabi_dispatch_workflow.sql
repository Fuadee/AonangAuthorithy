alter table public.service_requests
  add column if not exists ready_to_send_krabi_at timestamptz,
  add column if not exists queued_for_dispatch_at timestamptz,
  add column if not exists planned_dispatch_date date,
  add column if not exists dispatched_to_krabi_at timestamptz,
  add column if not exists dispatched_to_krabi_by text,
  add column if not exists krabi_received_at timestamptz,
  add column if not exists krabi_in_progress_at timestamptz,
  add column if not exists krabi_completed_at timestamptz;

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
      'WAIT_LAYOUT_DRAWING',
      'READY_TO_SEND_KRABI',
      'QUEUED_FOR_KRABI_DISPATCH',
      'SENT_TO_KRABI',
      'KRABI_IN_PROGRESS',
      'KRABI_ESTIMATION_COMPLETED',
      'WAIT_DOCUMENT_REVIEW',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'IN_SURVEY',
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'READY_FOR_RESURVEY',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW',
      'COMPLETED'
    )
  );

update public.service_requests
set ready_to_send_krabi_at = coalesce(ready_to_send_krabi_at, updated_at)
where status = 'READY_TO_SEND_KRABI'
  and ready_to_send_krabi_at is null;

create index if not exists idx_service_requests_ready_to_send_krabi
  on public.service_requests (status, planned_dispatch_date)
  where status in ('READY_TO_SEND_KRABI', 'QUEUED_FOR_KRABI_DISPATCH');
