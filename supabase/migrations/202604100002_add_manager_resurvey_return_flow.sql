alter table public.service_requests
  add column if not exists manager_return_reason text,
  add column if not exists manager_return_checklist jsonb,
  add column if not exists manager_returned_by text,
  add column if not exists manager_returned_at timestamptz,
  add column if not exists resurvey_note text,
  add column if not exists resurvey_completed_at timestamptz;

alter table public.service_requests
  drop constraint if exists service_requests_status_check;

alter table public.service_requests
  add constraint service_requests_status_check check (
    status in (
      'NEW', 'PENDING_SURVEY_REVIEW', 'SURVEY_ACCEPTED', 'SURVEY_DOCS_INCOMPLETE', 'SURVEY_RESCHEDULE_REQUESTED',
      'SURVEY_COMPLETED', 'WAIT_LAYOUT_DRAWING', 'WAITING_TO_SEND_TO_KRABI', 'SENT_TO_KRABI', 'WAIT_KRABI_DOCUMENT_CHECK',
      'KRABI_NEEDS_DOCUMENT_FIX', 'KRABI_IN_PROGRESS', 'KRABI_ESTIMATION_COMPLETED', 'BILL_ISSUED', 'COORDINATED_WITH_CONSTRUCTION',
      'WAIT_DOCUMENT_REVIEW', 'WAIT_DOCUMENT_FROM_CUSTOMER', 'READY_FOR_SURVEY', 'IN_SURVEY', 'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW', 'READY_FOR_RESURVEY', 'SURVEY_OVERLOAD_REPORTED', 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL',
      'WAIT_KRABI_APPROVAL', 'KRABI_NEEDS_CORRECTION', 'DOCUMENT_FIX', 'RESENT_TO_KRABI', 'KRABI_APPROVED',
      'WAIT_RECEIVE_FROM_KRABI', 'WAIT_ELIGIBILITY_REVIEW', 'WAIT_AONANG_MANAGER_FINAL_APPROVAL', 'CHECK_3PHASE_CAPABILITY',
      'NEEDS_EXPANSION', 'DESIGN_AND_ESTIMATE', 'WAIT_BILLING', 'WAIT_PAYMENT', 'INSTALLATION', 'INSPECTION',
      'WAIT_ACTION_CONFIRMATION', 'WAIT_MANAGER_REVIEW', 'RETURNED_FOR_RESURVEY', 'COMPLETED', 'COMPLETED_OVERLOAD_FORWARD'
    )
  );

create index if not exists idx_service_requests_returned_for_resurvey
  on public.service_requests (request_type, status)
  where status = 'RETURNED_FOR_RESURVEY';
