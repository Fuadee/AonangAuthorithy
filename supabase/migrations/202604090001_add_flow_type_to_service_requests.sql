alter table public.service_requests
  add column if not exists flow_type text;

update public.service_requests
set flow_type = case
  when request_type = 'EXPANSION' then 'EXPANSION'
  when three_phase_capability_result = 'UNSUPPORTED' then 'EXPANSION'
  when status in (
    'NEEDS_EXPANSION',
    'WAIT_LAYOUT_DRAWING',
    'WAITING_TO_SEND_TO_KRABI',
    'SENT_TO_KRABI',
    'WAIT_KRABI_DOCUMENT_CHECK',
    'KRABI_NEEDS_DOCUMENT_FIX',
    'KRABI_IN_PROGRESS',
    'KRABI_ESTIMATION_COMPLETED',
    'BILL_ISSUED',
    'COORDINATED_WITH_CONSTRUCTION'
  ) then 'EXPANSION'
  else 'METER'
end
where flow_type is null;

alter table public.service_requests
  alter column flow_type set default 'METER';

update public.service_requests
set flow_type = 'METER'
where flow_type is null;

alter table public.service_requests
  alter column flow_type set not null;

alter table public.service_requests
  drop constraint if exists service_requests_flow_type_check;

alter table public.service_requests
  add constraint service_requests_flow_type_check check (flow_type in ('METER', 'EXPANSION'));
