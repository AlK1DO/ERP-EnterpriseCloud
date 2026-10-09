-- PRIVATE ADMIN PROCEDURE. Not a migration; do not expose it through the frontend.
-- Run only AFTER registering and confirming your real email via the application.
-- Replace the UUID with the exact ID shown in Authentication > Users.
-- Never select an account by "first user" or trust editable metadata.
begin;
do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- REPLACE
  admin_role_id bigint;
  changed integer;
begin
  if target_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Replace target_user_id with your confirmed Auth user UUID.';
  end if;
  if not exists (select 1 from auth.users where id = target_user_id and email_confirmed_at is not null) then
    raise exception 'The selected Auth account does not exist or is not confirmed.';
  end if;
  select id into strict admin_role_id from public.roles where nombre = 'admin' and activo;
  update public.erp_senatinos_profiles set rol_id = admin_role_id where user_id = target_user_id;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Expected exactly one existing Auth profile.'; end if;
end $$;
commit;
