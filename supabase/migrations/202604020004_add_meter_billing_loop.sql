alter table public.service_requests
  add column if not exists billing_amount numeric(12, 2),
  add column if not exists billing_note text,
  add column if not exists billed_at timestamptz,
  add column if not exists billed_by text,
  add column if not exists surveyor_signed_at timestamptz,
  add column if not exists surveyor_signed_by text,
  add column if not exists payment_note text;

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
      'WAIT_PAYMENT'
    )
  );

create index if not exists idx_service_requests_wait_billing
  on public.service_requests (request_type, status)
  where status = 'WAIT_BILLING';

create index if not exists idx_service_requests_wait_payment
  on public.service_requests (request_type, status)
  where status = 'WAIT_PAYMENT';
