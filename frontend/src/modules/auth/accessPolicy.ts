export type AccessMode = 'public' | 'account' | 'workspace' | 'admin';
export type AccessSnapshot = {
  phase: 'loading' | 'anonymous' | 'ready' | 'error';
  user: unknown;
  role: 'client' | 'admin' | null;
  company: unknown;
};
export function accessDecision(auth: AccessSnapshot, mode: AccessMode): 'allow' | 'status' | '/login' | '/registro-empresa' | '/' {
  if (auth.phase === 'loading' || auth.phase === 'error') return 'status';
  if (auth.phase === 'anonymous') return mode === 'public' ? 'allow' : '/login';
  if (!auth.user || (auth.role !== 'client' && auth.role !== 'admin')) return 'status';
  const needsCompany = auth.role === 'client' && !auth.company;
  if (mode === 'public') return needsCompany ? '/registro-empresa' : '/';
  if (mode === 'admin' && auth.role !== 'admin') return needsCompany ? '/registro-empresa' : '/';
  if (mode === 'workspace' && needsCompany) return '/registro-empresa';
  return 'allow';
}
