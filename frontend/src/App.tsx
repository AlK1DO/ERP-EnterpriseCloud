import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ClientesPage } from './modules/clientes/ClientesPage';
import { ProveedoresPage } from './modules/proveedores/ProveedoresPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
              <p className="text-gray-600">Bienvenido al sistema ERP EnterpriseCloud.</p>
            </div>
          } />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          
          {/* Catch-all para módulos en construcción */}
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
    </BrowserRouter>
  );
}

export default App;
