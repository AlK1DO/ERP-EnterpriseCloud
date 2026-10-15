import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { CompanyData } from './companyRegistration';

export type AccountRole = 'client' | 'admin';
export type AuthState = {
  phase: 'loading' | 'anonymous' | 'ready' | 'error';
  user: User | null;
  role: AccountRole | null;
  company: CompanyData | null;
  error: string | null;
};
export type AuthContextValue = AuthState & { refresh: () => Promise<void>; signOut: () => Promise<string | null> };
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}
