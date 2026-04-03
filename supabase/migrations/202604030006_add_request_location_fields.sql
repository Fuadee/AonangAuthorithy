alter table public.service_requests
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_note text;

alter table public.service_requests
  drop constraint if exists service_requests_location_coordinates_pair;

alter table public.service_requests
  add constraint service_requests_location_coordinates_pair
    check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null));
