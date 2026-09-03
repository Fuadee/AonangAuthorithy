begin;

lock table public.service_requests in share row exclusive mode;

do $$
declare
  status_counts jsonb;
  unmapped_counts jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(grouped_counts) order by request_type, status, flow_type), '[]'::jsonb)
  into status_counts
  from (
    select request_type, status, flow_type, count(*) as record_count
    from public.service_requests
    where status in ('WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION', 'WAIT_PAYMENT', 'BILL_ISSUED')
    group by request_type, status, flow_type
  ) as grouped_counts;

  raise notice 'financial workflow status counts before migration: %', status_counts;

  select coalesce(jsonb_agg(to_jsonb(grouped_counts) order by request_type, status, flow_type), '[]'::jsonb)
  into unmapped_counts
  from (
    select request_type, status, flow_type, count(*) as record_count
    from public.service_requests
    where
      (
        status in ('WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION', 'WAIT_PAYMENT')
        and request_type not in ('METER', 'METER_TO_3PHASE', 'METER_30_100_1P', 'METER_30_100_3P')
      )
      or (
        status = 'BILL_ISSUED'
        and request_type <> 'EXPANSION'
        and flow_type <> 'EXPANSION'
      )
    group by request_type, status, flow_type
  ) as grouped_counts;

  if unmapped_counts <> '[]'::jsonb then
    raise exception 'Unmapped financial workflow records; migration aborted: %', unmapped_counts;
  end if;
end
$$;

-- The old database guard required invoice signature and payment records before
-- WAIT_MANAGER_REVIEW. Financial verification now belongs to the manager and
-- is performed against evidence outside this request-tracking system.
alter table public.service_requests
  drop constraint if exists service_requests_manager_review_prerequisites_check;

update public.service_requests
set status = 'WAIT_MANAGER_REVIEW', updated_at = now()
where status in ('WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION', 'WAIT_PAYMENT')
  and request_type in ('METER', 'METER_TO_3PHASE');

update public.service_requests
set status = 'WAIT_AONANG_MANAGER_FINAL_APPROVAL', updated_at = now()
where status in ('WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION', 'WAIT_PAYMENT')
  and request_type in ('METER_30_100_1P', 'METER_30_100_3P');

update public.service_requests
set status = 'COORDINATED_WITH_CONSTRUCTION', updated_at = now()
where status = 'BILL_ISSUED'
  and (request_type = 'EXPANSION' or flow_type = 'EXPANSION');

do $$
declare
  remaining_count bigint;
begin
  select count(*)
  into remaining_count
  from public.service_requests
  where status in ('WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION', 'WAIT_PAYMENT', 'BILL_ISSUED');

  if remaining_count <> 0 then
    raise exception 'Financial workflow records remain after migration: %', remaining_count;
  end if;

  raise notice 'financial workflow status counts after migration: 0';
end
$$;

alter table public.service_requests
  drop constraint if exists service_requests_status_check;

alter table public.service_requests
  add constraint service_requests_status_check check (
    status in (
      'NEW', 'PENDING_SURVEY_REVIEW', 'SURVEY_ACCEPTED', 'SURVEY_DOCS_INCOMPLETE', 'SURVEY_RESCHEDULE_REQUESTED', 'SURVEY_COMPLETED',
      'WAIT_LAYOUT_DRAWING', 'WAITING_TO_SEND_TO_KRABI', 'SENT_TO_KRABI', 'WAIT_KRABI_DOCUMENT_CHECK', 'KRABI_NEEDS_DOCUMENT_FIX',
      'KRABI_IN_PROGRESS', 'KRABI_ESTIMATION_COMPLETED', 'COORDINATED_WITH_CONSTRUCTION',
      'WAIT_DOCUMENT_REVIEW', 'WAIT_DOCUMENT_FROM_CUSTOMER', 'READY_FOR_SURVEY', 'IN_SURVEY', 'WAIT_CUSTOMER_FIX', 'WAIT_FIX_REVIEW',
      'READY_FOR_RESURVEY', 'SURVEY_OVERLOAD_REPORTED', 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL', 'WAIT_KRABI_APPROVAL',
      'KRABI_NEEDS_CORRECTION', 'DOCUMENT_FIX', 'RESENT_TO_KRABI', 'KRABI_APPROVED', 'WAIT_RECEIVE_FROM_KRABI',
      'WAIT_ELIGIBILITY_REVIEW', 'WAIT_AONANG_MANAGER_FINAL_APPROVAL', 'CHECK_3PHASE_CAPABILITY', 'NEEDS_EXPANSION',
      'DESIGN_AND_ESTIMATE', 'INSTALLATION', 'INSPECTION', 'WAIT_MANAGER_REVIEW', 'RETURNED_FOR_RESURVEY',
      'COMPLETED', 'COMPLETED_OVERLOAD_FORWARD'
    )
  );

drop index if exists public.idx_service_requests_wait_billing;
drop index if exists public.idx_service_requests_wait_payment;
drop index if exists public.idx_service_requests_wait_action_confirmation;

-- Keep billing/invoice/payment columns unchanged for historical audit data.

commit;
