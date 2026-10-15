import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AlertCircle, ShoppingCart,
  DollarSign, Download, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { analysisPdf } from './dashboardPdf';
import { analysisCsv, analysisTable, computeDashboard, dateKey, readRows } from './dashboardAnalytics';
import type { Period } from './dashboardAnalytics';
import { commercialSnapshot } from '../../services/commercialBackup';

import { useInventoryRefresh } from '../../services/useInventoryRefresh';

function loadInputs() {
  try {
    return {
      orders: readRows(localStorage, 'erp_ordenes_venta'), purchases: readRows(localStorage, 'erp_ordenes_compra'),
      invoices: readRows(localStorage, 'erp_estado_cuenta'), products: readRows(localStorage, 'erp_products_db'),
      movements: readRows(localStorage, 'erp_kardex_movimientos'), error: null as string | null,
    };
  } catch {
    return { orders: [], purchases: [], invoices: [], products: [], movements: [], error: 'No se pudieron leer los datos locales. Descarga un respaldo y revisa los registros antes de continuar; no fueron reemplazados.' };
  }
}

export const DashboardPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const navigate = useNavigate();
  const [inputs, setInputs] = useState(loadInputs);
  const [period, setPeriod] = useState<Period>('monthly');
  const [reference, setReference] = useState(() => dateKey(new Date().toISOString())!);
  const [currency, setCurrency] = useState('PEN');
  const data = useMemo(() => computeDashboard(inputs.orders, inputs.purchases, inputs.invoices, inputs.products, inputs.movements, period, reference, currency), [inputs, period, reference, currency]);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const PIE_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const handleRefresh = useCallback(() => setInputs(loadInputs()), []);
  useInventoryRefresh(handleRefresh);
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(val);
  const inventoryAlert = !inputs.error && data.stockList.some(item => item.state !== 'NORMAL');
  const periodLabel = `${data.range.start} al ${data.range.end}`;
  function download(content: string, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportAnalysis(kind: 'summary' | 'comparison' | 'sales' | 'inventory', format: 'PDF' | 'CSV') {
    if (inputs.error) return;
    const table = analysisTable(data, kind, currency);
    const filename = `${kind}_${kind === 'inventory' ? 'actual_PEN' : `${data.range.start}_${data.range.end}_${currency}`}`;
    if (format === 'CSV') { download(analysisCsv(table), `${filename}.csv`, 'text/csv;charset=utf-8'); return; }
    analysisPdf(table).save(`${filename}.pdf`);
  }
  const exportButtons = (kind: 'comparison' | 'sales' | 'inventory') => <div className="flex gap-2 mt-2 text-xs print:hidden">
    <button type="button" onClick={() => exportAnalysis(kind, 'PDF')} className="px-2 py-1 border rounded" disabled={Boolean(inputs.error)}>PDF</button>
    <button type="button" onClick={() => exportAnalysis(kind, 'CSV')} className="px-2 py-1 border rounded" disabled={Boolean(inputs.error)}>CSV</button>
  </div>;
  const handleExportPDF = () => exportAnalysis('summary', 'PDF');
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

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Botonera Superior (No incluida en el PDF) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Resumen general
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Operaciones del periodo: {periodLabel}. Moneda: {currency}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={Boolean(inputs.error)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors shadow-sm bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
          >
            <Download size={16} />
            Resumen PDF
          </button>
        </div>
      </div>

      <div className={`flex flex-wrap items-end gap-4 p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
        <label className="text-sm">Periodo<select aria-label="Periodo" value={period} onChange={e => setPeriod(e.target.value as Period)} className="block mt-1 p-2 border rounded bg-transparent"><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="yearly">Anual</option></select></label>
        <label className="text-sm">Fecha de referencia<input aria-label="Fecha de referencia" type="date" value={reference} onChange={e => { if (dateKey(e.target.value)) setReference(e.target.value); }} className="block mt-1 p-2 border rounded bg-transparent" /></label>
        <label className="text-sm">Moneda<select aria-label="Moneda" value={currency} onChange={e => setCurrency(e.target.value)} className="block mt-1 p-2 border rounded bg-transparent"><option value="PEN">PEN</option><option value="USD">USD</option></select></label>
        <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => exportAnalysis('summary', 'CSV')} disabled={Boolean(inputs.error)}>Resumen CSV</button>
        <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => download(JSON.stringify(commercialSnapshot(localStorage), null, 2), `respaldo_comercial_${Date.now()}.json`, 'application/json')}>Descargar respaldo</button>
      </div>
      {inputs.error && <p role="alert" className="p-4 border border-red-300 rounded text-red-600">{inputs.error}</p>}
      {!inputs.error && <div className="text-xs text-slate-500 space-y-1">
        <p>Los importes de ventas incluyen IGV; compras representa órdenes emitidas. Sin conversión entre monedas. Los saldos pendientes y las existencias son actuales, sin filtro de periodo.</p>
        {data.warnings.map(warning => <p key={warning}>{warning}</p>)}
        {data.ventasTotales === 0 && data.comprasTotales === 0 && <p role="status">Sin operaciones para este periodo y moneda.</p>}
      </div>}
      {!inputs.error && <div ref={dashboardRef} className="space-y-6">
        
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Main Kpi - Ventas del Periodo */}
          <motion.div variants={itemVariants} className={`col-span-1 lg:col-span-2 p-5 rounded-2xl border ${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-slate-900 border-blue-500/20' : 'bg-white border-blue-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-2">
              <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Ventas del Periodo</p>

            </div>
            <h2 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(data.ventasTotales)}</h2>
            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-100'} text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
              Diferencia ventas menos compras: <span className="font-bold">{formatCurrency(data.diferencia)}</span>. No es margen bruto: falta un costo de ventas fiable. <span className="text-rose-500 font-bold">{data.stockBajo} ref.</span> bajo stock.
            </div>
          </motion.div>

          {/* Compras */}
          <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><ShoppingCart size={18} /></div>

            </div>
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Compras</p>
            <h3 className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(data.comprasTotales)}</h3>
          </motion.div>

          {/* Cuentas Pendientes */}
          <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><DollarSign size={18} /></div>
            </div>
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Saldo pendiente actual</p>
            <h3 className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(data.ctasPendientes)}</h3>
          </motion.div>

          {/* Stock Bajo */}
          <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}><AlertCircle size={18} /></div>
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-1 mr-1"></div>
            </div>
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stock crítico actual</p>
            <h3 className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.stockBajo} SKU</h3>
          </motion.div>
        </div>

        {/* Main Bar Chart */}
        <motion.div variants={itemVariants} className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} h-[380px] flex flex-col`}>
          <div className="mb-4">
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Ventas vs. Compras</h3>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{periodLabel} · {currency}</p>
            {exportButtons('comparison')}
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} tickFormatter={(val) => `${currency} ${(val / 1000)}k`} />
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
              <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Ventas del periodo</h3>
              <p className={`text-xs uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{periodLabel} · {currency}</p>
              {exportButtons('sales')}
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
              <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Existencias por categoría a precio de venta</h3>
              <p className={`text-xs uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Inventario actual · PEN · Sin filtro de periodo</p>
              <p className="text-xs text-slate-500">Stock × precio de venta; no ventas realizadas ni valorización al costo.</p>
              {exportButtons('inventory')}
            </div>
            <div className="flex-1 w-full min-h-0 relative">
              {data.inventoryTotal === 0 ? <p role="status" className="p-6 text-sm text-slate-500">Sin datos: el valor total de las existencias es cero.</p> : <ResponsiveContainer width="100%" height="100%">
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
              </ResponsiveContainer>}
              {/* Custom Legend */}
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {data.pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                    <span className={`text-[11px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{entry.name}: {entry.percentage.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>

        {/* Alerta Activa - Stock */}
        <motion.div variants={itemVariants} className={`rounded-2xl border overflow-hidden ${inventoryAlert ? (darkMode ? 'bg-slate-900 border-orange-900/50' : 'bg-white border-orange-200') : (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}`}>
          <div className={`px-5 py-3 border-b flex items-center justify-between ${inventoryAlert ? (darkMode ? 'bg-orange-950/30 border-orange-900/50' : 'bg-orange-50 border-orange-100') : (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100')}`}>
            <div className={`flex items-center gap-2 font-bold text-sm tracking-widest uppercase ${inventoryAlert ? 'text-orange-600 dark:text-orange-500' : 'text-slate-500'}`}>
              <AlertTriangle size={16} /> {inputs.error ? 'ESTADO NO DISPONIBLE' : data.stockList.some(p => p.state === 'INCONSISTENTE') ? 'REVISAR INCONSISTENCIAS' : data.stockBajo > 0 ? `ALERTA ACTIVA: ${data.stockBajo}` : 'SIN ALERTAS DE STOCK'}
            </div>
            <span className="text-xs font-mono text-orange-500 dark:text-orange-600/70">Inventario actual</span>
          </div>
          
          <div className="p-6">
            <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {data.stockBajo > 0 
                ? `Sin existencias o stock bajo en ${data.stockBajo} referencias`
                : inputs.error ? 'No se pudo leer el inventario' : data.stockList.some(p => p.state === 'INCONSISTENTE') ? 'Existen saldos o minimos inconsistentes' : 'Sin productos criticos'}
            </h4>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {data.stockBajo > 0
                ? 'Las existencias actuales requieren reposición. Se recomienda emitir orden de compra.'
                : 'Consulta los estados actuales de las referencias; no se reconstruyeron saldos desde el Kardex.'}
            </p>
            
            <div className="mt-6 space-y-4">
              {data.stockList.filter(item => item.state !== 'NORMAL').length === 0 ? (
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{inputs.error ? 'No se pudo comprobar el estado del inventario.' : 'No hay alertas criticas pendientes.'}</p>
              ) : (
                data.stockList.filter(item => item.state !== 'NORMAL').map((item) => (
                  <div key={item.id} className={`flex items-center justify-between pb-4 border-b last:border-0 last:pb-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</p>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.sku} / {item.state === 'INCONSISTENTE' ? 'Inconsistencia: revisar saldo o minimo' : item.state === 'AGOTADO' ? 'Sin existencias' : 'Stock bajo'}</p>
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
                Ir a crear orden de compra
              </button>

            </div>
          </div>
        </motion.div>

        {/* Ultimos Movimientos */}
        <motion.div variants={itemVariants} className={`rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Últimos movimientos de Kardex · {periodLabel} · PEN</h3>
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
                        {mov.tipo === 'ingreso' ? '+' : '-'}{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(mov.monto)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
        
      </div>}
    </motion.div>
  );
};
