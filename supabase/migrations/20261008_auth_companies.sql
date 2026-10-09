-- PREPARED, NOT EXECUTED. Review against inspect-schema.sql before running.
-- Reuses existing public.roles. Does not change usuarios or commercial records.
-- Execute the whole transaction once in Supabase SQL Editor as postgres.
begin;

-- Serialize changes to the shared role catalog until this transaction commits.
-- The reviewed roles table already has RLS and UNIQUE(nombre).
lock table public.roles in share row exclusive mode;

do $$
begin
  if to_regclass('public.roles') is null or to_regclass('public.usuarios') is null then
    raise exception 'Expected roles/usuarios tables are missing; review the schema.';
  end if;
  if to_regclass('public.erp_senatinos_profiles') is not null
     or to_regclass('public.erp_senatinos_companies') is not null then
    raise exception 'Auth tables already exist. Do not overwrite them; inspect first.';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roles') then
    raise exception 'roles now has policies not present in the reviewed inventory; review before migration.';
  end if;
  if exists (select 1 from public.roles where nombre in ('client', 'admin') and not activo) then
    raise exception 'A canonical client/admin role is inactive; review privately, do not reactivate automatically.';
  end if;
end $$;

-- Keep every existing role and assignment. Add canonical names only if absent.
insert into public.roles (nombre, descripcion, activo)
select 'client', 'Cuenta de cliente del ERP', true
where not exists (select 1 from public.roles where nombre = 'client');
insert into public.roles (nombre, descripcion, activo)
select 'admin', 'Administrador asignado por un operador privado', true
where not exists (select 1 from public.roles where nombre = 'admin');

create table public.erp_senatinos_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rol_id bigint not null,
  full_name text not null check (full_name ~ '[^[:space:]]' and length(full_name) <= 100),
  created_at timestamptz not null default now(),
  constraint fk_erp_profiles_roles foreign key (rol_id) references public.roles(id)
);

create table public.erp_senatinos_companies (
  user_id uuid primary key default auth.uid()
    references public.erp_senatinos_profiles(user_id) on delete cascade,
  ruc text not null check (ruc ~ '^[0-9]{11}$'),
  legal_name text not null check (legal_name ~ '[^[:space:]]' and length(legal_name) <= 250),
  fiscal_address text not null check (fiscal_address ~ '[^[:space:]]' and length(fiscal_address) <= 1000),
  trade_name text not null default '' check (length(trade_name) <= 250),
  phone text not null default '' check (length(phone) <= 50),
  email text not null default '' check (
    length(email) <= 254 and (email = '' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  ),
  created_at timestamptz not null default now()
);

alter table public.erp_senatinos_profiles enable row level security;
alter table public.erp_senatinos_companies enable row level security;
-- Already enabled in the reviewed inventory; this is intentionally idempotent.
alter table public.roles enable row level security;

-- Remove default API privileges (including any explicit column privileges on roles).
-- Inventory: no existing policies or row triggers depend on these privileges.
-- usuarios/permisos foreign keys remain intact; existing FK checks do not require
-- the caller to SELECT roles. postgres and service_role grants are not revoked.
-- Auth reads only its assigned role; no frontend role-catalog editor exists.
revoke all on public.roles from public, anon, authenticated;
do $$
declare columns_sql text; sequence_name text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into columns_sql
  from pg_attribute where attrelid = 'public.roles'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke select (%s), insert (%s), update (%s), references (%s) on public.roles from public, anon, authenticated', columns_sql, columns_sql, columns_sql, columns_sql);
  sequence_name := pg_get_serial_sequence('public.roles', 'id');
  if sequence_name is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', sequence_name);
  end if;
end $$;
revoke all on public.erp_senatinos_profiles from public, anon, authenticated;
revoke all on public.erp_senatinos_companies from public, anon, authenticated;
grant select on public.roles to authenticated;
grant select on public.erp_senatinos_profiles to authenticated;
grant select on public.erp_senatinos_companies to authenticated;
grant insert (ruc, legal_name, fiscal_address, trade_name, phone, email)
  on public.erp_senatinos_companies to authenticated;
grant update (ruc, legal_name, fiscal_address, trade_name, phone, email)
  on public.erp_senatinos_companies to authenticated;

create policy erp_profile_read_own
on public.erp_senatinos_profiles for select to authenticated
using (user_id = (select auth.uid()));

create policy erp_role_read_assigned
on public.roles for select to authenticated
using (activo and exists (
  select 1 from public.erp_senatinos_profiles p
  where p.user_id = (select auth.uid()) and p.rol_id = roles.id
));

create policy erp_company_read_own
on public.erp_senatinos_companies for select to authenticated
using (user_id = (select auth.uid()));

create policy erp_company_insert_own_client
on public.erp_senatinos_companies for insert to authenticated
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.erp_senatinos_profiles p
    join public.roles r on r.id = p.rol_id
    where p.user_id = (select auth.uid()) and r.nombre = 'client' and r.activo
  )
);

create policy erp_company_update_own_client
on public.erp_senatinos_companies for update to authenticated
using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.erp_senatinos_profiles p join public.roles r on r.id = p.rol_id
    where p.user_id = (select auth.uid()) and r.nombre = 'client' and r.activo
  )
)
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.erp_senatinos_profiles p join public.roles r on r.id = p.rol_id
    where p.user_id = (select auth.uid()) and r.nombre = 'client' and r.activo
  )
);

-- Fixed server-side role assignment: never inspect user_metadata.role.
create function public.erp_create_auth_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare client_role_id bigint;
begin
  select id into strict client_role_id from public.roles where nombre = 'client' and activo;
  insert into public.erp_senatinos_profiles (user_id, rol_id, full_name)
  values (new.id, client_role_id,
    case when new.raw_user_meta_data ->> 'full_name' ~ '[^[:space:]]'
      then left(btrim(new.raw_user_meta_data ->> 'full_name'), 100) else 'Cliente' end);
  return new;
end;
$$;
revoke all on function public.erp_create_auth_profile() from public, anon, authenticated;

create trigger erp_auth_user_created
after insert on auth.users for each row
execute function public.erp_create_auth_profile();

-- Provision only new profile rows for already existing Auth users, always client.
-- Does not import localStorage, link public.usuarios, or inherit legacy admin roles.
insert into public.erp_senatinos_profiles (user_id, rol_id, full_name)
select u.id, r.id, case when u.raw_user_meta_data ->> 'full_name' ~ '[^[:space:]]'
  then left(btrim(u.raw_user_meta_data ->> 'full_name'), 100) else 'Cliente' end
from auth.users u cross join public.roles r
where r.nombre = 'client' and r.activo;

notify pgrst, 'reload schema';
commit;
