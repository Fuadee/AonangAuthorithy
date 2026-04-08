create extension if not exists pg_trgm;

alter table public.service_requests
  add column if not exists search_text text;

create or replace function public.build_service_request_search_text(
  p_customer_name text,
  p_phone text,
  p_house_number text,
  p_village_no text,
  p_road text,
  p_landmark text,
  p_area_name text
)
returns text
language sql
immutable
as $$
  select trim(
    concat_ws(
      ' ',
      nullif(trim(coalesce(p_customer_name, '')), ''),
      nullif(trim(coalesce(p_phone, '')), ''),
      nullif(trim(coalesce(p_house_number, '')), ''),
      case
        when nullif(trim(coalesce(p_house_number, '')), '') is not null then format('บ้านเลขที่ %s', trim(p_house_number))
        else null
      end,
      nullif(trim(coalesce(p_village_no, '')), ''),
      case
        when nullif(trim(coalesce(p_village_no, '')), '') is not null then format('หมู่ %s', trim(p_village_no))
        else null
      end,
      nullif(trim(coalesce(p_road, '')), ''),
      nullif(trim(coalesce(p_landmark, '')), ''),
      nullif(trim(coalesce(p_area_name, '')), ''),
      case
        when nullif(trim(coalesce(p_area_name, '')), '') is not null then format('ต.%s', trim(p_area_name))
        else null
      end
    )
  );
$$;

create or replace function public.service_requests_set_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.build_service_request_search_text(
    new.customer_name,
    new.phone,
    new.house_number,
    new.village_no,
    new.road,
    new.landmark,
    new.area_name
  );
  return new;
end;
$$;

drop trigger if exists trg_service_requests_set_search_text on public.service_requests;
create trigger trg_service_requests_set_search_text
before insert or update of customer_name, phone, house_number, village_no, road, landmark, area_name
on public.service_requests
for each row
execute function public.service_requests_set_search_text();

update public.service_requests
set search_text = public.build_service_request_search_text(
  customer_name,
  phone,
  house_number,
  village_no,
  road,
  landmark,
  area_name
);

create index if not exists idx_service_requests_search_text_trgm
  on public.service_requests
  using gin (search_text gin_trgm_ops);
