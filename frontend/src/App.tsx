import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ClientesPage } from './modules/clientes/ClientesPage';

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
          <Route path="proveedores" element={<div className="p-6">Módulo Proveedores (En construcción)</div>} />
          <Route path="inventario" element={<div className="p-6">Módulo Inventario (En construcción)</div>} />
          <Route path="ventas" element={<div className="p-6">Módulo Ventas (En construcción)</div>} />
          <Route path="compras" element={<div className="p-6">Módulo Compras (En construcción)</div>} />
          <Route path="finanzas" element={<div className="p-6">Módulo Finanzas (En construcción)</div>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
