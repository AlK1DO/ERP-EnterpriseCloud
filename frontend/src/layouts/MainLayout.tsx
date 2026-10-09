import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingCart, Package,
  Building2, Wallet, Settings, Cloud, Bell, Search,
  FileText, Receipt, ClipboardList, FileDown, PackageCheck,
  Warehouse, ArrowLeftRight, Truck, TrendingUp, TrendingDown,
  Landmark, Files, BarChart3, UserCog, ShieldCheck, Key, History, LogOut
} from 'lucide-react';
import type { AccountRole } from '../modules/auth/AuthContext';

const MENU_SECTIONS = [
  {
    title: '',
    items: [
      { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    ]
  },
  {
    title: 'Comercial',
    items: [
      { name: 'Clientes', path: '/clientes', icon: <Users size={20} /> },
      { name: 'Cotizaciones', path: '/cotizaciones', icon: <FileText size={20} /> },
      { name: 'Ventas', path: '/ventas', icon: <ShoppingCart size={20} /> },
      { name: 'Facturación', path: '/facturacion', icon: <Receipt size={20} /> },
    ]
  },
  {
    title: 'Compras',
    items: [
      { name: 'Proveedores', path: '/proveedores', icon: <Building2 size={20} /> },
      { name: 'Solicitudes', path: '/solicitudes', icon: <ClipboardList size={20} /> },
      { name: 'Órdenes', path: '/ordenes', icon: <FileDown size={20} /> },
      { name: 'Recepción', path: '/recepcion', icon: <PackageCheck size={20} /> },
    ]
  },
  {
    title: 'Inventario',
    items: [
      { name: 'Productos', path: '/productos', icon: <Package size={20} /> },
      { name: 'Almacenes', path: '/almacenes', icon: <Warehouse size={20} /> },
      { name: 'Kardex', path: '/kardex', icon: <ArrowLeftRight size={20} /> },
      { name: 'Transferencias', path: '/transferencias', icon: <Truck size={20} /> },
    ]
  },
  {
    title: 'Finanzas',
    items: [
      { name: 'CxC', path: '/cxc', icon: <TrendingUp size={20} /> },
      { name: 'CxP', path: '/cxp', icon: <TrendingDown size={20} /> },
      { name: 'Caja', path: '/caja', icon: <Wallet size={20} /> },
      { name: 'Bancos', path: '/bancos', icon: <Landmark size={20} /> },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Documentos', path: '/documentos', icon: <Files size={20} /> },
      { name: 'Reportes', path: '/reportes', icon: <BarChart3 size={20} /> },
    ]
  },
  {
    title: 'Administración',
    items: [
      { name: 'Usuarios', path: '/usuarios', icon: <UserCog size={20} /> },
      { name: 'Roles', path: '/roles', icon: <ShieldCheck size={20} /> },
      { name: 'Permisos', path: '/permisos', icon: <Key size={20} /> },
      { name: 'Auditoría', path: '/auditoria', icon: <History size={20} /> },
    ]
  }
];

export const MainLayout: React.FC<{
  role: AccountRole;
  onSignOut: () => void;
  companyName?: string;
  companyRuc?: string;
}> = ({ role, onSignOut, companyName, companyRuc }) => {
  const roleLabel = role === 'admin' ? 'Administrador' : 'Cliente';

  return (
    <div className="flex h-screen bg-[#f4f7f9] font-sans">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300">
        <div className="h-16 px-6 flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center text-[#ff5a1f]">
            <Cloud size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">ERP Senatinos</h1>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
          {MENU_SECTIONS
            .filter(section => !section.title.startsWith('Administra') || role === 'admin')
            .map((section, idx) => (
              <div key={idx} className="mb-6">
                {section.title && <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 tracking-wide">{section.title}</h3>}
                <ul className="space-y-1">
                  {section.items.map(item => (
                    <li key={item.name}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-[15px] ${
                            isActive
                              ? 'bg-[#ff5a1f] text-white shadow-sm'
                              : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                          }`
                        }
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </nav>

        <div className="p-4 border-t border-gray-100 z-10">
          <button type="button" className="flex items-center gap-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 w-full px-3 py-2.5 rounded-lg transition-colors font-medium text-[15px]">
            <Settings size={20} />
            <span>Configuración</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="min-h-16 bg-white border-b border-gray-200 flex flex-wrap items-center px-4 md:px-8 py-2 justify-between gap-3 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative w-96 max-w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#ff5a1f] focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] transition-all"
              />
            </div>
            <div className="min-w-0">
              {companyName && (
                <p className="truncate text-sm font-semibold text-gray-700" title={`${companyName}${companyRuc ? ` · RUC: ${companyRuc}` : ''}`}>
                  {companyName}{companyRuc && ` · RUC: ${companyRuc}`}
                </p>
              )}
              <p className="text-xs text-gray-500">{roleLabel} · Sesión autenticada</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button type="button" aria-label="Notificaciones" className="text-gray-400 hover:text-gray-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-3 cursor-default pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-[#ff5a1f] text-white flex items-center justify-center font-bold text-sm shadow-sm" aria-hidden="true">
                {role === 'admin' ? 'A' : 'C'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-700 leading-tight">{roleLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#ff5a1f]"
              title="Cerrar sesión"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-[#f4f7f9]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
