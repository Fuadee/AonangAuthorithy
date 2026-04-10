alter table public.service_requests
  add column if not exists request_intent text check (request_intent in ('NEW_METER', 'UPSCALE', 'RELOCATE', 'PHASE_UPGRADE', 'EXPANSION')),
  add column if not exists meter_size text check (meter_size in ('NORMAL', 'THIRTY_ONE_HUNDRED')),
  add column if not exists phase text check (phase in ('ONE_PHASE', 'THREE_PHASE'));

update public.service_requests
set
  request_intent = case
    when request_type = 'EXPANSION' then 'EXPANSION'
    when request_type = 'METER_TO_3PHASE' then 'PHASE_UPGRADE'
    else coalesce(request_intent, 'NEW_METER')
  end,
  meter_size = case
    when request_type in ('METER_30_100_1P', 'METER_30_100_3P') then 'THIRTY_ONE_HUNDRED'
    when request_type = 'EXPANSION' then null
    else coalesce(meter_size, 'NORMAL')
  end,
  phase = case
    when request_type in ('METER_TO_3PHASE', 'METER_30_100_3P') then 'THREE_PHASE'
    when request_type = 'EXPANSION' then null
    else coalesce(phase, 'ONE_PHASE')
  end
where request_intent is null or meter_size is null or phase is null;
