alter table public.service_requests
  add column if not exists invoice_signed_at timestamptz,
  add column if not exists invoice_signed_by text;

-- migrate old surveyor signature columns into new invoice signature fields when present
update public.service_requests
set
  invoice_signed_at = coalesce(invoice_signed_at, surveyor_signed_at),
  invoice_signed_by = coalesce(invoice_signed_by, surveyor_signed_by)
where surveyor_signed_at is not null or surveyor_signed_by is not null;

-- post-billing workflow is now one phase with parallel flags (signed + paid)
update public.service_requests
set status = 'WAIT_ACTION_CONFIRMATION'
where status in ('BILLED', 'WAIT_SURVEYOR_SIGN', 'WAIT_PAYMENT');

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
        'WAIT_ACTION_CONFIRMATION',
        'WAIT_MANAGER_REVIEW',
        'COMPLETED'
      )
    );

drop index if exists idx_service_requests_wait_payment;
create index if not exists idx_service_requests_wait_action_confirmation
  on public.service_requests (request_type, status)
  where status = 'WAIT_ACTION_CONFIRMATION';
