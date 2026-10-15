-- READ ONLY. Run after the migration; this checks grants/policies, not live accounts.
begin transaction read only;
select jsonb_build_object(
  'authenticated_cannot_edit_roles',
    not has_any_column_privilege('authenticated', 'public.roles', 'INSERT,UPDATE,REFERENCES')
    and not has_table_privilege('authenticated', 'public.roles', 'DELETE,TRUNCATE,TRIGGER'),
  'anon_cannot_edit_roles',
    not has_any_column_privilege('anon', 'public.roles', 'INSERT,UPDATE,REFERENCES')
    and not has_table_privilege('anon', 'public.roles', 'DELETE,TRUNCATE,TRIGGER'),
  'authenticated_cannot_edit_profiles',
    not has_any_column_privilege('authenticated', 'public.erp_senatinos_profiles', 'INSERT,UPDATE,REFERENCES')
    and not has_table_privilege('authenticated', 'public.erp_senatinos_profiles', 'DELETE,TRUNCATE,TRIGGER'),
  'authenticated_cannot_choose_company_owner',
    not has_column_privilege('authenticated', 'public.erp_senatinos_companies', 'user_id', 'INSERT,UPDATE'),
  'anon_cannot_read_companies',
    not has_any_column_privilege('anon', 'public.erp_senatinos_companies', 'SELECT'),
  'rls', (select jsonb_agg(jsonb_build_object('table', c.relname, 'enabled', c.relrowsecurity) order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('roles', 'erp_senatinos_profiles', 'erp_senatinos_companies')),
  'policies', (select jsonb_agg(to_jsonb(p) order by p.tablename, p.policyname)
    from pg_policies p where p.schemaname = 'public'
      and p.tablename in ('roles', 'erp_senatinos_profiles', 'erp_senatinos_companies'))
) as auth_security_check;
commit;
