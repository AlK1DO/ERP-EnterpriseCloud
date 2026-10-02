import React from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Users, FileText, Package, 
  ShoppingCart, Building2, Wallet, Settings,
  ArrowRight, Shield, BarChart3, Files
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  // KPIs Simulados para el ERP
  const stats = [
    { title: 'Ventas Mensuales', value: 'S/ 45,231.00', icon: <TrendingUp size={24} className="text-emerald-500" />, trend: '+12.5%', trendUp: true, desc: 'vs el mes anterior' },
    { title: 'Clientes Activos', value: '142', icon: <Users size={24} className="text-blue-500" />, trend: '+4', trendUp: true, desc: 'Nuevos esta semana' },
    { title: 'Cotizaciones Pendientes', value: '12', icon: <FileText size={24} className="text-orange-500" />, trend: '3 Urgentes', trendUp: false, desc: 'Esperando aprobación' },
    { title: 'Alertas de Stock', value: '8', icon: <Package size={24} className="text-red-500" />, trend: '-2', trendUp: false, desc: 'Productos por agotarse' },
  ];

  // Estructura de Módulos (Arquitectura del Sistema)
  const architectureModules = [
    {
      title: 'Comercial',
      description: 'Gestión de clientes, cotizaciones y facturación.',
      icon: <ShoppingCart size={28} className="text-[#ff5a1f]" />,
      bg: 'bg-orange-50/50',
      borderColor: 'border-orange-100',
      iconBg: 'bg-orange-100',
      links: [
        { name: 'Clientes', path: '/clientes' },
        { name: 'Cotizaciones', path: '/cotizaciones' },
        { name: 'Ventas', path: '/ventas' },
        { name: 'Facturación', path: '/facturacion' },
      ]
    },
    {
      title: 'Compras',
      description: 'Proveedores, solicitudes y órdenes de compra.',
      icon: <Building2 size={28} className="text-teal-600" />,
      bg: 'bg-teal-50/50',
      borderColor: 'border-teal-100',
      iconBg: 'bg-teal-100',
      links: [
        { name: 'Proveedores', path: '/proveedores' },
        { name: 'Solicitudes', path: '/solicitudes' },
        { name: 'Órdenes', path: '/ordenes' },
        { name: 'Recepción', path: '/recepcion' },
      ]
    },
    {
      title: 'Inventario',
      description: 'Control de stock, almacenes y kardex.',
      icon: <Package size={28} className="text-indigo-600" />,
      bg: 'bg-indigo-50/50',
      borderColor: 'border-indigo-100',
      iconBg: 'bg-indigo-100',
      links: [
        { name: 'Productos', path: '/productos' },
        { name: 'Almacenes', path: '/almacenes' },
        { name: 'Kardex', path: '/kardex' },
        { name: 'Transferencias', path: '/transferencias' },
      ]
    },
    {
      title: 'Finanzas',
      description: 'Cuentas por cobrar, pagar y tesorería.',
      icon: <Wallet size={28} className="text-emerald-600" />,
      bg: 'bg-emerald-50/50',
      borderColor: 'border-emerald-100',
      iconBg: 'bg-emerald-100',
      links: [
        { name: 'CxC', path: '/cxc' },
        { name: 'CxP', path: '/cxp' },
        { name: 'Caja', path: '/caja' },
        { name: 'Bancos', path: '/bancos' },
      ]
    },
    {
      title: 'Sistema & Operaciones',
      description: 'Documentos y analíticas del ERP.',
      icon: <BarChart3 size={28} className="text-blue-600" />,
      bg: 'bg-blue-50/50',
      borderColor: 'border-blue-100',
      iconBg: 'bg-blue-100',
      links: [
        { name: 'Documentos', path: '/documentos' },
        { name: 'Reportes', path: '/reportes' },
      ]
    },
    {
      title: 'Administración',
      description: 'Control de accesos y seguridad del sistema.',
      icon: <Shield size={28} className="text-slate-600" />,
      bg: 'bg-slate-50/50',
      borderColor: 'border-slate-100',
      iconBg: 'bg-slate-200',
      links: [
        { name: 'Usuarios', path: '/usuarios' },
        { name: 'Roles', path: '/roles' },
        { name: 'Permisos', path: '/permisos' },
        { name: 'Auditoría', path: '/auditoria' },
      ]
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header del Dashboard */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Centro de Control</h1>
        <p className="text-gray-500 mt-1">Resumen general y acceso rápido a la arquitectura de módulos del ERP.</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                {stat.icon}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stat.trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {stat.trend}
              </span>
            </div>
            <div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-2">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Arquitectura de Módulos (Grid Distribuida) */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Settings className="text-gray-400" size={20} />
          Arquitectura del Sistema
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {architectureModules.map((module, idx) => (
            <div key={idx} className={`rounded-2xl border ${module.borderColor} bg-white shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md`}>
              {/* Header de la Tarjeta del Módulo */}
              <div className={`p-5 ${module.bg} border-b ${module.borderColor} flex items-start gap-4`}>
                <div className={`p-3 rounded-xl ${module.iconBg} shadow-sm shrink-0`}>
                  {module.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{module.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-snug">{module.description}</p>
                </div>
              </div>
              
              {/* Lista de Submódulos */}
              <div className="p-2 flex-1">
                <ul className="grid grid-cols-2 gap-1">
                  {module.links.map((link, lidx) => (
                    <li key={lidx}>
                      <Link 
                        to={link.path}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-[#ff5a1f] transition-colors group"
                      >
                        <span className="text-sm font-medium">{link.name}</span>
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#ff5a1f]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
