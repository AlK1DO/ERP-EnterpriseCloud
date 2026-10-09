import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { readCompany } from './companyRegistration';
import { AuthContext } from './AuthContext';
import type { AuthState } from './AuthContext';
const emptyState: AuthState = { phase: 'loading', user: null, role: null, company: null, error: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => supabase ? emptyState : { ...emptyState, phase: 'error', error: 'Falta configurar Supabase. Completa las variables y reinicia Vite.' });
  const generation = useRef(0);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function update(next: AuthState, ticket: number) {
      if (alive && generation.current === ticket) setState(next);
    }
    async function resolveAccount(session: Session | null, ticket: number) {
      if (!alive || generation.current !== ticket) return;
      if (!session) {
        update({ ...emptyState, phase: 'anonymous' }, ticket);
        return;
      }
      let user: User | null = null;
      try {
        // Validate the persisted token with the Auth server before granting UI access.
        const { data, error } = await client.auth.getUser();
        if (error || !data.user || data.user.id !== session.user.id || !data.user.email_confirmed_at) throw new Error('Invalid user');
        user = data.user;
        const { data: profile, error: profileError } = await client.from('erp_senatinos_profiles').select('user_id,role:roles!fk_erp_profiles_roles(nombre,activo)').eq('user_id', user.id).single();
        const assignedRole = profile?.role as unknown as { nombre?: unknown; activo?: unknown } | null;
        if (profileError || profile?.user_id !== user.id || assignedRole?.activo !== true || (assignedRole.nombre !== 'client' && assignedRole.nombre !== 'admin')) throw new Error('Missing protected role');
        const companyResult = assignedRole.nombre === 'client' ? await readCompany(user.id) : { company: null, error: null };
        if (companyResult.error) {
          update({ ...emptyState, phase: 'error', user, error: companyResult.error }, ticket);
          return;
        }
        update({ phase: 'ready', user, role: assignedRole.nombre, company: companyResult.company, error: null }, ticket);
      } catch {
        update({ ...emptyState, phase: 'error', user, error: 'No se pudo validar la sesión o consultar el perfil protegido. Confirma tu correo y revisa la conexión y las migraciones de Supabase. No se concederá acceso mientras falle esta verificación.' }, ticket);
      }
    }
    function schedule(session: Session | null) {
      const ticket = ++generation.current;
      setState(emptyState);
      // Never await another Auth SDK method inside its event callback/lock.
      const timer = setTimeout(() => {
        timers.delete(timer);
        void resolveAccount(session, ticket);
      }, 0);
      timers.add(timer);
    }
    refreshRef.current = async () => {
      if (!alive) return;
      const ticket = ++generation.current;
      setState(emptyState);
      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        await resolveAccount(data.session, ticket);
      } catch {
        update({ ...emptyState, phase: 'error', error: 'No se pudo recuperar la sesión. Inténtalo de nuevo o cierra sesión.' }, ticket);
      }
    };
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => schedule(session));
    const initialGeneration = generation.current;
    void client.auth.getSession().then(({ data, error }) => {
      if (!alive || generation.current !== initialGeneration) return;
      if (error) setState({ ...emptyState, phase: 'error', error: 'No se pudo recuperar la sesión de Supabase.' });
      else schedule(data.session);
    }).catch(() => {
      if (alive && generation.current === initialGeneration) setState({ ...emptyState, phase: 'error', error: 'No se pudo recuperar la sesión de Supabase.' });
    });
    const onPageShow = () => { void refreshRef.current(); };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      alive = false;
      subscription.unsubscribe();
      timers.forEach(clearTimeout);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  async function signOut(): Promise<string | null> {
    generation.current++;
    setState(emptyState);
    try {
      if (!supabase) throw new Error('Missing client');
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      generation.current++;
      setState({ ...emptyState, phase: 'anonymous' });
      return null;
    } catch {
      const message = 'No se pudo cerrar la sesión de Supabase. El ERP queda bloqueado; vuelve a intentarlo.';
      setState({ ...emptyState, phase: 'error', error: message });
      return message;
    }
  }

  return <AuthContext.Provider value={{ ...state, refresh: () => refreshRef.current(), signOut }}>{children}</AuthContext.Provider>;
}

