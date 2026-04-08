-- Add request type for dedicated meter 30/100 1 phase workflow without repurposing METER
alter table public.service_requests
  drop constraint if exists service_requests_request_type_check;

alter table public.service_requests
  add constraint service_requests_request_type_check
  check (request_type in ('METER', 'METER_30_100_1P', 'METER_TO_3PHASE', 'EXPANSION'));
