import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { OrdenCompraPage } from './modules/compras/OrdenCompraPage';
import { OrdenVentaPage } from './modules/ventas/OrdenVentaPage';
import { FacturacionPage } from './modules/ventas/FacturacionPage';
import { EstadoCuentaPage } from './modules/ventas/EstadoCuentaPage';
import { StockProductosPage } from './modules/inventario/StockProductosPage';
import { IngresoKardexPage } from './modules/inventario/IngresoKardexPage';
import { MovimientoKardexPage } from './modules/inventario/MovimientoKardexPage';
import { AuthProvider } from './modules/auth/AuthProvider';
import { AuthBoundary } from './modules/auth/AuthBoundary';
import { LoginPage } from './modules/auth/LoginPage';
import { SignUpPage } from './modules/auth/SignUpPage';
import { AuthCallbackPage } from './modules/auth/AuthCallbackPage';
import { CompanyRoute } from './modules/auth/CompanyRoute';
import { useAuth } from './modules/auth/AuthContext';
import { ClientesPage } from './modules/clientes/ClientesPage';

const moduleInDevelopment = (
<div className="flex flex-col items-center justify-center h-[70vh] text-center animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">Módulo en Desarrollo</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-md text-sm">
                Esta sección está siendo desarrollada. Pronto podrás gestionar estos datos.
              </p>
            </div>
);

function ProtectedLayout() {
  const auth = useAuth();
  return <AuthBoundary mode="workspace"><MainLayout key={auth.user?.id ?? 'anonymous'} /></AuthBoundary>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        <Route path="/login" element={<AuthBoundary mode="public"><LoginPage /></AuthBoundary>} />
        <Route path="/registro" element={<AuthBoundary mode="public"><SignUpPage /></AuthBoundary>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/registro-empresa" element={<CompanyRoute />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="orden-compra" element={<OrdenCompraPage />} />
          <Route path="orden-venta" element={<OrdenVentaPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="facturacion" element={<FacturacionPage />} />
          <Route path="estado-cuenta" element={<EstadoCuentaPage />} />
          <Route path="ingreso-kardex" element={<IngresoKardexPage />} />
          <Route path="movimiento-kardex" element={<MovimientoKardexPage />} />
          <Route path="stock-productos" element={<StockProductosPage />} />
          <Route path="reportes" element={<AuthBoundary mode="admin">{moduleInDevelopment}</AuthBoundary>} />
          <Route path="mantenimientos/*" element={<AuthBoundary mode="admin">{moduleInDevelopment}</AuthBoundary>} />
          
          {/* Catch-all para módulos en construcción */}
          <Route path="*" element={moduleInDevelopment} />
        </Route>
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
