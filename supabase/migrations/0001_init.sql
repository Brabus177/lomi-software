-- Field-team garbage-route tracker schema
-- Run via supabase db push or paste into the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------- TABLES ----------

create table if not exists districts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (owner, slug)
);

create table if not exists maps (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  district_id uuid references districts(id) on delete set null,
  label text not null,
  image_url text not null,
  image_w int not null,
  image_h int not null,
  georef_points jsonb,           -- [{px, py, lat, lng}, ...]
  georef_transform jsonb,        -- affine matrix coefficients
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  map_id uuid not null references maps(id) on delete restrict,
  title text,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  color text not null default '#2563eb',
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);
create index if not exists teams_session_idx on teams(session_id);
create index if not exists teams_token_idx on teams(share_token);

create table if not exists positions (
  id bigserial primary key,
  team_id uuid not null references teams(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  accuracy double precision,
  ts timestamptz not null default now()
);
create index if not exists positions_team_ts_idx on positions(team_id, ts desc);

create table if not exists bags (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  note text,
  photo_url text,
  ts timestamptz not null default now()
);
create index if not exists bags_team_idx on bags(team_id, ts desc);

-- ---------- TOKEN RESOLUTION ----------

-- Resolve share_token -> team_id (security-definer so anon can call it without
-- being able to SELECT the teams table directly).
create or replace function team_id_for_token(p_token text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from teams where share_token = p_token limit 1;
$$;

grant execute on function team_id_for_token(text) to anon, authenticated;

-- Public team metadata view (only what the field app needs)
create or replace function team_info_for_token(p_token text)
returns table (
  team_id uuid,
  team_name text,
  team_color text,
  session_id uuid,
  map_id uuid,
  map_image_url text,
  map_image_w int,
  map_image_h int,
  map_georef_transform jsonb
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.name, t.color, s.id, m.id, m.image_url, m.image_w, m.image_h, m.georef_transform
  from teams t
  join sessions s on s.id = t.session_id
  join maps m on m.id = s.map_id
  where t.share_token = p_token
  limit 1;
$$;

grant execute on function team_info_for_token(text) to anon, authenticated;

-- ---------- RLS ----------

alter table districts enable row level security;
alter table maps      enable row level security;
alter table sessions  enable row level security;
alter table teams     enable row level security;
alter table positions enable row level security;
alter table bags      enable row level security;

-- Admin (owner) policies: full CRUD on their own rows
create policy districts_owner_all on districts
  for all using (owner = auth.uid()) with check (owner = auth.uid());

create policy maps_owner_all on maps
  for all using (owner = auth.uid()) with check (owner = auth.uid());

create policy sessions_owner_all on sessions
  for all using (owner = auth.uid()) with check (owner = auth.uid());

create policy teams_owner_all on teams
  for all using (
    exists (select 1 from sessions s where s.id = session_id and s.owner = auth.uid())
  ) with check (
    exists (select 1 from sessions s where s.id = session_id and s.owner = auth.uid())
  );

create policy positions_owner_select on positions
  for select using (
    exists (
      select 1 from teams t join sessions s on s.id = t.session_id
      where t.id = team_id and s.owner = auth.uid()
    )
  );

create policy bags_owner_all on bags
  for all using (
    exists (
      select 1 from teams t join sessions s on s.id = t.session_id
      where t.id = team_id and s.owner = auth.uid()
    )
  ) with check (
    exists (
      select 1 from teams t join sessions s on s.id = t.session_id
      where t.id = team_id and s.owner = auth.uid()
    )
  );

-- Anonymous field-team writes via share_token in a request header.
-- The field app sends header `x-team-token: <share_token>` on every request.
-- We resolve it inside the policy.
create or replace function current_team_id()
returns uuid
language sql
stable
as $$
  select team_id_for_token(
    nullif(current_setting('request.headers', true)::json->>'x-team-token', '')
  );
$$;

create policy positions_team_insert on positions
  for insert with check (team_id = current_team_id());

create policy bags_team_insert on bags
  for insert with check (team_id = current_team_id());

create policy bags_team_select on bags
  for select using (team_id = current_team_id());

create policy positions_team_select on positions
  for select using (team_id = current_team_id());

-- ---------- REALTIME ----------

alter publication supabase_realtime add table positions;
alter publication supabase_realtime add table bags;
