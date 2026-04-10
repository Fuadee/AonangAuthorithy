alter table public.service_requests
  add column if not exists survey_round int not null default 1;

update public.service_requests
set survey_round = 1
where survey_round is null;
