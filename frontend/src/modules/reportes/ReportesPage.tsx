import React, { useState, useMemo } from 'react';
import { 
  Search, RotateCcw, FileSpreadsheet, FileText, Printer, 
  Calendar, Eye, ChevronLeft, ChevronRight, X, TrendingUp, BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tipos de Plantillas
type TemplateCategory = 'TODOS' | 'VENTAS' | 'COMPRAS' | 'INVENTARIO' | 'CONTABLE';

interface ReportTemplate {
  id: string;
  name: string;
  count: number;
  category: 'VENTAS' | 'COMPRAS' | 'INVENTARIO' | 'CONTABLE';
  groupLabel: string;
}

const TEMPLATES: ReportTemplate[] = [
  { id: 'ventas-registro', name: 'Registro de ventas', count: 482, category: 'VENTAS', groupLabel: 'Ventas' },
  { id: 'compras-registro', name: 'Registro de compras', count: 214, category: 'COMPRAS', groupLabel: 'Compras' },
  { id: 'ventas-doc', name: 'Ventas por documento', count: 482, category: 'VENTAS', groupLabel: 'Ventas' },
  { id: 'ventas-fecha', name: 'Ventas por fecha', count: 180, category: 'VENTAS', groupLabel: 'Ventas' },
  { id: 'ventas-cliente', name: 'Ventas por cliente', count: 96, category: 'VENTAS', groupLabel: 'Ventas' },
  { id: 'ventas-producto', name: 'Ventas por producto', count: 148, category: 'VENTAS', groupLabel: 'Ventas' },
  { id: 'ventas-marca', name: 'Ventas por marca', count: 12, category: 'VENTAS', groupLabel: 'Ventas' },
  { id: 'ventas-vendedor', name: 'Ventas por vendedor', count: 8, category: 'VENTAS', groupLabel: 'Ventas' },
  { id: 'unidades-tipo-doc', name: 'Unidades vs tipo de documen...', count: 24, category: 'CONTABLE', groupLabel: 'Contable' },
  { id: 'ventas-concepto', name: 'Ventas por concepto', count: 18, category: 'VENTAS', groupLabel: 'Ventas' },
  { id: 'kardex-movimiento', name: 'Movimiento de Kardex', count: 1240, category: 'INVENTARIO', groupLabel: 'Inventario' },
  { id: 'productos-stock', name: 'Stock de productos', count: 320, category: 'INVENTARIO', groupLabel: 'Inventario' },
  { id: 'tipo-cambio-hist', name: 'Histórico de tipo de cambio', count: 365, category: 'CONTABLE', groupLabel: 'Contable' },
];

interface ReportRecord {
  id: string;
  documento: string;
  entidad: string;
  fecha: string;
  importe: number;
  estado: 'PAGADO' | 'PENDIENTE' | 'ANULADO';
  categoria: 'VENTAS' | 'COMPRAS' | 'INVENTARIO';
}

const INITIAL_RECORDS: ReportRecord[] = [
  {
    id: '1',
    documento: 'FC-0001-004521',
    entidad: 'Inversiones Kuna S.A.C.',
    fecha: '08/06/2026',
    importe: 12480.40,
    estado: 'PAGADO',
    categoria: 'VENTAS'
  },
  {
    id: '2',
    documento: 'FC-0001-004520',
    entidad: 'Constructora Milpa E.I.R.L.',
    fecha: '07/06/2026',
    importe: 31200.00,
    estado: 'PENDIENTE',
    categoria: 'VENTAS'
  },
  {
    id: '3',
    documento: 'BV-0003-002210',
    entidad: 'Ferretería El Roble',
    fecha: '06/06/2026',
    importe: 1760.50,
    estado: 'ANULADO',
    categoria: 'VENTAS'
  },
  {
    id: '4',
    documento: 'FC-0001-004519',
    entidad: 'Agroindustrias Vega S.A.',
    fecha: '05/06/2026',
    importe: 22840.90,
    estado: 'PAGADO',
    categoria: 'VENTAS'
  }
];

export const ReportesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('TODOS');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>(TEMPLATES[0]);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('2026-06-01');
  const [fechaHasta, setFechaHasta] = useState('2026-06-30');
  const [clienteFilter, setClienteFilter] = useState('Todos');
  const [tipoDocFilter, setTipoDocFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('Todos');

  // Modal de visualización
  const [viewRecord, setViewRecord] = useState<ReportRecord | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filtrado de plantillas del panel izquierdo
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'TODOS') return TEMPLATES;
    return TEMPLATES.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  // Filtrado de registros en la tabla
  const filteredRecords = useMemo(() => {
    return INITIAL_RECORDS.filter(rec => {
      if (clienteFilter !== 'Todos' && !rec.entidad.toLowerCase().includes(clienteFilter.toLowerCase())) {
        return false;
      }
      if (tipoDocFilter !== 'Todos') {
        if (tipoDocFilter === 'Factura' && !rec.documento.startsWith('FC')) return false;
        if (tipoDocFilter === 'Boleta' && !rec.documento.startsWith('BV')) return false;
      }
      if (estadoFilter !== 'Todos' && rec.estado !== estadoFilter) {
        return false;
      }
      return true;
    });
  }, [clienteFilter, tipoDocFilter, estadoFilter]);

  // Limpiar filtros
  const handleResetFilters = () => {
    setFechaDesde('2026-06-01');
    setFechaHasta('2026-06-30');
    setClienteFilter('Todos');
    setTipoDocFilter('Todos');
    setEstadoFilter('Todos');
  };

  // Exportar Excel (CSV)
  const handleExportExcel = () => {
    const headers = ['Documento', 'Entidad', 'Fecha', 'Importe', 'Estado'];
    const rows = filteredRecords.map(r => [
      r.documento,
      `"${r.entidad}"`,
      r.fecha,
      r.importe.toFixed(2),
      r.estado
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_${selectedTemplate.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar PDF con jsPDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`ERP Senatinos - ${selectedTemplate.name}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${fechaDesde} al ${fechaHasta} | RUC: 20601123456`, 14, 28);

    const tableRows = filteredRecords.map(r => [
      r.documento,
      r.entidad,
      r.fecha,
      `S/ ${r.importe.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
      r.estado
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Documento', 'Entidad', 'Fecha', 'Importe', 'Estado']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [2, 132, 199] }
    });

    doc.save(`Reporte_${selectedTemplate.name.replace(/\s+/g, '_')}.pdf`);
  };

  // Datos para el gráfico en vista previa de impresión
  const chartData = [
    { fecha: '05/06', total: 22840.90 },
    { fecha: '06/06', total: 1760.50 },
    { fecha: '07/06', total: 31200.00 },
    { fecha: '08/06', total: 12480.40 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Encabezado y Acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            ERP &nbsp;/&nbsp; RUC 20601123456 · Planta Lima
          </p>
          <span className="text-[11px] font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase">
            REPORTES
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Centro de reportes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Elige una plantilla, aplica filtros y consulta. Los gráficos estadísticos aparecen en la vista previa de impresión.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-xl shadow-sm transition-colors"
          >
            <Search size={16} />
            Consultar
          </button>
          <button 
            onClick={handleResetFilters}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <RotateCcw size={15} />
            Limpiar filtros
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Excel
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <FileText size={15} className="text-rose-600" />
            PDF
          </button>
          <button 
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Printer size={15} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Contenedor Principal: 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel Izquierdo: Plantillas */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                Plantillas
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                13 DISPONIBLES
              </p>
            </div>

            {/* Pestañas de categorías */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              {(['TODOS', 'VENTAS', 'COMPRAS', 'INVENTARIO', 'CONTABLE'] as TemplateCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    selectedCategory === cat
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Lista de plantillas */}
            <div className="space-y-1 max-h-[580px] overflow-y-auto pr-1">
              {filteredTemplates.map(tpl => {
                const isActive = selectedTemplate.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all ${
                      isActive
                        ? 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold border border-sky-100 dark:border-sky-900/50'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span className="truncate pr-2">{tpl.name}</span>
                    <span className={`text-[11px] font-medium shrink-0 ${
                      isActive ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-400'
                    }`}>
                      {tpl.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel Derecho: Filtros, Métricas y Tabla de Detalle */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Card: Filtros del Reporte */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                Filtros del reporte
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                5 CRITERIOS · {selectedTemplate.name.toUpperCase()}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  DESDE
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={e => setFechaDesde(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  HASTA
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={e => setFechaHasta(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  CLIENTE
                </label>
                <select
                  value={clienteFilter}
                  onChange={e => setClienteFilter(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="Inversiones Kuna">Inversiones Kuna S.A.C.</option>
                  <option value="Constructora Milpa">Constructora Milpa E.I.R.L.</option>
                  <option value="Ferretería El Roble">Ferretería El Roble</option>
                  <option value="Agroindustrias Vega">Agroindustrias Vega S.A.</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  TIPO DOCUMENTO
                </label>
                <select
                  value={tipoDocFilter}
                  onChange={e => setTipoDocFilter(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="Factura">Factura</option>
                  <option value="Boleta">Boleta</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  ESTADO
                </label>
                <select
                  value={estadoFilter}
                  onChange={e => setEstadoFilter(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                >
                  <option value="Todos">Todos</option>
                  <option value="PAGADO">PAGADO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="ANULADO">ANULADO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Card 1: Registros Filtrados */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <span>REGISTROS FILTRADOS</span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {filteredRecords.length}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                de {INITIAL_RECORDS.length} en la plantilla
              </p>
            </div>

            {/* Card 2: Total Periodo */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <span>TOTAL PERIODO</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                S/ 2,321,691.00
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedTemplate.groupLabel}
              </p>
            </div>

            {/* Card 3: Grupo */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <span>GRUPO</span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {selectedTemplate.groupLabel}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedTemplate.name}
              </p>
            </div>

            {/* Card 4: Rango */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <span>RANGO</span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                06-01
              </div>
              <p className="text-xs text-slate-400 mt-1">
                hasta {fechaHasta}
              </p>
            </div>

          </div>

          {/* Card: Detalle del Reporte */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                Detalle
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                DESDE: {fechaDesde} · HASTA: {fechaHasta} · CLIENTE: {clienteFilter.toUpperCase()} · TIPO DOCUMENTO: {tipoDocFilter.toUpperCase()} · ESTADO: {estadoFilter.toUpperCase()}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">DOCUMENTO</th>
                    <th className="py-3 px-3">ENTIDAD</th>
                    <th className="py-3 px-3">FECHA</th>
                    <th className="py-3 px-3">IMPORTE</th>
                    <th className="py-3 px-3">ESTADO</th>
                    <th className="py-3 px-3 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-sky-600 dark:text-sky-400">
                        {rec.documento}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-200 font-medium">
                        {rec.entidad}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {rec.fecha}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                        S/ {rec.importe.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          rec.estado === 'PAGADO' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : rec.estado === 'PENDIENTE'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {rec.estado}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setViewRecord(rec)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye size={13} />
                            Ver
                          </button>
                          <button
                            onClick={() => {
                              setViewRecord(rec);
                              setShowPrintModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Printer size={13} />
                            Imprimir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No se encontraron registros con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <span className="font-medium text-[11px] tracking-wider uppercase text-slate-400">
                PÁGINA 1 DE 1 · {filteredRecords.length} REGISTROS
              </span>
              <div className="flex items-center gap-2">
                <button 
                  disabled
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed text-xs"
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
                <button 
                  disabled
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed text-xs"
                >
                  Siguiente
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modal: Ver Detalle del Documento */}
      {viewRecord && !showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  CONSULTA DE COMPROBANTE
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {viewRecord.documento}
                </h3>
              </div>
              <button
                onClick={() => setViewRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-400">Entidad / Cliente:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewRecord.entidad}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-400">Fecha de Emisión:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewRecord.fecha}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-400">Monto Total:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400 text-sm">
                  S/ {viewRecord.importe.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800">
                <span className="text-slate-400">Estado de Pago:</span>
                <span className="font-semibold">{viewRecord.estado}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-200"
              >
                Cerrar
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl font-medium text-xs hover:bg-sky-700 flex items-center gap-1.5"
              >
                <Printer size={14} />
                Imprimir comprobante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vista Previa de Impresión y Gráficos Estadísticos */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Vista previa de impresión y estadísticas
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedTemplate.name} · ERP Senatinos
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setViewRecord(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Gráfico Estadístico como indica la descripción */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Distribución por Fecha de Operación (S/)
              </h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      formatter={(val: any) => [`S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 'Importe']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="total" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resumen de impresión */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-500">
                  <tr>
                    <th className="p-2.5">Documento</th>
                    <th className="p-2.5">Entidad</th>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.map(r => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-semibold text-sky-600">{r.documento}</td>
                      <td className="p-2.5">{r.entidad}</td>
                      <td className="p-2.5 text-slate-500">{r.fecha}</td>
                      <td className="p-2.5 text-right font-semibold">S/ {r.importe.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setViewRecord(null);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-medium hover:bg-sky-700 flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                Lanzar Impresión
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default ReportesPage;
