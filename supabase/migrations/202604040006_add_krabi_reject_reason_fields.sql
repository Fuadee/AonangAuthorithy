alter table public.service_requests
  add column if not exists reject_reason text,
  add column if not exists rejected_by text,
  add column if not exists rejected_at timestamptz;
