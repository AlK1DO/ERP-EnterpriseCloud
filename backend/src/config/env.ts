import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  supabaseUrl: process.env.SUPABASE_URL || 'https://bszlfhacxygwhxzfrias.supabase.co',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_hStYF_Kl4EPBXotbDu6Bew_Hv6g9O_X',
  migoToken: process.env.MIGO_TOKEN || '759ebb1b-6c5c-402b-8211-fad6e99644a5',
};
