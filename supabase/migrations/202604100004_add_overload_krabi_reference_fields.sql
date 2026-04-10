alter table public.service_requests
  add column if not exists krabi_reference_no text,
  add column if not exists krabi_submitted_at timestamptz,
  add column if not exists krabi_submitted_by uuid;
