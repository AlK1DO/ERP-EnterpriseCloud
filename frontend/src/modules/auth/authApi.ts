import { supabase } from '../../lib/supabase';
import { authErrorMessage, normalizeEmail } from './authValidation';

export function confirmationRedirectUrl(): string {
  return new URL('/auth/callback', window.location.origin).href;
}

export function googleOAuthRedirectError(params: URLSearchParams): 'cancelled' | 'failed' | null {
  if (!params.has('error') && !params.has('error_code') && !params.has('error_description')) return null;
  const code = (params.get('error_code') ?? params.get('error') ?? '').toLowerCase();
  return ['access_denied', 'user_cancelled', 'user_canceled'].includes(code) ? 'cancelled' : 'failed';
}

export async function signInWithGoogle(): Promise<string | null> {
  if (!supabase) return 'Falta configurar Supabase. Completa las variables de entorno y reinicia la aplicación.';
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL('/', window.location.origin).href },
    });
    return error ? `No se pudo iniciar sesión con Google. ${authErrorMessage(error)}` : null;
  } catch (error) {
    return `No se pudo iniciar sesión con Google. ${authErrorMessage(error)}`;
  }
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Falta configurar Supabase. Completa las variables de entorno y reinicia la aplicación.';
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    return error ? authErrorMessage(error) : null;
  } catch (error) {
    return authErrorMessage(error);
  }
}

export async function signUp(name: string, email: string, password: string): Promise<{ error: string | null; hasSession: boolean }> {
  if (!supabase) return { error: 'Falta configurar Supabase. Completa las variables de entorno y reinicia la aplicación.', hasSession: false };
  try {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email), password,
      options: {
        emailRedirectTo: confirmationRedirectUrl(),
        data: { full_name: name.trim() }, // Never send a role. The DB trigger assigns client.
      },
    });
    return { error: error ? authErrorMessage(error) : null, hasSession: Boolean(data.session) };
  } catch (error) {
    return { error: authErrorMessage(error), hasSession: false };
  }
}

export async function resendConfirmation(email: string): Promise<string | null> {
  if (!supabase) return 'Falta configurar Supabase.';
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email: normalizeEmail(email), options: { emailRedirectTo: confirmationRedirectUrl() } });
    return error ? authErrorMessage(error) : null;
  } catch (error) {
    return authErrorMessage(error);
  }
}

// Deduplicate one-time exchanges when React StrictMode reruns the callback effect.
let pendingConfirmation: { key: string; promise: Promise<string | null> } | null = null;
export function completeConfirmation(params: URLSearchParams): Promise<string | null> {
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const key = code ?? tokenHash ?? '';
  if (pendingConfirmation?.key === key && key) return pendingConfirmation.promise;
  const promise = (async () => {
    if (!supabase) return 'Falta configurar Supabase.';
    if (params.has('error') || params.has('error_code')) return 'El enlace de activación no es válido o ha expirado. Solicita otro correo de activación.';
    try {
      if (tokenHash && (type === 'email' || type === 'signup')) {
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        return error ? authErrorMessage(error) : data.session ? null : 'No se pudo obtener una sesión válida. Vuelve a iniciar sesión.';
      }
      if (code) {
        const { data, error } = await supabase.auth.getSession();
        return error ? authErrorMessage(error) : data.session ? null : 'No se pudo completar el enlace en este navegador. Si tu correo ya está confirmado, inicia sesión; de lo contrario, solicita otro enlace.';
      }
      return 'El enlace no contiene una confirmación válida. Inicia sesión si ya activaste tu cuenta.';
    } catch (error) {
      return authErrorMessage(error);
    }
  })();
  pendingConfirmation = { key, promise };
  return promise;
}
