alter table public.service_requests
  add column if not exists forwarded_to_expansion_at timestamptz,
  add column if not exists forwarded_to_expansion_note text;

alter table public.service_requests
  drop constraint if exists service_requests_request_type_check;

alter table public.service_requests
  add constraint service_requests_request_type_check
  check (request_type in ('METER', 'METER_TO_3PHASE', 'EXPANSION'));

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
      'WAITING_TO_SEND_TO_KRABI',
      'SENT_TO_KRABI',
      'WAIT_KRABI_DOCUMENT_CHECK',
      'KRABI_NEEDS_DOCUMENT_FIX',
      'KRABI_IN_PROGRESS',
      'KRABI_ESTIMATION_COMPLETED',
      'BILL_ISSUED',
      'COORDINATED_WITH_CONSTRUCTION',
      'WAIT_DOCUMENT_REVIEW',
      'WAIT_DOCUMENT_FROM_CUSTOMER',
      'READY_FOR_SURVEY',
      'IN_SURVEY',
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'READY_FOR_RESURVEY',
      'CHECK_3PHASE_CAPABILITY',
      'NEEDS_EXPANSION',
      'DESIGN_AND_ESTIMATE',
      'WAIT_BILLING',
      'WAIT_PAYMENT',
      'INSTALLATION',
      'INSPECTION',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW',
      'COMPLETED'
    )
  );
