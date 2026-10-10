-- Roomie milestone 3 SQL Editor fallback. Run the entire file once, after profiles.
-- Applies schema and RPCs and records the original migration in one transaction.
begin;
set local lock_timeout = '4s';
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text not null primary key);
alter table supabase_migrations.schema_migrations add column if not exists statements text[];
alter table supabase_migrations.schema_migrations add column if not exists name text;

create schema if not exists roomie_private;
revoke all on schema roomie_private from public, anon;
grant usage on schema roomie_private to authenticated;

create table public.households (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 1 and 80),
 currency text not null default 'MYR' check (currency = 'MYR'),
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now()
);
create table public.household_members (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict,
 role text not null check (role in ('owner','member')),
 status text not null default 'active' check (status in ('active','left')),
 joined_at timestamptz not null default now(), left_at timestamptz,
 unique (household_id,user_id),
 check ((status='active' and left_at is null) or (status='left' and left_at is not null)),
 check (role <> 'owner' or status='active')
);
create unique index household_one_owner on public.household_members(household_id) where role='owner' and status='active';
create index household_members_user on public.household_members(user_id, household_id) where status='active';
create table public.household_invites (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete restrict,
 code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 max_uses integer not null check (max_uses between 1 and 50),
 use_count integer not null default 0 check (use_count >= 0 and use_count <= max_uses),
 revoked_at timestamptz,
 check (expires_at > created_at)
);
create index household_invites_household on public.household_invites(household_id);

create function roomie_private.is_member(p_household uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.household_members where household_id=p_household and user_id=(select auth.uid()) and status='active');
$$;
create function roomie_private.is_owner(p_household uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.household_members where household_id=p_household and user_id=(select auth.uid()) and status='active' and role='owner');
$$;
create function roomie_private.is_peer(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.household_members mine join public.household_members peer on peer.household_id=mine.household_id
 where mine.user_id=(select auth.uid()) and mine.status='active' and peer.user_id=p_user and peer.status='active');
$$;
revoke all on function roomie_private.is_member(uuid), roomie_private.is_owner(uuid), roomie_private.is_peer(uuid) from public, anon;
grant execute on function roomie_private.is_member(uuid), roomie_private.is_owner(uuid), roomie_private.is_peer(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
revoke all on public.households, public.household_members, public.household_invites from anon, authenticated;
grant select on public.households, public.household_members, public.household_invites to authenticated;
create policy household_read on public.households for select to authenticated using (roomie_private.is_member(id));
create policy members_read on public.household_members for select to authenticated using (roomie_private.is_member(household_id));
create policy invites_owner_read on public.household_invites for select to authenticated using (roomie_private.is_owner(household_id));
create policy profiles_read_household_peer on public.profiles for select to authenticated using (roomie_private.is_peer(id));

create function public.roomie_create_household(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Invalid household name' using errcode='22023'; end if;
 insert into public.households(name,created_by) values(btrim(p_name),v_user) returning id into v_id;
 insert into public.household_members(household_id,user_id,role) values(v_id,v_user,'owner');
 return v_id;
end; $$;

create function public.roomie_create_invite(p_household uuid, p_max_uses integer default 5, p_days integer default 7) returns public.household_invites
language plpgsql security definer set search_path='' as $$
declare v_invite public.household_invites;
begin
 if not roomie_private.is_owner(p_household) then raise exception 'Only the owner can manage invitations' using errcode='42501'; end if;
 if p_max_uses is null or p_max_uses not between 1 and 50 or p_days is null or p_days not between 1 and 30 then raise exception 'Invalid invitation limits' using errcode='22023'; end if;
 insert into public.household_invites(household_id,created_by,expires_at,max_uses)
 values(p_household,auth.uid(),now()+make_interval(days=>p_days),p_max_uses) returning * into v_invite;
 return v_invite;
end; $$;

create function public.roomie_revoke_invite(p_invite uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_household uuid;
begin
 select household_id into v_household from public.household_invites where id=p_invite for update;
 if v_household is null or not roomie_private.is_owner(v_household) then raise exception 'Only the owner can manage invitations' using errcode='42501'; end if;
 update public.household_invites set revoked_at=coalesce(revoked_at,now()) where id=p_invite;
end; $$;

create function public.roomie_join_household(p_code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_invite public.household_invites; v_member public.household_members; v_inserted uuid;
begin
 if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
 -- Lock the invitation so concurrent redemptions cannot exceed its use limit.
 select * into v_invite from public.household_invites where code=upper(btrim(p_code)) for update;
 if v_invite.id is null then raise exception 'Invitation unavailable' using errcode='22023'; end if;
 select * into v_member from public.household_members where household_id=v_invite.household_id and user_id=v_user;
 -- A retry for an existing active member has no second effect, even after the last use.
 if v_member.status='active' then return v_invite.household_id; end if;
 if v_member.status='left' then raise exception 'Rejoining requires owner assistance' using errcode='22023'; end if;
 if v_invite.revoked_at is not null or v_invite.expires_at <= now() or v_invite.use_count >= v_invite.max_uses then
  raise exception 'Invitation unavailable' using errcode='22023';
 end if;
 insert into public.household_members(household_id,user_id,role) values(v_invite.household_id,v_user,'member')
 on conflict(household_id,user_id) do nothing returning id into v_inserted;
 if v_inserted is not null then
  update public.household_invites set use_count=use_count+1 where id=v_invite.id;
 else
  select * into v_member from public.household_members where household_id=v_invite.household_id and user_id=v_user;
  if v_member.status <> 'active' then raise exception 'Rejoining requires owner assistance' using errcode='22023'; end if;
 end if;
 return v_invite.household_id;
end; $$;

create function public.roomie_rename_household(p_household uuid,p_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not roomie_private.is_owner(p_household) then raise exception 'Only the owner can edit household settings' using errcode='42501'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Invalid household name' using errcode='22023'; end if;
 update public.households set name=btrim(p_name) where id=p_household;
end; $$;

revoke all on function public.roomie_create_household(text),public.roomie_create_invite(uuid,integer,integer),public.roomie_revoke_invite(uuid),public.roomie_join_household(text),public.roomie_rename_household(uuid,text) from public,anon;
grant execute on function public.roomie_create_household(text),public.roomie_create_invite(uuid,integer,integer),public.roomie_revoke_invite(uuid),public.roomie_join_household(text),public.roomie_rename_household(uuid,text) to authenticated;
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('20261009000100','households',array[$roomie_households$create schema if not exists roomie_private;
revoke all on schema roomie_private from public, anon;
grant usage on schema roomie_private to authenticated;

create table public.households (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 1 and 80),
 currency text not null default 'MYR' check (currency = 'MYR'),
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now()
);
create table public.household_members (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict,
 role text not null check (role in ('owner','member')),
 status text not null default 'active' check (status in ('active','left')),
 joined_at timestamptz not null default now(), left_at timestamptz,
 unique (household_id,user_id),
 check ((status='active' and left_at is null) or (status='left' and left_at is not null)),
 check (role <> 'owner' or status='active')
);
create unique index household_one_owner on public.household_members(household_id) where role='owner' and status='active';
create index household_members_user on public.household_members(user_id, household_id) where status='active';
create table public.household_invites (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete restrict,
 code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),
 created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 max_uses integer not null check (max_uses between 1 and 50),
 use_count integer not null default 0 check (use_count >= 0 and use_count <= max_uses),
 revoked_at timestamptz,
 check (expires_at > created_at)
);
create index household_invites_household on public.household_invites(household_id);

create function roomie_private.is_member(p_household uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.household_members where household_id=p_household and user_id=(select auth.uid()) and status='active');
$$;
create function roomie_private.is_owner(p_household uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.household_members where household_id=p_household and user_id=(select auth.uid()) and status='active' and role='owner');
$$;
create function roomie_private.is_peer(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.household_members mine join public.household_members peer on peer.household_id=mine.household_id
 where mine.user_id=(select auth.uid()) and mine.status='active' and peer.user_id=p_user and peer.status='active');
$$;
revoke all on function roomie_private.is_member(uuid), roomie_private.is_owner(uuid), roomie_private.is_peer(uuid) from public, anon;
grant execute on function roomie_private.is_member(uuid), roomie_private.is_owner(uuid), roomie_private.is_peer(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
revoke all on public.households, public.household_members, public.household_invites from anon, authenticated;
grant select on public.households, public.household_members, public.household_invites to authenticated;
create policy household_read on public.households for select to authenticated using (roomie_private.is_member(id));
create policy members_read on public.household_members for select to authenticated using (roomie_private.is_member(household_id));
create policy invites_owner_read on public.household_invites for select to authenticated using (roomie_private.is_owner(household_id));
create policy profiles_read_household_peer on public.profiles for select to authenticated using (roomie_private.is_peer(id));

create function public.roomie_create_household(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Invalid household name' using errcode='22023'; end if;
 insert into public.households(name,created_by) values(btrim(p_name),v_user) returning id into v_id;
 insert into public.household_members(household_id,user_id,role) values(v_id,v_user,'owner');
 return v_id;
end; $$;

create function public.roomie_create_invite(p_household uuid, p_max_uses integer default 5, p_days integer default 7) returns public.household_invites
language plpgsql security definer set search_path='' as $$
declare v_invite public.household_invites;
begin
 if not roomie_private.is_owner(p_household) then raise exception 'Only the owner can manage invitations' using errcode='42501'; end if;
 if p_max_uses is null or p_max_uses not between 1 and 50 or p_days is null or p_days not between 1 and 30 then raise exception 'Invalid invitation limits' using errcode='22023'; end if;
 insert into public.household_invites(household_id,created_by,expires_at,max_uses)
 values(p_household,auth.uid(),now()+make_interval(days=>p_days),p_max_uses) returning * into v_invite;
 return v_invite;
end; $$;

create function public.roomie_revoke_invite(p_invite uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_household uuid;
begin
 select household_id into v_household from public.household_invites where id=p_invite for update;
 if v_household is null or not roomie_private.is_owner(v_household) then raise exception 'Only the owner can manage invitations' using errcode='42501'; end if;
 update public.household_invites set revoked_at=coalesce(revoked_at,now()) where id=p_invite;
end; $$;

create function public.roomie_join_household(p_code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_invite public.household_invites; v_member public.household_members; v_inserted uuid;
begin
 if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
 -- Lock the invitation so concurrent redemptions cannot exceed its use limit.
 select * into v_invite from public.household_invites where code=upper(btrim(p_code)) for update;
 if v_invite.id is null then raise exception 'Invitation unavailable' using errcode='22023'; end if;
 select * into v_member from public.household_members where household_id=v_invite.household_id and user_id=v_user;
 -- A retry for an existing active member has no second effect, even after the last use.
 if v_member.status='active' then return v_invite.household_id; end if;
 if v_member.status='left' then raise exception 'Rejoining requires owner assistance' using errcode='22023'; end if;
 if v_invite.revoked_at is not null or v_invite.expires_at <= now() or v_invite.use_count >= v_invite.max_uses then
  raise exception 'Invitation unavailable' using errcode='22023';
 end if;
 insert into public.household_members(household_id,user_id,role) values(v_invite.household_id,v_user,'member')
 on conflict(household_id,user_id) do nothing returning id into v_inserted;
 if v_inserted is not null then
  update public.household_invites set use_count=use_count+1 where id=v_invite.id;
 else
  select * into v_member from public.household_members where household_id=v_invite.household_id and user_id=v_user;
  if v_member.status <> 'active' then raise exception 'Rejoining requires owner assistance' using errcode='22023'; end if;
 end if;
 return v_invite.household_id;
end; $$;

create function public.roomie_rename_household(p_household uuid,p_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not roomie_private.is_owner(p_household) then raise exception 'Only the owner can edit household settings' using errcode='42501'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Invalid household name' using errcode='22023'; end if;
 update public.households set name=btrim(p_name) where id=p_household;
end; $$;

revoke all on function public.roomie_create_household(text),public.roomie_create_invite(uuid,integer,integer),public.roomie_revoke_invite(uuid),public.roomie_join_household(text),public.roomie_rename_household(uuid,text) from public,anon;
grant execute on function public.roomie_create_household(text),public.roomie_create_invite(uuid,integer,integer),public.roomie_revoke_invite(uuid),public.roomie_join_household(text),public.roomie_rename_household(uuid,text) to authenticated;$roomie_households$]);
commit;
select version,name,to_regclass('public.households') is not null as households_created
from supabase_migrations.schema_migrations where version='20261009000100';
