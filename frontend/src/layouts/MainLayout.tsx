import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShoppingCart, Package, 
  Building2, Wallet, Settings, ShoppingBag, Bell, Search, Cloud
} from 'lucide-react';

// Estructura agrupada por categorías (como en tu imagen)
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
      { name: 'Proveedores', path: '/proveedores', icon: <Building2 size={20} /> },
      { name: 'Ventas', path: '/ventas', icon: <ShoppingCart size={20} /> },
      { name: 'Compras', path: '/compras', icon: <ShoppingBag size={20} /> },
    ]
  },
  {
    title: 'SCM & Stocks',
    items: [
      { name: 'Inventario', path: '/inventario', icon: <Package size={20} /> },
    ]
  },
  {
    title: 'Finance',
    items: [
      { name: 'Finanzas', path: '/finanzas', icon: <Wallet size={20} /> },
    ]
  }
];

export const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-[#f4f7f9] font-sans">
      {/* Sidebar - Tema Claro (White) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300">
        
        {/* Header del Sidebar */}
        <div className="h-16 px-6 flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center text-[#ff5a1f]">
            <Cloud size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Cloud ERP
          </h1>
        </div>
        
        {/* Navegación por Categorías */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
          {MENU_SECTIONS.map((section, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 tracking-wide">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => (
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
        
        {/* Configuración al fondo */}
        <div className="p-4 border-t border-gray-100 z-10">
          <button className="flex items-center gap-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 w-full px-3 py-2.5 rounded-lg transition-colors font-medium text-[15px]">
            <Settings size={20} />
            <span>Configuración</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header Superior */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 justify-between shrink-0 z-10">
          
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-96 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#ff5a1f] focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="text-gray-400 hover:text-gray-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-3 cursor-pointer pl-4 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-[#ff5a1f] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                AU
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-700 leading-tight">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area con scroll */}
        <div className="flex-1 overflow-auto p-8 bg-[#f4f7f9]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
