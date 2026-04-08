alter table public.service_requests
  add column if not exists house_number text,
  add column if not exists village_no text,
  add column if not exists road text,
  add column if not exists landmark text;
