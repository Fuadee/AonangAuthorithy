alter table public.service_requests
  add column if not exists survey_date_initial date,
  add column if not exists survey_date_current date,
  add column if not exists previous_survey_date date,
  add column if not exists survey_rescheduled_at timestamptz,
  add column if not exists survey_reschedule_reason text,
  add column if not exists documents_received_at timestamptz,
  add column if not exists awaiting_customer_documents_since timestamptz;

update public.service_requests
set
  survey_date_initial = coalesce(survey_date_initial, scheduled_survey_date),
  survey_date_current = coalesce(survey_date_current, scheduled_survey_date)
where scheduled_survey_date is not null;
