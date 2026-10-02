import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShoppingCart, Package, 
  Building2, Wallet, Settings, Cloud, Bell, Search,
  FileText, Receipt, ClipboardList, FileDown, PackageCheck,
  Warehouse, ArrowLeftRight, Truck, TrendingUp, TrendingDown,
  Landmark, Files, BarChart3, UserCog, ShieldCheck, Key, History
} from 'lucide-react';

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
  /*
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
  */
];

export const MainLayout: React.FC = () => {
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    'Comercial': true // Lo dejamos abierto por defecto para que veas el efecto
  });

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <div className="flex h-screen bg-[#f4f7f9] font-sans">
      {/* Sidebar - Tema Claro (White) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300">
        
        {/* Header del Sidebar */}
        <div className="h-16 px-6 flex items-center gap-3 shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-center text-[#ff5a1f]">
            <Cloud size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Cloud ERP
          </h1>
        </div>
        
        {/* Navegación (Estilo Acordeón / Nested) */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
          {MENU_SECTIONS.map((section, idx) => {
            // Caso especial: Dashboard (no tiene título de sección)
            if (!section.title) {
              return section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-[15px] mb-4 ${
                      isActive 
                        ? 'bg-[#ff5a1f] text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              ));
            }

            // Secciones con menú desplegable (Acordeón)
            const isOpen = openSections[section.title];
            
            return (
              <div key={idx} className="mb-2">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors group"
                >
                  <span className="font-semibold text-sm tracking-wide group-hover:text-gray-900">
                    {section.title}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[400px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <ul className="space-y-1 pl-2 border-l border-gray-100 ml-5">
                    {section.items.map((item) => (
                      <li key={item.name}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-[14px] ${
                              isActive 
                                ? 'bg-orange-50 text-[#ff5a1f]' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          {React.cloneElement(item.icon as React.ReactElement, { size: 18 })}
                          <span>{item.name}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
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
