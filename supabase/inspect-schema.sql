-- READ ONLY. Run the entire script in Supabase SQL Editor.
-- One result set: one row, one JSON object in the schema_inventory column.
-- Only catalog metadata is read, never user or commercial records.
-- Metadata visibility depends on the SQL Editor database role.
begin transaction read only;

with
application_schemas as (
  select oid, nspname
  from pg_namespace
  where nspname not in ('pg_catalog', 'information_schema')
    and nspname !~ '^pg_'
),
table_inventory as (
  select n.nspname as schema_name, c.relname as table_name,
         c.relkind as relation_kind,
         c.relrowsecurity as rls_enabled,
         c.relforcerowsecurity as rls_forced,
         pg_get_userbyid(c.relowner) as owner
  from pg_class c
  join application_schemas n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm')
),
column_inventory as (
  select c.table_schema, c.table_name, c.column_name, c.ordinal_position,
         c.data_type, c.udt_schema, c.udt_name, c.is_nullable,
         c.column_default, c.is_identity, c.identity_generation,
         c.is_generated, c.generation_expression
  from information_schema.columns c
  join application_schemas n on n.nspname = c.table_schema
),
constraint_inventory as (
  select n.nspname as schema_name, c.relname as table_name,
         con.conname as constraint_name, con.contype as constraint_type,
         pg_get_constraintdef(con.oid) as definition
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join application_schemas n on n.oid = c.relnamespace
),
policy_inventory as (
  select p.schemaname, p.tablename, p.policyname, p.permissive,
         p.roles, p.cmd, p.qual, p.with_check
  from pg_policies p
  join application_schemas n on n.nspname = p.schemaname
),
table_permissions as (
  select p.table_schema, p.table_name, p.grantor, p.grantee,
         p.privilege_type, p.is_grantable
  from information_schema.table_privileges p
  join application_schemas n on n.nspname = p.table_schema
),
column_permissions as (
  select p.table_schema, p.table_name, p.column_name, p.grantor,
         p.grantee, p.privilege_type, p.is_grantable
  from information_schema.column_privileges p
  join application_schemas n on n.nspname = p.table_schema
),
routine_permissions as (
  select p.routine_schema, p.routine_name, p.specific_name,
         p.grantor, p.grantee, p.privilege_type, p.is_grantable
  from information_schema.routine_privileges p
  join application_schemas n on n.nspname = p.routine_schema
),
schema_permissions as (
  select n.nspname as schema_name,
         pg_get_userbyid(ns.nspowner) as owner,
         ns.nspacl as grants
  from application_schemas n
  join pg_namespace ns on ns.oid = n.oid
),
trigger_inventory as (
  select n.nspname as schema_name, c.relname as table_name,
         t.tgname as trigger_name, t.tgenabled as enabled,
         pg_get_triggerdef(t.oid) as definition,
         pn.nspname as function_schema, p.proname as function_name,
         p.prosecdef as security_definer,
         p.proconfig as function_configuration
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join application_schemas n on n.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal
),
function_inventory as (
  select n.nspname as function_schema, p.proname as function_name,
         pg_get_function_identity_arguments(p.oid) as arguments,
         pg_get_function_result(p.oid) as result_type,
         pg_get_userbyid(p.proowner) as owner,
         p.prosecdef as security_definer, p.proacl as grants,
         p.proconfig as configuration,
         pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join application_schemas n on n.oid = p.pronamespace
  where p.prokind = 'f'
)
select jsonb_build_object(
  'tables', coalesce((
    select jsonb_agg(to_jsonb(t) order by t.schema_name, t.table_name)
    from table_inventory t
  ), '[]'::jsonb),
  'columns', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.table_schema, c.table_name, c.ordinal_position)
    from column_inventory c
  ), '[]'::jsonb),
  'constraints', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.schema_name, c.table_name, c.constraint_name)
    from constraint_inventory c
  ), '[]'::jsonb),
  'policies', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.schemaname, p.tablename, p.policyname)
    from policy_inventory p
  ), '[]'::jsonb),
  'permissions', jsonb_build_object(
    'tables', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.table_schema, p.table_name, p.grantee, p.privilege_type, p.grantor)
      from table_permissions p
    ), '[]'::jsonb),
    'columns', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.table_schema, p.table_name, p.column_name, p.grantee, p.privilege_type, p.grantor)
      from column_permissions p
    ), '[]'::jsonb),
    'routines', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.routine_schema, p.specific_name, p.grantee, p.privilege_type, p.grantor)
      from routine_permissions p
    ), '[]'::jsonb),
    'schemas', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.schema_name)
      from schema_permissions p
    ), '[]'::jsonb)
  ),
  'triggers', coalesce((
    select jsonb_agg(to_jsonb(t) order by t.schema_name, t.table_name, t.trigger_name)
    from trigger_inventory t
  ), '[]'::jsonb),
  'functions', coalesce((
    select jsonb_agg(to_jsonb(f) order by f.function_schema, f.function_name, f.arguments)
    from function_inventory f
  ), '[]'::jsonb)
) as schema_inventory;

commit;
