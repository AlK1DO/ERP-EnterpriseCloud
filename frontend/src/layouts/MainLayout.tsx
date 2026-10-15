import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight, BarChart3, Bell, Building2, Cloud, FileDown, FileText, Files,
  History, Key, Landmark, LayoutDashboard, LogOut, Menu, Moon, Package, Settings,
  PackageCheck, Receipt, Search, ShieldCheck, ShoppingCart, Sun, TrendingDown,
  TrendingUp, Truck, UserCog, Users, Wallet, Warehouse,
} from 'lucide-react';
import { useAuth } from '../modules/auth/AuthContext';

const MENU_SECTIONS = [
  {
    title: 'INICIO',
    items: [{ name: 'Panel', path: '/', icon: <LayoutDashboard size={20} /> }],
  },
  {
    title: 'COMERCIAL',
    items: [
      { name: 'Clientes', path: '/clientes', icon: <Users size={20} /> },
      { name: 'Cotizaciones', path: '/cotizaciones', icon: <FileText size={20} /> },
      { name: 'Ventas', path: '/ventas', icon: <ShoppingCart size={20} /> },
      { name: 'Facturación', path: '/facturacion', icon: <Receipt size={20} /> },
    ],
  },
  {
    title: 'COMPRAS',
    items: [
      { name: 'Proveedores', path: '/proveedores', icon: <Building2 size={20} /> },
      { name: 'Orden de compra', path: '/orden-compra', icon: <FileDown size={20} /> },
      { name: 'Solicitudes', path: '/solicitudes', icon: <FileText size={20} /> },
      { name: 'Órdenes', path: '/ordenes', icon: <ShoppingCart size={20} /> },
      { name: 'Recepción', path: '/recepcion', icon: <PackageCheck size={20} /> },
    ],
  },
  {
    title: 'INVENTARIO',
    items: [
      { name: 'Productos', path: '/stock-productos', icon: <Package size={20} /> },
      { name: 'Ingreso al Kardex', path: '/ingreso-kardex', icon: <Warehouse size={20} /> },
      { name: 'Movimiento de Kardex', path: '/movimiento-kardex', icon: <ArrowLeftRight size={20} /> },
      { name: 'Almacenes', path: '/almacenes', icon: <Building2 size={20} /> },
      { name: 'Transferencias', path: '/transferencias', icon: <Truck size={20} /> },
    ],
  },
  {
    title: 'FINANZAS',
    items: [
      { name: 'Cuentas por cobrar', path: '/estado-cuenta', icon: <TrendingUp size={20} /> },
      { name: 'Cuentas por pagar', path: '/cxp', icon: <TrendingDown size={20} /> },
      { name: 'Caja', path: '/caja', icon: <Wallet size={20} /> },
      { name: 'Bancos', path: '/bancos', icon: <Landmark size={20} /> },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { name: 'Documentos', path: '/documentos', icon: <Files size={20} /> },
      { name: 'Reportes', path: '/reportes', icon: <BarChart3 size={20} /> },
    ],
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      { name: 'Usuarios', path: '/usuarios', icon: <UserCog size={20} /> },
      { name: 'Roles', path: '/roles', icon: <ShieldCheck size={20} /> },
      { name: 'Permisos', path: '/permisos', icon: <Key size={20} /> },
      { name: 'Auditoría', path: '/auditoria', icon: <History size={20} /> },
      { name: 'Mantenimientos', path: '/mantenimientos', icon: <Settings size={20} /> },
    ],
  },
];

export function MainLayout() {
  const auth = useAuth();
  const identity = auth.user?.email ?? 'Usuario';
  const initials = (identity.split('@')[0].slice(0, 2) || 'U').toUpperCase();
  const companyName = auth.company?.tradeName || auth.company?.legalName;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    return () => document.documentElement.classList.remove('dark');
  }, [darkMode]);

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-20 bg-black/50 print:hidden"
            onClick={() => setSidebarOpen(true)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className={`fixed md:relative z-30 h-full flex flex-col transition-colors duration-300 print:hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        } border-r shadow-xl md:shadow-none`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-inherit">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-blue-700 shadow-sm text-white">
                <Cloud size={20} aria-hidden="true" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`truncate font-bold text-lg tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  ERP <span className="text-blue-600">SENATINO</span>
                </span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Sistema de Gestión</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex items-center justify-center w-9 h-9 rounded-lg bg-blue-700 shadow-sm text-white">
              <Cloud size={20} aria-hidden="true" />
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {MENU_SECTIONS.filter(section => section.title !== 'ADMINISTRACIÓN' || auth.role === 'admin').map(section => (
            <div key={section.title}>
              {sidebarOpen && (
                <p className={`px-3 mb-2 text-[10px] font-bold tracking-widest uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold'
                          : `hover:bg-slate-100 dark:hover:bg-slate-800/50 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`
                      }`
                    }
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {sidebarOpen && <span className="truncate text-sm">{item.name}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-inherit print:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(open => !open)}
            aria-label={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
            aria-expanded={sidebarOpen}
            className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <Menu size={20} />
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 print:block print:h-auto print:overflow-visible">
        <header className={`h-16 flex items-center justify-between px-4 md:px-6 border-b transition-colors duration-300 print:hidden ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(open => !open)}
              aria-label="Alternar menú"
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:block relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="search"
                aria-label="Buscar"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setDarkMode(value => !value)}
              aria-label={darkMode ? 'Usar tema claro' : 'Usar tema oscuro'}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 bg-slate-800' : 'hover:bg-slate-100 bg-slate-50'}`}
            >
              {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>
            <button type="button" aria-label="Notificaciones" className={`p-2 rounded-full relative ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>
            <div className="hidden sm:block min-w-0 max-w-52 text-xs text-right">
              <p className="truncate" title={identity}>{identity}</p>
              <p className="truncate text-slate-500 dark:text-slate-400" title={companyName || undefined}>
                {companyName || (auth.role === 'admin' ? 'Administrador' : 'Cliente')}
                {auth.company?.ruc ? ` · RUC: ${auth.company.ruc}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="flex items-center gap-2 text-xs font-semibold px-2 sm:px-3 py-2 rounded-lg border border-inherit hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
            <div title={identity} aria-label={`Sesión de ${identity}`} className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm border-2 border-white dark:border-slate-800">
              {initials}
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-auto p-4 md:p-6 lg:p-8 print:p-0 print:overflow-visible print:bg-white ${darkMode ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
          <Outlet context={{ darkMode }} />
        </div>
      </main>
    </div>
  );
}
