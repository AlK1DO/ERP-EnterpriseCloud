import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, AlertCircle, ShoppingCart, 
  DollarSign, Percent, Download, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface DashboardData {
  ventasTotales: number;
  comprasTotales: number;
  ctasPendientes: number;
  stockBajo: number;
  margen: number;
  chartData: any[];
}

export const DashboardPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulación de fetch y localStorage
  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      const cached = localStorage.getItem('erp_dashboard_data');
      
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
      } else {
        // Datos iniciales simulados
        const mockData = {
          ventasTotales: 482310.90,
          comprasTotales: 261480,
          ctasPendientes: 64902,
          stockBajo: 3,
          margen: 34.6,
          chartData: [
            { name: 'Ene', Ventas: 320000, Compras: 200000 },
            { name: 'Feb', Ventas: 300000, Compras: 180000 },
            { name: 'Mar', Ventas: 350000, Compras: 210000 },
            { name: 'Abr', Ventas: 400000, Compras: 240000 },
            { name: 'May', Ventas: 390000, Compras: 220000 },
            { name: 'Jun', Ventas: 482000, Compras: 260000 },
          ]
        };
        localStorage.setItem('erp_dashboard_data', JSON.stringify(mockData));
        setData(mockData);
        setTimeout(() => setLoading(false), 600); // Simulamos delay
      }
    };

    fetchData();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      // Simular variación en los datos
      const newData = { ...data! };
      newData.ventasTotales += Math.random() * 5000;
      newData.chartData[5].Ventas = newData.ventasTotales;
      localStorage.setItem('erp_dashboard_data', JSON.stringify(newData));
      setData(newData);
      setLoading(false);
    }, 800);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: import('framer-motion').Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className={`animate-spin ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} size={32} />
      </div>
    );
  }

  const formatCurrency = (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Panel de Control Estratégico
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Resumen operativo de compras, ventas, cobranzas e inventario. Periodo: Junio 2026
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
            <Download size={16} />
            Exportar Resumen
          </button>
        </div>
      </div>

      {/* Main Kpi - Ventas del Periodo */}
      <motion.div variants={itemVariants} className={`p-6 rounded-2xl border ${
        darkMode ? 'bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/20' : 'bg-white border-indigo-100 shadow-sm'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Ventas del Periodo</p>
            <h2 className={`text-4xl md:text-5xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(data.ventasTotales)}
            </h2>
          </div>
          <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-sm font-bold">
            <TrendingUp size={16} />
            +12.4% vs. mayo
          </div>
        </div>
        <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-100'} text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Margen bruto estimado de <span className="font-bold text-emerald-500">{data.margen}%</span>. <span className="text-rose-500 font-bold">{data.stockBajo} referencias</span> están por debajo del stock mínimo y comprometen los despachos programados.
        </div>
      </motion.div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compras */}
        <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <ShoppingCart size={20} />
            </div>
            <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-1 rounded-md">
              <TrendingUp size={12} className="mr-1" /> 11.2%
            </span>
          </div>
          <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Compras (Actual)</p>
          <h3 className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(data.comprasTotales)}</h3>
        </motion.div>

        {/* Cuentas Pendientes */}
        <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign size={20} />
            </div>
            <span className="flex items-center text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-1 rounded-md">
              <TrendingUp size={12} className="mr-1" /> 8.7%
            </span>
          </div>
          <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ctas. Pendientes</p>
          <h3 className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(data.ctasPendientes)}</h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>3 documentos por cobrar</p>
        </motion.div>

        {/* Stock Bajo */}
        <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
              <AlertCircle size={20} />
            </div>
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-2 mr-2"></div>
          </div>
          <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stock Crítico</p>
          <h3 className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.stockBajo} SKU</h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Requiere reposición urgente</p>
        </motion.div>

        {/* Margen */}
        <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <Percent size={20} />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-md">
              <TrendingUp size={12} className="mr-1" /> 1.8 pts
            </span>
          </div>
          <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Margen Bruto</p>
          <h3 className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.margen}%</h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Acumulado del mes</p>
        </motion.div>
      </div>

      {/* Chart Section */}
      <motion.div variants={itemVariants} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} h-[450px] flex flex-col`}>
        <div className="mb-6">
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Ventas vs. Compras</h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Evolución de los últimos 6 meses</p>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                tickFormatter={(val) => `S/ ${(val / 1000)}k`} 
              />
              <Tooltip 
                cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc' }}
                contentStyle={{ 
                  backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                  borderColor: darkMode ? '#334155' : '#e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: any) => [formatCurrency(value), '']}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ paddingTop: '20px' }} 
              />
              <Bar 
                dataKey="Ventas" 
                fill="#4f46e5" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
                name="Ventas Totales"
              />
              <Bar 
                dataKey="Compras" 
                fill={darkMode ? '#38bdf8' : '#93c5fd'} 
                radius={[4, 4, 0, 0]} 
                barSize={32}
                name="Compras Totales"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    </motion.div>
  );
};
