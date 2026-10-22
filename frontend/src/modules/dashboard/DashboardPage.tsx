import React, { useEffect, useState, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, AlertCircle, ShoppingCart, 
  DollarSign, Percent, Download, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight, FileSpreadsheet
} from 'lucide-react';
import { 
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { inventarioService } from '../../services/inventarioService';
import { supabase } from '@/lib/supabase';

interface DashboardData {
  ventasTotales: number;
  comprasTotales: number;
  ctasPendientes: number;
  stockBajo: number;
  margen: number;
  chartDataSemanal: { name: string; Ventas: number; Compras: number }[];
  chartDataMensual: { name: string; Ventas: number; Compras: number }[];
  chartDataAnual: { name: string; Ventas: number; Compras: number }[];
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
  const [chartPeriod, setChartPeriod] = useState<'semanal' | 'mensual' | 'anual'>('mensual');

  const computeRealData = async (): Promise<DashboardData> => {
    // 1. Ventas reales de Supabase y local
    let dbVentas: any[] = [];
    try {
      const { data: vData } = await supabase.from('ventas').select('id, numero, total, fecha, created_at');
      dbVentas = vData || [];
    } catch (e) {
      console.warn('Error fetching ventas from Supabase:', e);
    }
    const cachedVentas = localStorage.getItem('erp_ordenes_venta');
    const localVentas: any[] = cachedVentas ? JSON.parse(cachedVentas) : [];
    
    const ventasMap = new Map<string, any>();
    dbVentas.forEach(v => ventasMap.set(v.id || v.numero, v));
    localVentas.forEach(v => {
      const key = v.id || v.numero;
      if (!ventasMap.has(key)) ventasMap.set(key, v);
    });
    const allVentas = Array.from(ventasMap.values());
    const ventasTotales = allVentas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

    // 2. Compras reales de Supabase y local
    let dbCompras: any[] = [];
    try {
      const { data: cData } = await supabase.from('ordenes_compra').select('id, numero, total, fecha, created_at');
      dbCompras = cData || [];
    } catch (e) {
      console.warn('Error fetching compras from Supabase:', e);
    }
    const cachedCompras = localStorage.getItem('erp_ordenes_compra');
    const localCompras: any[] = cachedCompras ? JSON.parse(cachedCompras) : [];

    const comprasMap = new Map<string, any>();
    dbCompras.forEach(c => comprasMap.set(c.id || c.numero, c));
    localCompras.forEach(c => {
      const key = c.id || c.numero;
      if (!comprasMap.has(key)) comprasMap.set(key, c);
    });
    const allCompras = Array.from(comprasMap.values());
    const comprasTotales = allCompras.reduce((acc, c) => acc + (Number(c.total) || 0), 0);

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

    const now = new Date();

    // 8. Generar Gráfico Semanal (últimos 7 días)
    const diasShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const chartDataSemanal: { name: string; Ventas: number; Compras: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      const targetISO = targetDate.toISOString().slice(0, 10);
      const dayLabel = `${diasShort[targetDate.getDay()]} ${targetDate.getDate()}`;

      const vSum = allVentas
        .filter(v => (v.fecha || v.created_at || '').slice(0, 10) === targetISO)
        .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
      const cSum = allCompras
        .filter(c => (c.fecha || c.created_at || '').slice(0, 10) === targetISO)
        .reduce((acc, c) => acc + (Number(c.total) || 0), 0);

      chartDataSemanal.push({
        name: dayLabel,
        Ventas: Math.round(vSum),
        Compras: Math.round(cSum)
      });
    }

    // 9. Generar Gráfico Mensual (últimos 6 meses)
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const chartDataMensual: { name: string; Ventas: number; Compras: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
      const targetYM = `${targetYear}-${targetMonth}`;
      const label = `${monthNames[targetDate.getMonth()]}`;

      const vSum = allVentas
        .filter(v => (v.fecha || v.created_at || '').slice(0, 7) === targetYM)
        .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
      const cSum = allCompras
        .filter(c => (c.fecha || c.created_at || '').slice(0, 7) === targetYM)
        .reduce((acc, c) => acc + (Number(c.total) || 0), 0);

      chartDataMensual.push({
        name: label,
        Ventas: Math.round(vSum),
        Compras: Math.round(cSum)
      });
    }

    // 10. Generar Gráfico Anual
    const chartDataAnual = [
      { name: '2024', Ventas: 0, Compras: 0 },
      { name: '2025', Ventas: 0, Compras: 0 },
      {
        name: '2026',
        Ventas: Math.round(ventasTotales),
        Compras: Math.round(comprasTotales)
      }
    ];

    return {
      ventasTotales,
      comprasTotales,
      ctasPendientes,
      stockBajo,
      margen,
      chartDataSemanal,
      chartDataMensual,
      chartDataAnual,
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
      body: data.chartDataMensual.map((d: any) => [
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

  const handleExportCSV = () => {
    if (!data) return;
    let csv = '\uFEFF';
    csv += 'REPORTE EJECUTIVO - PANEL DE CONTROL ERP\r\n\r\n';
    csv += 'MÉTRICA;VALOR\r\n';
    csv += `Ventas Totales;${data.ventasTotales.toFixed(2)}\r\n`;
    csv += `Compras Totales;${data.comprasTotales.toFixed(2)}\r\n`;
    csv += `Cuentas Pendientes;${data.ctasPendientes.toFixed(2)}\r\n`;
    csv += `Stock Crítico;${data.stockBajo} SKU\r\n`;
    csv += `Margen Bruto;${data.margen}%\r\n\r\n`;

    csv += 'HISTÓRICO MENSUAL DE VENTAS Y COMPRAS\r\n';
    csv += 'Mes;Ventas S/.;Compras S/.;Balance S/.\r\n';
    data.chartDataMensual.forEach(m => {
      csv += `${m.name};${m.Ventas.toFixed(2)};${m.Compras.toFixed(2)};${(m.Ventas - m.Compras).toFixed(2)}\r\n`;
    });

    csv += '\r\nINVENTARIO Y STOCK CRÍTICO\r\n';
    csv += 'SKU / Código;Producto;Stock Actual;Stock Mínimo;Estado\r\n';
    data.stockList.forEach(s => {
      const sanitized = s.name.replace(/"/g, '""');
      const estado = s.current <= s.min ? 'BAJO STOCK' : 'ÓPTIMO';
      csv += `"${s.sku}";"${sanitized}";${s.current};${s.min};${estado}\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Resumen_Panel_ERP_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
  const selectedChartData = chartPeriod === 'semanal'
    ? data.chartDataSemanal
    : chartPeriod === 'mensual'
      ? data.chartDataMensual
      : data.chartDataAnual;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full min-w-0 space-y-6 pb-10">
      
      {/* Botonera Superior (No incluida en el PDF) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Panel Ejecutivo de gestion
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Resumen operativo de compras, ventas, cobranzas e inventario en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={handleRefresh} className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <RefreshCw size={15} />
            Actualizar
          </button>
          <button 
            onClick={handleExportCSV} 
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode 
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <FileSpreadsheet size={15} />
            Exportar CSV
          </button>
          <button 
            onClick={handleExportPDF} 
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-bold rounded-lg text-white transition-colors shadow-sm bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
          >
            <Download size={15} />
            Reporte PDF
          </button>
        </div>
      </div>

      {/* Contenedor que será capturado por html2canvas */}
      <div ref={dashboardRef} className="w-full space-y-6">
        
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Ventas vs. Compras */}
        <motion.div variants={itemVariants} className={`w-full min-w-0 px-4 pt-5 sm:px-6 rounded-2xl border lg:col-span-2 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} h-[440px] flex flex-col`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
            <div>
              <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Ventas y compras</h3>
              <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Evolución del período seleccionado · {chartPeriod === 'semanal' ? 'Últimos 7 días' : chartPeriod === 'mensual' ? 'Últimos 6 meses' : 'Histórico anual'}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setChartPeriod('semanal')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartPeriod === 'semanal'
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semanal
                </button>
                <button
                  type="button"
                  onClick={() => setChartPeriod('mensual')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartPeriod === 'mensual'
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setChartPeriod('anual')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartPeriod === 'anual'
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Anual
                </button>
              </div>
              <div className={`flex items-center gap-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Ventas
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  Compras
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={selectedChartData}
                margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }} dy={8} />
                <YAxis width={48} axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }} tickFormatter={(val) => `S/ ${(val / 1000).toFixed(0)}k`} />
                <Tooltip 
                  cursor={{ stroke: darkMode ? '#475569' : '#cbd5e1', strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                  formatter={(value, name) => [formatCurrency(Number(value) || 0), String(name ?? '')]}
                />
                <defs>
                  <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1673f9" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#1673f9" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="Ventas"
                  stroke="#1673f9"
                  strokeWidth={3}
                  fill="url(#salesAreaGradient)"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Compras"
                  stroke="#20aa9e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t py-3 text-xs ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
            <p>
              Total ventas <span className={`ml-1 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(data.ventasTotales)}</span>
            </p>
            <p>
              Total compras <span className={`ml-1 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(data.comprasTotales)}</span>
            </p>
          </div>
        </motion.div>

        {/* Alerta Activa - Stock */}
        <motion.div variants={itemVariants} className={`min-w-0 rounded-2xl border overflow-hidden lg:h-[440px] lg:flex lg:flex-col ${darkMode ? 'bg-slate-900 border-orange-900/50' : 'bg-white border-orange-200'}`}>
          <div className={`px-5 py-3 border-b flex items-center justify-between ${darkMode ? 'bg-orange-950/30 border-orange-900/50' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 font-bold text-sm tracking-widest uppercase">
              <AlertTriangle size={16} /> ALERTA ACTIVA
            </div>
            <span className="text-xs font-mono text-orange-500 dark:text-orange-600/70">ALR-3041</span>
          </div>
          
          <div className="p-5 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
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
            
            <div className="mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto custom-scrollbar">
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

            <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:mt-auto lg:pt-4 pdf-exclude-buttons">
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
        </div>

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
