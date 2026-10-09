import { createClient } from '@supabase/supabase-js';

import { supabaseUrl, supabasePublishableKey } from './supabaseConfig';

// One shared client; null until both environment variables have been configured.
// Only the SDK persists session tokens; application code never stores passwords.
export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        detectSessionInUrl: true,
      },
    })
  : null;
