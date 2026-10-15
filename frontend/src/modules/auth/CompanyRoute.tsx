import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AuthBoundary } from './AuthBoundary';
import { CompanyRegistrationPage } from './CompanyRegistrationPage';
import { saveCompany } from './companyRegistration';
import type { CompanyData } from './companyRegistration';
export function CompanyRoute() {
  const auth = useAuth();
  async function registerCompany(company: CompanyData) {
    if (!auth.user || auth.role !== 'client') return 'Inicia sesión como Cliente para registrar tu empresa.';
    const error = await saveCompany(auth.user.id, company);
    if (!error) await auth.refresh();
    return error;
  }
  return <AuthBoundary mode="account">{auth.role === 'admin' || auth.company
    ? <Navigate to="/" replace />
    : <CompanyRegistrationPage onSave={registerCompany} onSignOut={() => void auth.signOut()} />}</AuthBoundary>;
}
