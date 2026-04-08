-- Add request type for 30/100 3-phase meter requests.
-- This type reuses the 30/100 1-phase workflow after the 3-phase support pre-check passes.

do $$
declare
  check_name text;
begin
  select conname
  into check_name
  from pg_constraint
  where conrelid = 'public.service_requests'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%request_type in%';

  if check_name is not null then
    execute format('alter table public.service_requests drop constraint %I', check_name);
  end if;
end $$;

alter table public.service_requests
  add constraint service_requests_request_type_check
  check (request_type in ('METER', 'METER_30_100_1P', 'METER_30_100_3P', 'METER_TO_3PHASE', 'EXPANSION'));
