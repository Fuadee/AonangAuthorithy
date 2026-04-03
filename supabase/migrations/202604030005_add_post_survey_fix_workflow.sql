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
      'WAIT_CUSTOMER_FIX',
      'WAIT_FIX_REVIEW',
      'READY_FOR_RESURVEY',
      'WAIT_BILLING',
      'WAIT_ACTION_CONFIRMATION',
      'WAIT_MANAGER_REVIEW',
      'COMPLETED'
    )
  );

alter table public.service_requests
  add column if not exists survey_result text,
  add column if not exists fix_verification_mode text,
  add column if not exists customer_fix_note text,
  add column if not exists customer_fix_reported_at timestamptz,
  add column if not exists photo_review_status text,
  add column if not exists photo_reviewed_at timestamptz,
  add column if not exists photo_reviewed_by text,
  add column if not exists fix_approved_via text;

alter table public.service_requests
  drop constraint if exists service_requests_survey_result_check,
  add constraint service_requests_survey_result_check check (survey_result in ('PASS', 'FAIL'));

alter table public.service_requests
  drop constraint if exists service_requests_fix_verification_mode_check,
  add constraint service_requests_fix_verification_mode_check check (fix_verification_mode in ('PHOTO_OR_RESURVEY', 'RESURVEY_ONLY'));

alter table public.service_requests
  drop constraint if exists service_requests_photo_review_status_check,
  add constraint service_requests_photo_review_status_check check (photo_review_status in ('PENDING', 'APPROVED', 'REJECTED'));

alter table public.service_requests
  drop constraint if exists service_requests_fix_approved_via_check,
  add constraint service_requests_fix_approved_via_check check (fix_approved_via in ('PHOTO', 'RESURVEY'));
