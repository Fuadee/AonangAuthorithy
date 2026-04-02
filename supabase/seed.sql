insert into public.areas (code, name)
values
  ('AREA_1', 'พื้นที่ 1'),
  ('AREA_2', 'พื้นที่ 2')
on conflict (code) do update
set name = excluded.name;

insert into public.assignees (code, name, is_active)
values
  ('STAFF_A', 'นาย A', true),
  ('STAFF_B', 'นาย B', true)
on conflict (code) do update
set
  name = excluded.name,
  is_active = excluded.is_active;

update public.service_requests
set request_type = 'METER'
where request_type is null;
