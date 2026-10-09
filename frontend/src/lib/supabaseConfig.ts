// Shared configuration only: importing this file does not start an Auth client.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (supabasePublishableKey && !supabasePublishableKey.startsWith('sb_publishable_')) {
  throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY debe ser una clave publishable de Supabase.');
}
