-- SQL Editor fallback for Roomie; run this entire file once.
-- Applies the original profiles migration and records its history atomically.
-- CLI history format: https://github.com/supabase/cli/blob/develop/apps/cli-go/pkg/migration/history.go
begin;
set local lock_timeout = '4s';
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text not null primary key);
alter table supabase_migrations.schema_migrations add column if not exists statements text[];
alter table supabase_migrations.schema_migrations add column if not exists name text;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- Start private: household-peer visibility will require active membership in milestone 3.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.roomie_stamp_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.display_name := btrim(new.display_name);
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.roomie_stamp_profile() from public, anon, authenticated;
create trigger roomie_profile_updated before update on public.profiles
  for each row execute function public.roomie_stamp_profile();

-- Auth metadata provides a display label only, never permissions or identity.
create function public.roomie_create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 80), ''), 'Roomie member'));
  return new;
end;
$$;
revoke all on function public.roomie_create_profile() from public, anon, authenticated;
create trigger roomie_auth_user_created after insert on auth.users
  for each row execute function public.roomie_create_profile();

-- Include accounts created before the app migration was applied.
insert into public.profiles (id, display_name)
select id, coalesce(nullif(left(btrim(raw_user_meta_data ->> 'display_name'), 80), ''), 'Roomie member')
from auth.users on conflict (id) do nothing;

-- Restrict user deletion to preserve identity/history. Account deletion is outside this milestone.
comment on table public.profiles is 'Auth-linked profiles. Initially self-only access; never a source of authorization.';

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261008000100', 'profiles', array[$roomie_migration$create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- Start private: household-peer visibility will require active membership in milestone 3.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.roomie_stamp_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.display_name := btrim(new.display_name);
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.roomie_stamp_profile() from public, anon, authenticated;
create trigger roomie_profile_updated before update on public.profiles
  for each row execute function public.roomie_stamp_profile();

-- Auth metadata provides a display label only, never permissions or identity.
create function public.roomie_create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 80), ''), 'Roomie member'));
  return new;
end;
$$;
revoke all on function public.roomie_create_profile() from public, anon, authenticated;
create trigger roomie_auth_user_created after insert on auth.users
  for each row execute function public.roomie_create_profile();

-- Include accounts created before the app migration was applied.
insert into public.profiles (id, display_name)
select id, coalesce(nullif(left(btrim(raw_user_meta_data ->> 'display_name'), 80), ''), 'Roomie member')
from auth.users on conflict (id) do nothing;

-- Restrict user deletion to preserve identity/history. Account deletion is outside this milestone.
comment on table public.profiles is 'Auth-linked profiles. Initially self-only access; never a source of authorization.';$roomie_migration$]);
commit;

select version, name, to_regclass('public.profiles') is not null as profiles_created
from supabase_migrations.schema_migrations
where version = '20261008000100';
