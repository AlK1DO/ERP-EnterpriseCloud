import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AuthStatusPage } from './AuthStatusPage';
import { accessDecision } from './accessPolicy';
import type { AccessMode } from './accessPolicy';
export function AuthBoundary({ mode, children }: { mode: AccessMode; children: ReactNode }) {
  const decision = accessDecision(useAuth(), mode);
  if (decision === 'status') return <AuthStatusPage />;
  return decision === 'allow' ? children : <Navigate to={decision} replace />;
}
