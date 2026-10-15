import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, Plus, Download, Printer, Search, 
  ArrowUpRight, ArrowDownLeft, Package, X, CheckCircle, Minus
} from 'lucide-react';
import { inventarioService, type MovimientoKardex, type Producto } from '../../services/inventarioService';

export const MovimientoKardexPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const navigate = useNavigate();

  const [movimientos, setMovimientos] = useState<MovimientoKardex[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Filtros
  const [filterProductoId, setFilterProductoId] = useState('TODOS');
  const [filterTipo, setFilterTipo] = useState<'TODOS' | 'ENTRADA' | 'SALIDA'>('TODOS');
  const [filterTexto, setFilterTexto] = useState('');

  // Modal Salida Manual (Ajuste o Merma)
  const [isModalSalidaOpen, setIsModalSalidaOpen] = useState(false);
  const [salidaProdId, setSalidaProdId] = useState('');
  const [salidaCant, setSalidaCant] = useState('');
  const [salidaMotivo, setSalidaMotivo] = useState<'SALIDA_AJUSTE' | 'DEVOLUCION'>('SALIDA_AJUSTE');
  const [salidaDocNumero, setSalidaDocNumero] = useState('');
  const [salidaDetalle, setSalidaDetalle] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    const movs = await inventarioService.getMovimientos();
    const prods = await inventarioService.getProductos();
    setMovimientos(movs);
    setProductos(prods);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtrado
  const filteredMovs = useMemo(() => {
    return movimientos.filter(m => {
      const matchProd = filterProductoId === 'TODOS' || m.productoId === filterProductoId || m.productoCodigo === filterProductoId;
      const matchTipo = filterTipo === 'TODOS' || m.tipoMovimiento === filterTipo;
      const matchTxt = 
        m.productoCodigo.toLowerCase().includes(filterTexto.toLowerCase()) ||
        m.productoDescripcion.toLowerCase().includes(filterTexto.toLowerCase()) ||
        m.documentoNumero.toLowerCase().includes(filterTexto.toLowerCase()) ||
        m.detalle.toLowerCase().includes(filterTexto.toLowerCase());

      return matchProd && matchTipo && matchTxt;
    });
  }, [movimientos, filterProductoId, filterTipo, filterTexto]);

  // Totales de entradas y salidas filtradas
  const totalEntradaCant = filteredMovs.reduce((acc, m) => acc + (m.cantEntrada || 0), 0);
  const totalEntradaValor = filteredMovs.reduce((acc, m) => acc + (m.totalEntrada || 0), 0);
  const totalSalidaCant = filteredMovs.reduce((acc, m) => acc + (m.cantSalida || 0), 0);
  const totalSalidaValor = filteredMovs.reduce((acc, m) => acc + (m.totalSalida || 0), 0);

  const formatCurrency = (val: number | undefined | null) => {
    const num = typeof val === 'number' && !isNaN(val) ? val : 0;
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleRegistrarSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salidaProdId || !salidaCant) {
      alert('Selecciona un producto e indica la cantidad.');
      return;
    }

    const prod = productos.find(p => p.id === salidaProdId);
    if (!prod) return;

    const cant = parseFloat(salidaCant);
    if (isNaN(cant) || cant <= 0) {
      alert('Cantidad inválida.');
      return;
    }

    if (cant > prod.stock) {
      alert(`Stock insuficiente. Stock actual: ${prod.stock}`);
      return;
    }

    try {
      await inventarioService.registrarMovimiento({
        productoId: prod.id,
        productoCodigo: prod.codigo,
        productoDescripcion: prod.descripcion,
        tipoMovimiento: 'SALIDA',
        tipoOperacion: salidaMotivo,
        documentoTipo: salidaMotivo === 'DEVOLUCION' ? 'GUÍA REMISIÓN DEVOLUCIÓN' : 'NOTA DE SALIDA AJUSTE',
        documentoNumero: salidaDocNumero.trim().toUpperCase() || 'AJUSTE-MANUAL',
        detalle: salidaDetalle.trim() || 'Salida manual por ajuste de inventario / merma',
        almacen: prod.almacen,
        cantidad: cant,
        costoUnitario: prod.costoUnitario
      });

      showToast(`Salida de ${cant} UND registrada en Kardex.`);
      setIsModalSalidaOpen(false);
      setSalidaProdId('');
      setSalidaCant('');
      setSalidaDocNumero('');
      setSalidaDetalle('');
      await loadData();
    } catch (err: any) {
      alert(`Error al registrar salida: ${err.message}`);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Fecha', 'Código', 'Producto', 'Operación', 'Doc. Tipo', 'Doc. Número', 'Detalle', 'Almacén',
      'Entrada Cant', 'Entrada Costo', 'Entrada Total',
      'Salida Cant', 'Salida Costo', 'Salida Total',
      'Saldo Cant', 'Saldo Costo Promedio', 'Saldo Total'
    ];
    let csv = headers.join(';') + '\n';

    filteredMovs.forEach(m => {
      const row = [
        new Date(m.fecha).toLocaleDateString('es-PE'),
        m.productoCodigo,
        `"${m.productoDescripcion}"`,
        m.tipoOperacion,
        m.documentoTipo,
        m.documentoNumero,
        `"${m.detalle}"`,
        m.almacen,
        m.cantEntrada || '',
        m.costoEntrada ? m.costoEntrada.toFixed(2) : '',
        m.totalEntrada ? m.totalEntrada.toFixed(2) : '',
        m.cantSalida || '',
        m.costoSalida ? m.costoSalida.toFixed(2) : '',
        m.totalSalida ? m.totalSalida.toFixed(2) : '',
        m.saldoCantidad,
        m.saldoCostoUnitario.toFixed(2),
        m.saldoTotal.toFixed(2)
      ];
      csv += row.join(';') + '\n';
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kardex_movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto pb-10 font-sans print:p-0 print:m-0 print:w-full">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 mt-2 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 text-blue-500">
            <span>ERP</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span>INVENTARIOS</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span className="text-gray-400 dark:text-slate-500">KARDEX VALORIZADO</span>
          </div>
          <h1 className={`text-[26px] font-bold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>
            Movimiento de Kardex
          </h1>
          <p className={`mt-2 text-[13px] ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Registro formal valorizado de entradas, salidas y saldos bajo el método de Promedio Ponderado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalSalidaOpen(true)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-slate-700' : 'bg-white border-gray-200 text-rose-600 hover:bg-gray-50'
            }`}
          >
            <Minus size={16} />
            Salida / Ajuste
          </button>
          <button 
            onClick={() => navigate('/ingreso-kardex')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nuevo Ingreso
          </button>
          <button 
            onClick={exportCSV}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-slate-700'
            }`}
          >
            <Download size={16} />
            CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:hidden">
        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Movimientos</span>
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}><ArrowRightLeft size={18} /></div>
          </div>
          <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{filteredMovs.length}</h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Transacciones registradas</p>
        </div>

        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Entradas</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><ArrowDownLeft size={18} /></div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600">+{totalEntradaCant} UND</h3>
          <p className="text-xs mt-1 font-semibold text-emerald-700/80">{formatCurrency(totalEntradaValor)}</p>
        </div>

        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Total Salidas</span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600"><ArrowUpRight size={18} /></div>
          </div>
          <h3 className="text-2xl font-black text-rose-600">-{totalSalidaCant} UND</h3>
          <p className="text-xs mt-1 font-semibold text-rose-700/80">{formatCurrency(totalSalidaValor)}</p>
        </div>

        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Saldo Neto</span>
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>S/</div>
          </div>
          <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalEntradaCant - totalSalidaCant} UND</h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Balance físico neto</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className={`p-4 rounded-2xl border mb-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative flex-1 w-full">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
          <input 
            type="text" 
            placeholder="Buscar por código, descripción, documento..." 
            value={filterTexto}
            onChange={(e) => setFilterTexto(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
              darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={filterProductoId}
            onChange={(e) => setFilterProductoId(e.target.value)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
              darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="TODOS">Todos los Productos</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.codigo} - {p.descripcion}</option>
            ))}
          </select>

          <select 
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as any)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
              darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="TODOS">Todos los Movimientos</option>
            <option value="ENTRADA">Solo Entradas</option>
            <option value="SALIDA">Solo Salidas</option>
          </select>
        </div>
      </div>

      {/* Tabla Kardex Valorizado (SUNAT Standard) */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              {/* Nivel Superior de Cabecera */}
              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <th colSpan={5} className="px-4 py-2 border-r border-inherit">Documento y Detalle de Operación</th>
                <th colSpan={3} className="px-4 py-2 text-center border-r border-inherit bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">ENTRADAS</th>
                <th colSpan={3} className="px-4 py-2 text-center border-r border-inherit bg-rose-500/10 text-rose-600 dark:text-rose-400">SALIDAS</th>
                <th colSpan={3} className="px-4 py-2 text-center bg-blue-500/10 text-blue-600 dark:text-blue-400">SALDO FINAL</th>
              </tr>
              {/* Columnas Detalladas */}
              <tr className={`border-b text-[10px] font-bold uppercase ${
                darkMode ? 'bg-slate-800/40 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Producto</th>
                <th className="px-3 py-2.5">Tipo Operación</th>
                <th className="px-3 py-2.5">Documento</th>
                <th className="px-3 py-2.5 border-r border-inherit">Detalle</th>

                {/* Entradas */}
                <th className="px-2 py-2.5 text-right">Cant.</th>
                <th className="px-2 py-2.5 text-right">Costo</th>
                <th className="px-2 py-2.5 text-right border-r border-inherit">Total</th>

                {/* Salidas */}
                <th className="px-2 py-2.5 text-right">Cant.</th>
                <th className="px-2 py-2.5 text-right">Costo</th>
                <th className="px-2 py-2.5 text-right border-r border-inherit">Total</th>

                {/* Saldo */}
                <th className="px-2 py-2.5 text-right font-bold">Cant.</th>
                <th className="px-2 py-2.5 text-right">Costo Prom.</th>
                <th className="px-3 py-2.5 text-right font-bold">Saldo Total</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredMovs.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center font-sans">
                    <Package size={28} className="mx-auto mb-2 text-slate-400" />
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No se encontraron movimientos registrados en Kardex.</p>
                  </td>
                </tr>
              ) : (
                filteredMovs.map(m => (
                  <tr key={m.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-sans">
                      {new Date(m.fecha).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-3 py-2.5 font-sans whitespace-nowrap">
                      <span className="font-bold text-blue-500">{m.productoCodigo}</span>
                      <div className={`text-[10px] truncate max-w-[150px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{m.productoDescripcion}</div>
                    </td>
                    <td className="px-3 py-2.5 font-sans">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        m.tipoMovimiento === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                      }`}>
                        {m.tipoOperacion}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-sans">
                      <div className="font-bold">{m.documentoNumero}</div>
                      <span className={`text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{m.documentoTipo}</span>
                    </td>
                    <td className={`px-3 py-2.5 max-w-[140px] truncate font-sans text-[10px] border-r ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      {m.detalle}
                    </td>

                    {/* Entradas */}
                    <td className="px-2 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {m.cantEntrada ? `+${m.cantEntrada}` : '-'}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-600 dark:text-slate-400">
                      {m.costoEntrada ? m.costoEntrada.toFixed(2) : '-'}
                    </td>
                    <td className={`px-2 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      {m.totalEntrada ? m.totalEntrada.toFixed(2) : '-'}
                    </td>

                    {/* Salidas */}
                    <td className="px-2 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                      {m.cantSalida ? `-${m.cantSalida}` : '-'}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-600 dark:text-slate-400">
                      {m.costoSalida ? m.costoSalida.toFixed(2) : '-'}
                    </td>
                    <td className={`px-2 py-2.5 text-right font-semibold text-rose-600 dark:text-rose-400 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      {m.totalSalida ? m.totalSalida.toFixed(2) : '-'}
                    </td>

                    {/* Saldo Final */}
                    <td className={`px-2 py-2.5 text-right font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {m.saldoCantidad}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-600 dark:text-slate-400">
                      {m.saldoCostoUnitario.toFixed(2)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {m.saldoTotal.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Salida Manual */}
      <AnimatePresence>
        {isModalSalidaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalSalidaOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
            >
              <div className={`px-6 py-4 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Registrar Salida / Ajuste de Kardex</h3>
                <button onClick={() => setIsModalSalidaOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              <form onSubmit={handleRegistrarSalida} className="p-6 space-y-4">
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Producto *</label>
                  <select 
                    required
                    value={salidaProdId}
                    onChange={(e) => setSalidaProdId(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.codigo} - {p.descripcion} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Cantidad a Retirar *</label>
                    <input 
                      required
                      type="number"
                      step="1"
                      placeholder="0"
                      value={salidaCant}
                      onChange={(e) => setSalidaCant(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Motivo</label>
                    <select 
                      value={salidaMotivo}
                      onChange={(e) => setSalidaMotivo(e.target.value as any)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                    >
                      <option value="SALIDA_AJUSTE">Ajuste por Merma / Inventario</option>
                      <option value="DEVOLUCION">Devolución a Proveedor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>N° Referencia Documental</label>
                  <input 
                    type="text"
                    placeholder="Ej: AJU-001, GR-DEV-004"
                    value={salidaDocNumero}
                    onChange={(e) => setSalidaDocNumero(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm uppercase ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Detalle / Causa</label>
                  <textarea 
                    rows={2}
                    placeholder="Explicación del ajuste o merma..."
                    value={salidaDetalle}
                    onChange={(e) => setSalidaDetalle(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>

                <div className={`pt-4 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                  <button 
                    type="button" 
                    onClick={() => setIsModalSalidaOpen(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-lg text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                  >
                    Grabar Salida
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
