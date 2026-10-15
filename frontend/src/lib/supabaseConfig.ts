// Shared configuration only: importing this file does not start an Auth client.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
// Refuse secret/legacy keys without logging their contents or crashing the UI.
export const supabasePublishableKey = configuredKey?.startsWith('sb_publishable_') ? configuredKey : undefined;
