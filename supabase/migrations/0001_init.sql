create extension if not exists "pgcrypto";

create type request_type as enum ('METER', 'EXTENSION');
create type request_status as enum (
  'NEW',
  'PRELIM_CHECKED',
  'WAITING_SURVEY_ASSIGNMENT',
  'WAITING_SURVEYOR_DOCUMENT_REVIEW',
  'DOCUMENT_READY_FOR_SURVEY',
  'DOCUMENT_INCOMPLETE',
  'NEED_MORE_INFO',
  'SURVEY_SCHEDULED',
  'SURVEY_COMPLETED',
  'METER_WAITING_ICS',
  'METER_WAITING_INVOICE',
  'METER_WAITING_PAYMENT',
  'METER_WAITING_APPROVAL',
  'METER_WAITING_INSTALL_QUEUE',
  'METER_INSTALL_SCHEDULED',
  'METER_INSTALLED',
  'EXT_WAITING_SUMMARY',
  'EXT_WAITING_HQ_SUBMISSION',
  'EXT_SUBMITTED_TO_HQ',
  'EXT_WAITING_DECISION',
  'CLOSED'
);
create type review_result as enum ('READY', 'INCOMPLETE', 'NEED_INFO');

create table roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_th text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  area_code text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique default ('REQ-' || to_char(now(),'YYYYMM') || '-' || lpad((floor(random()*99999))::text,5,'0')),
  request_type request_type not null,
  current_status request_status not null default 'NEW',
  current_owner_id uuid not null references profiles(id),
  area_code text not null,
  customer_name text not null,
  customer_phone text not null,
  supply_address text not null,
  prelim_check_ok boolean not null default false,
  survey_doc_verified boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint chk_closed_at check ((current_status = 'CLOSED' and closed_at is not null) or (current_status <> 'CLOSED'))
);

create table request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  document_type text not null,
  storage_bucket text not null default 'request-documents',
  storage_path text not null,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table document_requirements (
  id uuid primary key default gen_random_uuid(),
  request_type request_type not null,
  document_type text not null,
  required_at_stage request_status not null,
  is_required boolean not null default true,
  unique(request_type, document_type, required_at_stage)
);

create table document_review_checks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  review_result review_result not null,
  missing_items text[] not null default '{}',
  note text,
  reviewed_at timestamptz not null default now(),
  constraint chk_missing_items_when_incomplete check ((review_result <> 'INCOMPLETE') or (cardinality(missing_items) > 0))
);

create table request_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  from_user_id uuid references profiles(id),
  to_user_id uuid not null references profiles(id),
  assigned_by uuid not null references profiles(id),
  reason text,
  assigned_at timestamptz not null default now()
);

create table request_activities (
  id bigint generated always as identity primary key,
  request_id uuid not null references service_requests(id) on delete cascade,
  actor_id uuid references profiles(id),
  activity_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table request_status_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references service_requests(id) on delete cascade,
  from_status request_status,
  to_status request_status not null,
  changed_by uuid not null references profiles(id),
  note text,
  changed_at timestamptz not null default now()
);

create table survey_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references service_requests(id) on delete cascade,
  survey_date date not null,
  summary text not null,
  recommendation text,
  attachment_path text,
  surveyed_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table meter_workflows (
  request_id uuid primary key references service_requests(id) on delete cascade,
  ics_reference text,
  ics_completed_at timestamptz,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table extension_workflows (
  request_id uuid primary key references service_requests(id) on delete cascade,
  hq_reference text,
  hq_submitted_at timestamptz,
  hq_decision text,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references service_requests(id) on delete cascade,
  invoice_no text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  issued_at timestamptz not null,
  due_at timestamptz,
  created_by uuid not null references profiles(id)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  paid_amount numeric(12,2) not null check (paid_amount > 0),
  paid_at timestamptz not null,
  payment_ref text,
  created_by uuid not null references profiles(id)
);

create table installation_queues (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references service_requests(id) on delete cascade,
  install_date date not null,
  slot_no int not null,
  team_name text,
  status text not null default 'SCHEDULED',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique(install_date, slot_no)
);

create table installation_assignments (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references installation_queues(id) on delete cascade,
  technician_user_id uuid not null references profiles(id),
  assigned_by uuid not null references profiles(id),
  assigned_at timestamptz not null default now()
);

create table sla_policies (
  id uuid primary key default gen_random_uuid(),
  policy_code text not null unique,
  from_status request_status not null,
  max_days int not null check (max_days > 0),
  active boolean not null default true
);

create index idx_requests_status_owner on service_requests(current_status, current_owner_id);
create index idx_requests_area_status on service_requests(area_code, current_status);
create index idx_requests_updated_at on service_requests(updated_at);
create index idx_activities_request_created on request_activities(request_id, created_at desc);
create index idx_status_history_request_changed on request_status_history(request_id, changed_at desc);
create index idx_assignments_request_time on request_assignments(request_id, assigned_at desc);
create index idx_doc_review_request_time on document_review_checks(request_id, reviewed_at desc);

create or replace function transition_service_request(
  p_request_id uuid,
  p_from_status request_status,
  p_to_status request_status,
  p_actor_id uuid,
  p_note text default null
)
returns void
language plpgsql
as $$
begin
  update service_requests
  set current_status = p_to_status,
      updated_at = now(),
      closed_at = case when p_to_status = 'CLOSED' then now() else closed_at end
  where id = p_request_id and current_status = p_from_status;

  if not found then
    raise exception 'transition failed for request % from %', p_request_id, p_from_status;
  end if;

  insert into request_status_history(request_id, from_status, to_status, changed_by, note)
  values (p_request_id, p_from_status, p_to_status, p_actor_id, p_note);

  insert into request_activities(request_id, actor_id, activity_type, payload)
  values (p_request_id, p_actor_id, 'STATUS_CHANGED', jsonb_build_object('from', p_from_status, 'to', p_to_status, 'note', p_note));
end;
$$;

create or replace function assign_request_owner(
  p_request_id uuid,
  p_assignee_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns void
language plpgsql
as $$
declare
  v_old_owner uuid;
begin
  select current_owner_id into v_old_owner from service_requests where id = p_request_id;

  update service_requests
  set current_owner_id = p_assignee_id,
      updated_at = now()
  where id = p_request_id;

  insert into request_assignments(request_id, from_user_id, to_user_id, assigned_by, reason)
  values (p_request_id, v_old_owner, p_assignee_id, p_actor_id, p_note);

  insert into request_activities(request_id, actor_id, activity_type, payload)
  values (p_request_id, p_actor_id, 'ASSIGNED', jsonb_build_object('from', v_old_owner, 'to', p_assignee_id, 'note', p_note));
end;
$$;

create view v_sla_overdue_requests as
select sr.id as request_id, sr.request_no, sr.current_status, sr.updated_at
from service_requests sr
join sla_policies sp on sp.from_status = sr.current_status and sp.active
where now() > sr.updated_at + make_interval(days => sp.max_days);

create view v_stale_requests as
select *
from service_requests
where current_status <> 'CLOSED'
  and updated_at < now() - interval '3 day';

create view v_request_aging as
select
  current_status,
  count(*)::int as total,
  count(*) filter (where updated_at < now() - interval '1 day')::int as gt_1d,
  count(*) filter (where updated_at < now() - interval '3 day')::int as gt_3d,
  count(*) filter (where updated_at < now() - interval '7 day')::int as gt_7d
from service_requests
where current_status <> 'CLOSED'
group by current_status;
