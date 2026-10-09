import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, AlertCircle, ShoppingCart, 
  DollarSign, Percent, Download, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardData {
  ventasTotales: number;
  comprasTotales: number;
  ctasPendientes: number;
  stockBajo: number;
  margen: number;
  chartData: any[];
  areaChartData: any[];
  pieData: any[];
  stockList: any[];
  ultimosMovimientos: any[];
}

export const DashboardPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const initialData = {
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
    ],
    areaChartData: [
      { name: 'L', value: 120 }, { name: 'M', value: 180 }, { name: 'X', value: 150 }, 
      { name: 'J', value: 250 }, { name: 'V', value: 350 }, { name: 'S', value: 220 }, { name: 'D', value: 90 }
    ],
    pieData: [
      { name: 'Tuberías PVC', value: 400 },
      { name: 'Películas PP', value: 300 },
      { name: 'Gránulos ABS', value: 200 },
      { name: 'Accesorios', value: 100 },
    ],
    stockList: [
      { id: 1, name: 'Pelicula polipropileno 1.2mm', sku: 'PP-1200 - Central', current: 128, min: 500 },
      { id: 2, name: 'Gránulo ABS virgen 25kg', sku: 'ABS-25 - Planta', current: 46, min: 200 },
      { id: 3, name: 'Pelicula stretch industrial 25mm', sku: 'PEL-001 - Planta', current: 40, min: 1200 },
    ],
    ultimosMovimientos: [
      { id: 1, fecha: '08 Jun 2026', descripcion: 'Ingreso de mercadería - Fac #4402', tipo: 'ingreso', monto: 12500.00 },
      { id: 2, fecha: '07 Jun 2026', descripcion: 'Pago a proveedor - Plastix SAC', tipo: 'salida', monto: 4200.50 },
      { id: 3, fecha: '07 Jun 2026', descripcion: 'Venta corporativa - Grupo Rey', tipo: 'ingreso', monto: 35000.00 },
      { id: 4, fecha: '06 Jun 2026', descripcion: 'Compra de insumos - Orden #102', tipo: 'salida', monto: 8300.00 },
    ]
  };

  const PIE_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

  useEffect(() => {
    const fetchData = () => {
      setLoading(true);
      const cached = localStorage.getItem('erp_dashboard_data');
      if (cached) {
        const parsedData = JSON.parse(cached);
        // Verificar integridad del caché
        if (!parsedData.pieData || !parsedData.ultimosMovimientos) {
          localStorage.setItem('erp_dashboard_data', JSON.stringify(initialData));
          setData(initialData);
        } else {
          setData(parsedData);
        }
        setLoading(false);
      } else {
        localStorage.setItem('erp_dashboard_data', JSON.stringify(initialData));
        setData(initialData);
        setTimeout(() => setLoading(false), 600);
      }
    };
    fetchData();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const factor = () => 0.8 + Math.random() * 0.4;
      
      const newData = {
        ...data!,
        ventasTotales: data!.ventasTotales * factor(),
        comprasTotales: data!.comprasTotales * factor(),
        ctasPendientes: data!.ctasPendientes * factor(),
        stockBajo: Math.floor(Math.random() * 5) + 1,
        margen: parseFloat((data!.margen + (Math.random() * 2 - 1)).toFixed(1)),
        chartData: data!.chartData.map(d => ({ ...d, Ventas: d.Ventas * factor(), Compras: d.Compras * factor() })),
        areaChartData: data!.areaChartData.map(d => ({ ...d, value: Math.floor(d.value * factor()) })),
        pieData: data!.pieData.map(d => ({ ...d, value: Math.floor(d.value * factor()) })),
        stockList: data!.stockList.map(item => ({ ...item, current: Math.floor(item.current * factor()) })),
        ultimosMovimientos: data!.ultimosMovimientos.map(item => ({ ...item, monto: item.monto * factor() }))
      };

      localStorage.setItem('erp_dashboard_data', JSON.stringify(newData));
      setData(newData);
      setLoading(false);
    }, 600);
  };

  const handleExportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('ERP SENATINO - Resumen Operativo', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text('Periodo: Junio 2026', 14, 30);
    
    // KPIs
    autoTable(doc, {
      startY: 40,
      head: [['Métrica', 'Valor', 'Detalle']],
      body: [
        ['Ventas Totales', formatCurrency(data.ventasTotales), 'Acumulado del mes'],
        ['Compras Totales', formatCurrency(data.comprasTotales), 'Órdenes de compra'],
        ['Cuentas Pendientes', formatCurrency(data.ctasPendientes), 'Cuentas por cobrar'],
        ['Stock Crítico', `${data.stockBajo} SKU`, 'Requieren reposición urgente'],
        ['Margen Bruto', `${data.margen}%`, 'Margen promedio estimado']
      ],
      theme: 'grid',
      headStyles: { fillColor: [29, 78, 216] } // blue-700
    });
    
    // Movimientos
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Fecha', 'Descripción', 'Tipo', 'Monto']],
      body: data.ultimosMovimientos.map(m => [
        m.fecha, 
        m.descripcion, 
        m.tipo.toUpperCase(), 
        formatCurrency(m.monto)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [29, 78, 216] }
    });

    doc.save('resumen_erp_senatino.pdf');
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
        <RefreshCw className={`animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={32} />
      </div>
    );
  }

  const formatCurrency = (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto pb-10">
      
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
          <button onClick={handleRefresh} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Main Kpi - Ventas del Periodo */}
        <motion.div variants={itemVariants} className={`col-span-1 lg:col-span-2 p-5 rounded-2xl border ${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-slate-900 border-blue-500/20' : 'bg-white border-blue-100 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Ventas del Periodo</p>
            <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md text-xs font-bold">
              <TrendingUp size={14} /> +12.4%
            </div>
          </div>
          <h2 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(data.ventasTotales)}</h2>
          <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-100'} text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
            Margen bruto de <span className="font-bold text-emerald-500">{data.margen}%</span>. <span className="text-rose-500 font-bold">{data.stockBajo} ref.</span> bajo stock.
          </div>
        </motion.div>

        {/* Compras */}
        <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><ShoppingCart size={18} /></div>
            <span className="flex items-center text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-1.5 py-0.5 rounded">
              <TrendingUp size={10} className="mr-1" /> 11.2%
            </span>
          </div>
          <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Compras</p>
          <h3 className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(data.comprasTotales)}</h3>
        </motion.div>

        {/* Cuentas Pendientes */}
        <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><DollarSign size={18} /></div>
          </div>
          <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ctas. Pendientes</p>
          <h3 className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(data.ctasPendientes)}</h3>
        </motion.div>

        {/* Stock Bajo */}
        <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><AlertCircle size={18} /></div>
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-1 mr-1"></div>
          </div>
          <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stock Crítico</p>
          <h3 className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.stockBajo} SKU</h3>
        </motion.div>
      </div>

      {/* Main Bar Chart */}
      <motion.div variants={itemVariants} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} h-[380px] flex flex-col`}>
        <div className="mb-4">
          <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Ventas vs. Compras</h3>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Últimos 6 meses</p>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} tickFormatter={(val) => `S/ ${(val / 1000)}k`} />
              <Tooltip 
                cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc' }}
                contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                formatter={(value: any) => [formatCurrency(value), '']}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="Ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="Compras" fill={darkMode ? '#38bdf8' : '#bfdbfe'} radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Row for Area Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ventas de la semana (Area Chart) */}
        <motion.div variants={itemVariants} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} h-[300px] flex flex-col`}>
          <div className="mb-2">
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Ventas de la semana</h3>
            <p className={`text-xs uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ÚLTIMOS 7 DÍAS</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.areaChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Participación por línea (Pie Chart) */}
        <motion.div variants={itemVariants} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} h-[300px] flex flex-col`}>
          <div className="mb-2">
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Participación por línea</h3>
            <p className={`text-xs uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>JUNIO 2026</p>
          </div>
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {data.pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                  <span className={`text-[11px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>

      {/* Alerta Activa - Stock */}
      <motion.div variants={itemVariants} className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-orange-900/50' : 'bg-white border-orange-200'}`}>
        <div className={`px-5 py-3 border-b flex items-center justify-between ${darkMode ? 'bg-orange-950/30 border-orange-900/50' : 'bg-orange-50 border-orange-100'}`}>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 font-bold text-sm tracking-widest uppercase">
            <AlertTriangle size={16} /> ALERTA ACTIVA
          </div>
          <span className="text-xs font-mono text-orange-500 dark:text-orange-600/70">ALR-3041</span>
        </div>
        
        <div className="p-6">
          <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Stock por debajo del mínimo en {data.stockBajo} referencias</h4>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Las salidas programadas de esta semana superan el saldo disponible. Se recomienda emitir orden de compra antes del cierre.</p>
          
          <div className="mt-6 space-y-4">
            {data.stockList.slice(0, data.stockBajo).map((item) => (
              <div key={item.id} className={`flex items-center justify-between pb-4 border-b last:border-0 last:pb-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</p>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.sku}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{item.current}</span>
                  <span className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}> / {item.min}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 dark:text-orange-400 py-2.5 rounded-lg text-sm font-bold transition-colors">
              Generar orden de compra
            </button>
            <button className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors border ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Posponer
            </button>
          </div>
        </div>
      </motion.div>

      {/* Ultimos Movimientos */}
      <motion.div variants={itemVariants} className={`rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Últimos movimientos</h3>
          <button onClick={handleExportPDF} className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            Exportar
          </button>
        </div>
        <div className="p-0">
          <table className="w-full text-left text-sm">
            <thead className={`text-xs ${darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              <tr>
                <th className="px-6 py-3 font-medium border-b border-inherit">Fecha</th>
                <th className="px-6 py-3 font-medium border-b border-inherit">Descripción</th>
                <th className="px-6 py-3 font-medium border-b border-inherit">Tipo</th>
                <th className="px-6 py-3 font-medium text-right border-b border-inherit">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {data.ultimosMovimientos.map((mov) => (
                <tr key={mov.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                  <td className={`px-6 py-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{mov.fecha}</td>
                  <td className={`px-6 py-4 font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{mov.descripcion}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      mov.tipo === 'ingreso' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}>
                      {mov.tipo === 'ingreso' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    <span className={mov.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

    </motion.div>
  );
};
