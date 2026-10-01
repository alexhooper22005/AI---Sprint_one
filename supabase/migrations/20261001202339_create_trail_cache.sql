create table public.trails (
  id text primary key,
  name text not null,
  activity text not null check (
    activity in (
      'Hiking',
      'Camping',
      'Dirt biking',
      'Mountain biking',
      'Snowmobiling'
    )
  ),
  location text not null,
  distance_miles double precision check (
    distance_miles is null or distance_miles >= 0
  ),
  difficulty text not null check (difficulty in ('Easy', 'Moderate', 'Hard')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source_url text not null,
  photo jsonb,
  updated_at timestamptz not null default now()
);

create index trails_activity_location_idx
  on public.trails (activity, latitude, longitude);

create table public.trail_search_cache (
  cache_key text primary key,
  response jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index trail_search_cache_expiry_idx
  on public.trail_search_cache (expires_at);

create table public.geocoder_rate_limits (
  service text primary key,
  next_allowed_at timestamptz not null
);

alter table public.geocoder_rate_limits enable row level security;

revoke all on public.geocoder_rate_limits from anon, authenticated;
grant all on public.geocoder_rate_limits to service_role;

create or replace function public.reserve_nominatim_slot()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  wait_milliseconds integer;
begin
  insert into public.geocoder_rate_limits (service, next_allowed_at)
  values ('nominatim', clock_timestamp())
  on conflict (service) do nothing;

  update public.geocoder_rate_limits
  set next_allowed_at = greatest(clock_timestamp(), next_allowed_at) + interval '1 second'
  where service = 'nominatim'
  returning ceil(
    greatest(
      extract(epoch from (next_allowed_at - clock_timestamp())),
      0
    ) * 1000
  )::integer
  into wait_milliseconds;

  return wait_milliseconds;
end;
$$;

revoke all on function public.reserve_nominatim_slot() from public, anon, authenticated;
grant execute on function public.reserve_nominatim_slot() to service_role;

alter table public.trails enable row level security;
alter table public.trail_search_cache enable row level security;

revoke all on public.trails from anon, authenticated;
revoke all on public.trail_search_cache from anon, authenticated;
grant all on public.trails to service_role;
grant all on public.trail_search_cache to service_role;