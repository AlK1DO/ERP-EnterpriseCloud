import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = (names: string[]): string => {
  const value = names.map((name) => process.env[name]?.trim()).find(Boolean);
  if (!value) {
    throw new Error(`Falta configurar una variable de entorno: ${names.join(' o ')}`);
  }
  return value;
};

const port = Number(process.env.PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

export const config = {
  port,
  supabaseUrl: requiredEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL']),
  supabaseKey: requiredEnv([
    'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
  ]),
  migoToken: requiredEnv(['MIGO_TOKEN', 'VITE_MIGO_TOKEN']),
};
