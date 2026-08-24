-- One browser form instance owns one submission ID. Existing requests remain null
-- so this migration does not infer duplicates or modify historical workflow data.
alter table public.service_requests
  add column if not exists submission_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_requests'::regclass
      and conname = 'service_requests_submission_id_key'
  ) then
    alter table public.service_requests
      add constraint service_requests_submission_id_key unique (submission_id);
  end if;
end
$$;

comment on column public.service_requests.submission_id is
  'Idempotency key generated once per create-request form instance';
