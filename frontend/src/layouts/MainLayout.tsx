import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Receipt, FileText, 
  Package, ArrowRightLeft, Boxes, FileBarChart, 
  Settings, Menu, Bell, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MENU_SECTIONS = [
  {
    title: 'INICIO',
    items: [
      { name: 'Panel', path: '/', icon: <LayoutDashboard size={20} /> },
    ]
  },
  {
    title: 'COMPRAS',
    items: [
      { name: 'Orden de compra', path: '/orden-compra', icon: <ShoppingCart size={20} /> },
    ]
  },
  {
    title: 'VENTAS',
    items: [
      { name: 'Orden de venta', path: '/orden-venta', icon: <Receipt size={20} /> },
      { name: 'Facturación', path: '/facturacion', icon: <FileText size={20} /> },
      { name: 'Estado de cuenta', path: '/estado-cuenta', icon: <FileBarChart size={20} /> },
    ]
  },
  {
    title: 'INVENTARIOS',
    items: [
      { name: 'Ingreso al Kardex', path: '/ingreso-kardex', icon: <Package size={20} /> },
      { name: 'Movimiento de Kardex', path: '/movimiento-kardex', icon: <ArrowRightLeft size={20} /> },
      { name: 'Stock de productos', path: '/stock-productos', icon: <Boxes size={20} /> },
    ]
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      { name: 'Reportes', path: '/reportes', icon: <FileBarChart size={20} /> },
      { name: 'Mantenimientos', path: '/mantenimientos', icon: <Settings size={20} /> },
    ]
  }
];

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-20 bg-black/50"
            onClick={() => setSidebarOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ width: 260 }}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className={`fixed md:relative z-30 h-full flex flex-col transition-colors duration-300 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        } border-r shadow-xl md:shadow-none`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-inherit">
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <div className="absolute inset-0 bg-white/20 rounded-xl blur-[2px]"></div>
                <svg className="relative w-6 h-6 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className={`font-black text-xl tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  NEXUS<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">ERP</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SSJ Edition</span>
              </div>
            </motion.div>
          )}
          {!sidebarOpen && (
            <div className="mx-auto relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
              <div className="absolute inset-0 bg-white/20 rounded-xl blur-[2px]"></div>
              <svg className="relative w-6 h-6 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {MENU_SECTIONS.map((section, idx) => (
            <div key={idx}>
              {sidebarOpen && (
                <p className={`px-3 mb-2 text-[10px] font-bold tracking-widest uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item, itemIdx) => (
                  <NavLink
                    key={itemIdx}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold'
                          : `hover:bg-slate-100 dark:hover:bg-slate-800/50 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`
                      }`
                    }
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <div className="shrink-0">{item.icon}</div>
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span 
                          initial={{ opacity: 0, width: 0 }} 
                          animate={{ opacity: 1, width: 'auto' }} 
                          exit={{ opacity: 0, width: 0 }}
                          className="truncate text-sm"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-inherit">
           <button 
             onClick={() => setSidebarOpen(!sidebarOpen)}
             className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-colors ${
               darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
             }`}
           >
             <Menu size={20} />
           </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b transition-colors duration-300 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
               <Menu size={20} />
             </button>
             <div className="hidden sm:block">
               <h2 className="text-sm font-semibold opacity-70">TechSkillsPeru ERP - Demo</h2>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={toggleDarkMode} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 bg-slate-800' : 'hover:bg-slate-100 bg-slate-50'}`}>
              {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>
            <button className={`p-2 rounded-full relative transition-colors ${darkMode ? 'hover:bg-slate-800 bg-slate-800' : 'hover:bg-slate-100 bg-slate-50'}`}>
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm cursor-pointer border-2 border-white dark:border-slate-800">
              MR
            </div>
          </div>
        </header>

        {/* Content */}
        <div className={`flex-1 overflow-auto p-4 md:p-6 lg:p-8 ${darkMode ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
          <Outlet context={{ darkMode }} />
        </div>
      </main>

    </div>
  );
};
