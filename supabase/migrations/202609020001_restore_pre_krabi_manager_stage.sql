-- WAIT_MANAGER_REVIEW is the post-billing manager stage and requires both
-- invoice signature and payment. 30/100 requests use a separate manager stage
-- before Krabi, where billing has not happened yet.
update public.service_requests
set
  status = 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL',
  updated_at = now()
where request_type in ('METER_30_100_1P', 'METER_30_100_3P')
  and status = 'WAIT_MANAGER_REVIEW'
  and billed_at is null
  and invoice_signed_at is null
  and paid_at is null;

alter table public.service_requests
  drop constraint if exists service_requests_manager_review_prerequisites_check;

alter table public.service_requests
  add constraint service_requests_manager_review_prerequisites_check check (
    status <> 'WAIT_MANAGER_REVIEW'
    or (
      request_type not in ('METER_30_100_1P', 'METER_30_100_3P')
      and invoice_signed_at is not null
      and paid_at is not null
    )
  );
