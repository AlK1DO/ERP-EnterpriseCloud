import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ClientesPage } from './modules/clientes/ClientesPage';
import { ProveedoresPage } from './modules/proveedores/ProveedoresPage';
import { LoginPage } from './modules/auth/LoginPage';
import { AuthProvider } from './modules/auth/AuthProvider';
import { useAuth } from './modules/auth/AuthContext';
import { AuthStatusPage } from './modules/auth/AuthStatusPage';
import { AuthCallbackPage } from './modules/auth/AuthCallbackPage';
import { SignUpPage } from './modules/auth/SignUpPage';
import { CompanyRegistrationPage } from './modules/auth/CompanyRegistrationPage';
import { saveCompany } from './modules/auth/companyRegistration';
import type { CompanyData } from './modules/auth/companyRegistration';
import { googleOAuthRedirectError } from './modules/auth/authApi';

function AuthBoundary({ mode, children }: { mode: 'public' | 'account' | 'workspace'; children: ReactNode }) {
  const auth = useAuth();
  if (auth.phase === 'loading' || auth.phase === 'error') return <AuthStatusPage />;
  if (auth.phase === 'anonymous') return mode === 'public' ? children : <Navigate to="/login" replace />;
  const needsCompany = auth.role === 'client' && !auth.company;
  if (mode === 'public') return <Navigate to={needsCompany ? '/registro-empresa' : '/'} replace />;
  if (mode === 'workspace' && needsCompany) return <Navigate to="/registro-empresa" replace />;
  return children;
}

function CompanyRoute() {
  const auth = useAuth();
  async function registerCompany(company: CompanyData): Promise<string | null> {
    if (!auth.user || auth.role !== 'client') return 'Inicia sesión con una cuenta de Cliente antes de guardar la empresa.';
    const error = await saveCompany(auth.user.id, company);
    if (!error) await auth.refresh();
    return error;
  }
  return <AuthBoundary mode="account">{auth.role === 'admin' || auth.company
    ? <Navigate to="/" replace />
    : <CompanyRegistrationPage onSave={registerCompany} onSignOut={() => void auth.signOut()} />}</AuthBoundary>;
}

function AppRoutes() {
  const auth = useAuth();
  const location = useLocation();
  const googleReturnError = googleOAuthRedirectError(new URLSearchParams(location.search));

  return (
    <Routes>
      <Route path="/login" element={<AuthBoundary mode="public"><LoginPage /></AuthBoundary>} />
      <Route path="/registro" element={<AuthBoundary mode="public"><SignUpPage /></AuthBoundary>} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/registro-empresa" element={<CompanyRoute />} />
      <Route path="/" element={googleReturnError
        ? <Navigate to={`/login?google=${googleReturnError}`} replace />
        : <AuthBoundary mode="workspace"><MainLayout role={auth.role ?? 'client'} onSignOut={() => void auth.signOut()} companyName={auth.company?.legalName} companyRuc={auth.company?.ruc} /></AuthBoundary>}>
        <Route index element={
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
            <p className="text-gray-600">Bienvenido al sistema ERP EnterpriseCloud.</p>
          </div>
        } />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="proveedores" element={<ProveedoresPage />} />
        <Route path=":modulo" element={
          <div className="flex flex-col items-center justify-center h-[70vh] text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-[#ff5a1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 capitalize">Módulo en Construcción</h2>
            <p className="text-gray-500 mt-2 max-w-md">Esta sección del sistema está programada para la siguiente fase de desarrollo.</p>
          </div>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>;
}

export default App;
