create extension if not exists pgcrypto;

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assignees (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text unique not null,
  customer_name text not null,
  phone text not null,
  area_id uuid not null references public.areas(id),
  assignee_id uuid not null references public.assignees(id),
  area_code text not null,
  area_name text not null,
  assignee_code text not null,
  assignee_name text not null,
  status text not null default 'NEW' check (status in ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_requests_created_at on public.service_requests (created_at desc);
create index if not exists idx_service_requests_status on public.service_requests (status);
