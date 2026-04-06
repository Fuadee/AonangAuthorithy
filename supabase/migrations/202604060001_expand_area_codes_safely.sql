-- Expand area master for new operations while preserving ambiguous legacy AREA_2 records.

insert into public.areas (code, name)
values
  ('AREA_1', 'อ่าวนาง'),
  ('AREA_2', 'หนองทะเล'),
  ('AREA_3', 'ไสไทย')
on conflict (code) do update
set name = excluded.name;

-- Do not remap old AREA_2 request/schedule rows automatically.
-- Legacy rows can remain with historical area_name = 'พื้นที่ 2' and be shown as legacy area in UI.
