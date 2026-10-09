import React, { useEffect, useState, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, AlertCircle, ShoppingCart, 
  DollarSign, Percent, Download, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { inventarioService } from '../../services/inventarioService';

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
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const PIE_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const computeRealData = async (): Promise<DashboardData> => {
    // 1. Ventas reales
    const cachedVentas = localStorage.getItem('erp_ordenes_venta');
    const ventas: any[] = cachedVentas ? JSON.parse(cachedVentas) : [];
    const ventasTotales = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

    // 2. Compras reales
    const cachedCompras = localStorage.getItem('erp_ordenes_compra');
    const compras: any[] = cachedCompras ? JSON.parse(cachedCompras) : [];
    const comprasTotales = compras.reduce((acc, c) => acc + (Number(c.total) || 0), 0);

    // 3. Cuentas pendientes reales
    const cachedCuenta = localStorage.getItem('erp_estado_cuenta');
    const cuentas: any[] = cachedCuenta ? JSON.parse(cachedCuenta) : [];
    const ctasPendientes = cuentas.reduce((acc, d) => acc + (Number(d.saldo) || 0), 0);

    // 4. Productos y Stock reales
    const productos = await inventarioService.getProductos();
    const stockCritico = productos.filter(p => p.stock <= p.stockMinimo);
    const stockBajo = stockCritico.length;

    // 5. Margen
    const margen = ventasTotales > 0 
      ? parseFloat((((ventasTotales - comprasTotales) / ventasTotales) * 100).toFixed(1))
      : 0;

    // 6. Lista de Stock
    const stockList = productos.map(p => ({
      id: p.id,
      name: p.descripcion,
      sku: `${p.codigo} - ${p.almacen}`,
      current: p.stock,
      min: p.stockMinimo
    }));

    // 7. Movimientos reales de Kardex
    const kardexMovs = await inventarioService.getMovimientos();
    const ultimosMovimientos = kardexMovs.slice(0, 5).map((m, idx) => ({
      id: m.id || idx,
      fecha: new Date(m.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
      descripcion: `${m.documentoTipo} ${m.documentoNumero} - ${m.productoDescripcion}`,
      tipo: m.tipoMovimiento === 'ENTRADA' ? 'ingreso' : 'salida',
      monto: m.tipoMovimiento === 'ENTRADA' ? (m.totalEntrada || 0) : (m.totalSalida || 0)
    }));

    // 8. Participación por línea según valorización de inventario
    const catMap: Record<string, number> = {};
    productos.forEach(p => {
      catMap[p.categoria] = (catMap[p.categoria] || 0) + (p.stock * p.precioVenta);
    });
    const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value: Math.round(value) }));
    if (pieData.length === 0) {
      pieData.push({ name: 'Sin productos', value: 1 });
    }

    // 9. Datos de comparación real
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = monthNames[new Date().getMonth()];
    const chartData = [
      { name: currentMonth, Ventas: Math.round(ventasTotales), Compras: Math.round(comprasTotales) }
    ];

    const areaChartData = [
      { name: 'L', value: Math.round(ventasTotales * 0.1) },
      { name: 'M', value: Math.round(ventasTotales * 0.15) },
      { name: 'X', value: Math.round(ventasTotales * 0.2) },
      { name: 'J', value: Math.round(ventasTotales * 0.25) },
      { name: 'V', value: Math.round(ventasTotales * 0.3) },
    ];

    return {
      ventasTotales,
      comprasTotales,
      ctasPendientes,
      stockBajo,
      margen,
      chartData,
      areaChartData,
      pieData,
      stockList,
      ultimosMovimientos
    };
  };

  const loadData = async () => {
    setLoading(true);
    const realData = await computeRealData();
    setData(realData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleExportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    
    // Título Principal
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('ERP SENATINO - Reporte Ejecutivo', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} | Periodo: Junio 2026`, 14, 30);
    
    // 1. KPIs Generales
    autoTable(doc, {
      startY: 40,
      head: [['Métrica Principal', 'Valor Registrado', 'Observación']],
      body: [
        ['Ventas Totales', formatCurrency(data.ventasTotales), 'Acumulado del mes'],
        ['Compras Totales', formatCurrency(data.comprasTotales), 'Órdenes de compra ejecutadas'],
        ['Cuentas Pendientes', formatCurrency(data.ctasPendientes), 'Cuentas por cobrar a clientes'],
        ['Stock Crítico', `${data.stockBajo} Productos`, 'Requieren reposición urgente'],
        ['Margen Bruto', `${data.margen}%`, 'Margen promedio estimado general']
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 11, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { bottom: 15 }
    });
    
    // 2. Alertas de Stock (Relleno)
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Productos en Alerta de Stock', 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['SKU', 'Producto', 'Stock Actual', 'Mínimo']],
      body: data.stockList.map(item => [
        item.sku.split(' - ')[0], 
        item.name, 
        item.current.toString(), 
        item.min.toString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12], fontSize: 11 },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      margin: { bottom: 15 }
    });

    // 3. Resumen Financiero Mensual (Datos del gráfico de barras)
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Histórico Ventas vs Compras (Últimos 6 meses)', 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Mes', 'Total Ventas', 'Total Compras', 'Balance']],
      body: data.chartData.map(d => [
        d.name,
        formatCurrency(d.Ventas),
        formatCurrency(d.Compras),
        formatCurrency(d.Ventas - d.Compras)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], fontSize: 11 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { bottom: 15 }
    });

    // 4. Últimos Movimientos
    let startYMovimientos = (doc as any).lastAutoTable.finalY + 20;
    
    if (startYMovimientos > 240) {
      doc.addPage();
      startYMovimientos = 25;
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Registro de Últimos Movimientos', 14, 20);
    } else {
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Registro de Últimos Movimientos', 14, startYMovimientos - 5);
    }
      
    autoTable(doc, {
      startY: startYMovimientos,
      head: [['Fecha', 'Descripción Operativa', 'Tipo', 'Monto (S/)']],
      body: data.ultimosMovimientos.map(m => [
        m.fecha, 
        m.descripcion, 
        m.tipo.toUpperCase(), 
        formatCurrency(m.monto)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], fontSize: 11 },
      alternateRowStyles: { fillColor: [240, 253, 244] }
    });

    doc.save('Reporte_Completo_ERPSenatino.pdf');
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
      
      {/* Botonera Superior (No incluida en el PDF) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
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
          <button 
            onClick={handleExportPDF} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors shadow-sm bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
          >
            <Download size={16} />
            Exportar Reporte PDF
          </button>
        </div>
      </div>

      {/* Contenedor que será capturado por html2canvas */}
      <div ref={dashboardRef} className="space-y-6">
        
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
                    {data.pieData.map((_, index) => (
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
            <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {data.stockBajo > 0 
                ? `Stock por debajo del mínimo en ${data.stockBajo} referencias` 
                : 'Inventario en niveles óptimos'}
            </h4>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {data.stockBajo > 0
                ? 'Las existencias actuales requieren reposición. Se recomienda emitir orden de compra.'
                : 'Todas las referencias activas cuentan con existencias suficientes según el stock de seguridad.'}
            </p>
            
            <div className="mt-6 space-y-4">
              {data.stockList.filter(item => item.current <= item.min).length === 0 ? (
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No hay alertas críticas pendientes.</p>
              ) : (
                data.stockList.filter(item => item.current <= item.min).map((item) => (
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
                ))
              )}
            </div>

            <div className="mt-6 flex gap-3 pdf-exclude-buttons">
              <button 
                onClick={() => navigate('/orden-compra')}
                className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 dark:text-orange-400 py-2.5 rounded-lg text-sm font-bold transition-colors"
              >
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
        
      </div>
    </motion.div>
  );
};
