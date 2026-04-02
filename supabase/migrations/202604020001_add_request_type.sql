alter table public.service_requests
add column if not exists request_type text;

update public.service_requests
set request_type = 'METER'
where request_type is null;

alter table public.service_requests
alter column request_type set default 'METER',
alter column request_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'service_requests_request_type_check'
  ) then
    alter table public.service_requests
    add constraint service_requests_request_type_check
    check (request_type in ('METER', 'EXPANSION'));
  end if;
end;
$$;

create index if not exists idx_service_requests_request_type
  on public.service_requests (request_type);
