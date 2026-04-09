alter table public.service_requests
  add column if not exists survey_failure_type text,
  add column if not exists overload_report_reason text,
  add column if not exists overload_report_note text,
  add column if not exists overload_reported_at timestamptz,
  add column if not exists overload_reported_by text,
  add column if not exists manager_overload_approved_at timestamptz,
  add column if not exists manager_overload_approved_by text;

alter table public.service_requests
  drop constraint if exists service_requests_status_check;

alter table public.service_requests
  add constraint service_requests_status_check check (
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
      'SURVEY_OVERLOAD_REPORTED',
      'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL',
      'WAIT_KRABI_APPROVAL',
      'KRABI_NEEDS_CORRECTION',
      'DOCUMENT_FIX',
      'RESENT_TO_KRABI',
      'KRABI_APPROVED',
      'WAIT_RECEIVE_FROM_KRABI',
      'WAIT_ELIGIBILITY_REVIEW',
      'WAIT_AONANG_MANAGER_FINAL_APPROVAL',
      'CHECK_3PHASE_CAPABILITY',
      'NEEDS_EXPANSION',
      'DESIGN_AND_ESTIMATE',
      'WAIT_BILLING',
      'WAIT_PAYMENT',
      'INSTALLATION',
      'INSPECTION',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW',
      'COMPLETED',
      'COMPLETED_OVERLOAD_FORWARD'
    )
  );

alter table public.service_requests
  drop constraint if exists service_requests_survey_failure_type_check,
  add constraint service_requests_survey_failure_type_check
    check (survey_failure_type in ('NORMAL_FIX_REQUIRED', 'OVERLOAD_REPORTED'));

create index if not exists idx_service_requests_overload_wait_manager
  on public.service_requests (status, overload_reported_at)
  where status = 'SURVEY_OVERLOAD_REPORTED';

