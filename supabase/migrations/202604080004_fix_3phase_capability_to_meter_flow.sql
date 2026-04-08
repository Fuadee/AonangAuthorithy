alter table public.service_requests
  add column if not exists three_phase_capability_result text check (three_phase_capability_result in ('SUPPORTED', 'UNSUPPORTED')),
  add column if not exists three_phase_capability_checked_at timestamptz;
