import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, CheckCircle, ShoppingBag, ArrowRight
} from 'lucide-react';
import type { Producto } from '../../services/inventarioService';
import { proveedoresService, type Proveedor } from '../../services/proveedoresService';
import { orderReceiptItems, pendingPurchaseOrders, persistReception, readReceptionData, receiptSupplier } from '../../services/receptionService';
import type { ReceiptItem } from '../../services/receptionService';
import { recoverInventoryTransaction, withInventoryLock } from '../../services/inventoryTransaction';

export const IngresoKardexPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [source, setSource] = useState<ReturnType<typeof readReceptionData> | null>(null);
  const [tipoOperacion, setTipoOperacion] = useState<'COMPRA' | 'INGRESO_AJUSTE' | 'DEVOLUCION'>('COMPRA');
  const [documentoTipo, setDocumentoTipo] = useState('GUÍA DE REMISIÓN');
  const [documentoNumero, setDocumentoNumero] = useState('');
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [almacenDestino, setAlmacenDestino] = useState('Almacén Central');
  const [observaciones, setObservaciones] = useState('');
  const [selectedOCId, setSelectedOCId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [inputCantidad, setInputCantidad] = useState('');
  const [inputCosto, setInputCosto] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptId, setReceiptId] = useState(() => `REC-${crypto.randomUUID()}`);
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await withInventoryLock(() => { recoverInventoryTransaction(localStorage); return readReceptionData(localStorage); });
        const providers = await proveedoresService.getProveedores({ initializeIfEmpty: false });
        if (!Array.isArray(providers)) throw new Error('Proveedores inválidos');
        if (active) { setSource(data); setProductos(data.products); setProveedores(providers); setError(null); }
      } catch { if (active) setError('No se pudo cargar o recuperar el inventario. Revisa los datos y reintenta; no se reemplazaron por ejemplos.'); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [reload]);
  const ordenesCompra = source ? pendingPurchaseOrders(source.orders, source.movements) : [];
  const selectedOrder = source?.orders.find(o => o.id === selectedOCId);
  const supplier = selectedOrder ? receiptSupplier(selectedOrder, proveedores) : proveedores.find(p => p.id === selectedProveedorId);
  const showToast = (message: string) => setToastMessage(message);
  const handleSelectOC = (id: string) => {
    if (saving.current) return;
    if (items.length && !window.confirm('Se reemplazará el detalle sin guardar. ¿Continuar?')) return;
    try {
      const latest = readReceptionData(localStorage);
      const order = latest.orders.find(o => o.id === id);
      const lines = id ? orderReceiptItems(order!, latest.products, latest.movements, almacenDestino) : [];
      if (id && !lines.length) throw new Error('La orden no tiene cantidades pendientes.');
      setSource(latest); setProductos(latest.products); setSelectedOCId(id); setItems(lines);
      setSelectedProveedorId(order ? receiptSupplier(order, proveedores).id ?? '' : '');
      setReceiptId(`REC-${crypto.randomUUID()}`); setError(null);
      if (id) { setTipoOperacion('COMPRA'); showToast('Se cargaron todas las cantidades pendientes. Completa el documento real de recepción.'); }
      setSelectedProdId(''); setInputCantidad(''); setInputCosto('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo cargar la orden.'); }
  };
  const handleAddItem = () => {
    if (selectedOCId || saving.current) return;
    const product = productos.find(p => p.id === selectedProdId);
    const qty = Number(inputCantidad), cost = Number(inputCosto);
    if (!product || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost <= 0) { setError('Selecciona un producto y cantidades/costos positivos y finitos.'); return; }
    setItems(previous => [...previous, { id: crypto.randomUUID(), productoId: product.id, codigo: product.codigo, descripcion: product.descripcion, almacen: almacenDestino, cantidad: qty, costoUnitario: cost, total: qty * cost }]);
    setSelectedProdId(''); setInputCantidad(''); setInputCosto(''); setError(null);
  };
  const handleRemoveItem = (id: string) => { if (!selectedOCId && !saving.current) setItems(previous => previous.filter(item => item.id !== id)); };
  const totalGeneral = items.reduce((sum, item) => sum + item.cantidad * item.costoUnitario, 0);
  const totalCantidad = items.reduce((sum, item) => sum + item.cantidad, 0);
  const handleSubmitIngreso = async () => {
    if (saving.current || loading || !source) return;
    saving.current = true; setIsSubmitting(true); setError(null);
    try {
      if (!selectedOCId && (selectedProdId || inputCantidad || inputCosto)) throw new Error('Hay un producto sin agregar. Agrégalo o limpia sus campos antes de confirmar.');
      const result = await withInventoryLock(() => {
        if (!mounted.current) throw new Error('La pantalla se cerró antes de confirmar.');
        return persistReception(localStorage, { id: receiptId, ordenId: selectedOCId, tipoOperacion, documentoTipo, documentoNumero, almacen: almacenDestino, observaciones, proveedorId: selectedProveedorId, items });
      });
      if (mounted.current) navigate(`/movimiento-kardex?recepcion=${encodeURIComponent(result.id)}`);
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'No se pudo registrar la recepción.'); }
    finally { saving.current = false; if (mounted.current) setIsSubmitting(false); }
  };
  const formatCurrency = (val: number | undefined | null) => {
    const num = typeof val === 'number' && !isNaN(val) ? val : 0;
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto pb-10 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 mt-2">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 text-blue-500">
            <span>ERP</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span>INVENTARIOS</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span className="text-gray-400 dark:text-slate-500">INGRESO AL KARDEX</span>
          </div>
          <h1 className={`text-[26px] font-bold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>
            Ingreso al Kardex
          </h1>
          <p className={`mt-2 text-[13px] ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Registra entradas de mercadería al almacén físico calculando el costo promedio ponderado SUNAT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/movimiento-kardex')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-slate-700' : 'bg-white border-gray-200 text-sky-600 hover:bg-gray-50'
            }`}
          >
            <ArrowRight size={16} />
            Consultar Kardex
          </button>
          <button 
            onClick={handleSubmitIngreso}
            disabled={isSubmitting || loading || !source || items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <CheckCircle size={16} strokeWidth={2.5} />
            {isSubmitting ? 'Procesando...' : 'Grabar Ingreso'}
          </button>
        </div>
      </div>

      {loading && <p role="status" className="mb-4 text-sm text-slate-500">Cargando inventario y órdenes pendientes…</p>}
      {error && <div role="alert" className="mb-4 p-4 border border-red-300 rounded-xl text-red-600">{error} <button type="button" onClick={() => { setLoading(true); setReload(value => value + 1); }} className="underline">Reintentar carga / recuperación</button></div>}
      <fieldset disabled={isSubmitting || loading || !source} className="min-w-0 border-0 p-0 m-0">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Detalle de Items */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Card 01: Datos de Recepción */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm bg-emerald-500">
                01
              </div>
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Datos del comprobante / origen</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Define el documento sustentatorio de la entrada</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Tipo de Operación</label>
                <select 
                  value={tipoOperacion}
                  disabled={Boolean(selectedOCId)}
                  onChange={(e) => setTipoOperacion(e.target.value as any)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                >
                  <option value="COMPRA">Compra Nacional</option>
                  <option value="INGRESO_AJUSTE">Ajuste / Inventario Inicial</option>
                  <option value="DEVOLUCION">Devolución de Cliente</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Tipo Documento</label>
                <select 
                  value={documentoTipo}
                  onChange={(e) => setDocumentoTipo(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                >
                  <option value="GUÍA DE REMISIÓN">Guía de Remisión</option>
                  <option value="FACTURA DE COMPRA">Factura de Compra</option>
                  <option value="ORDEN DE COMPRA">Orden de Compra</option>
                  <option value="NOTA DE ENTRADA">Nota de Entrada</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>N° Documento *</label>
                <input 
                  type="text" 
                  placeholder="Ej: GR-001-2026 / F001-992" 
                  value={documentoNumero}
                  onChange={(e) => setDocumentoNumero(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm uppercase font-mono ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>
            </div>

            {/* Opción rápida: Jalar desde Orden de Compra */}
            {(
              <div className={`mt-4 p-4 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-blue-50/50 border-blue-100'} flex flex-col md:flex-row items-start md:items-center justify-between gap-3`}>
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-blue-500" />
                  <span className={`text-xs font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    <label htmlFor="orden-compra-pendiente">Orden de compra pendiente</label>
                  </span>
                </div>
                <select 
                  id="orden-compra-pendiente"
                  value={selectedOCId}
                  onChange={(e) => handleSelectOC(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-blue-200 text-blue-900'}`}
                >
                  <option value="">Ingreso manual (sin orden de compra)</option>
                  {ordenesCompra.map(oc => (
                    <option key={oc.id} value={oc.id}>
                      {oc.id} - {oc.proveedor} ({oc.estado})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!loading && source && ordenesCompra.length === 0 && <div className="mt-3 text-sm text-slate-500"><p>No hay órdenes de compra pendientes. Puedes registrar un ingreso manual.</p><button type="button" onClick={() => navigate('/orden-compra')} className="mt-2 text-blue-500 underline">Crear una compra</button></div>}
            {selectedOCId && <p className="mt-3 text-xs text-blue-500 break-all">Referencia de orden: {selectedOCId}. El documento de recepción se ingresa por separado.</p>}
          </div>

          {/* Card 02: Detalle de Productos a Ingresar */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm bg-emerald-500">
                02
              </div>
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Productos a ingresar</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Agrega los items y sus costos de adquisición</p>
              </div>
            </div>

            {/* Agregar item */}
            <fieldset disabled={Boolean(selectedOCId)} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 items-end min-w-0">
              <div className="md:col-span-5">
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Producto</label>
                <select 
                  value={selectedProdId}
                  onChange={(e) => {
                    setSelectedProdId(e.target.value);
                    const prod = productos.find(p => p.id === e.target.value);
                    setInputCosto(prod && prod.costoUnitario !== null && prod.costoUnitario !== undefined && Number.isFinite(Number(prod.costoUnitario)) ? String(prod.costoUnitario) : '');
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                >
                  <option value="">Seleccionar del catálogo...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} - {p.descripcion} (Stock actual: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Cantidad</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={inputCantidad}
                  onChange={(e) => setInputCantidad(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>

              <div className="md:col-span-3">
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Costo Unit. (S/)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={inputCosto}
                  onChange={(e) => setInputCosto(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>

              <div className="md:col-span-2">
                <button 
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Agregar
                </button>
              </div>
            </fieldset>
            {selectedOCId && <p className="mb-3 text-xs text-slate-500">Se recibirán todas las cantidades pendientes de la orden. No se permite quitar líneas ni agregar productos ajenos.</p>}

            {/* Tabla de Items */}
            <div className={`border rounded-xl overflow-hidden ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
              <table className="w-full text-left text-sm">
                <thead className={`${darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'} text-xs uppercase font-bold`}>
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3 text-right">Cant.</th>
                    <th className="px-4 py-3 text-right">Costo Unit.</th>
                    <th className="px-4 py-3 text-right">Importe</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No hay productos agregados en este ingreso.
                      </td>
                    </tr>
                  ) : (
                    items.map(it => (
                      <tr key={it.id} className={`${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-500">{it.codigo}</td>
                        <td className={`px-4 py-3 font-medium text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>{it.descripcion}</td>
                        <td className="px-4 py-3 text-right font-bold text-xs">{it.cantidad}</td>
                        <td className="px-4 py-3 text-right text-xs">{formatCurrency(it.costoUnitario)}</td>
                        <td className="px-4 py-3 text-right font-bold text-xs">{formatCurrency(it.total)}</td>
                        <td className="px-3 py-3 text-center">
                          <button disabled={Boolean(selectedOCId)} onClick={() => handleRemoveItem(it.id)} className="text-rose-500 hover:text-rose-700 disabled:opacity-30">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Right Column: Resumen y Almacén */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-6">
          
          {/* Destino y Proveedor */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
            <h3 className={`text-base font-bold mb-4 ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Destino & Proveedor</h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Almacén Destino</label>
                <input 
                  type="text" 
                  value={almacenDestino}
                  onChange={(e) => setAlmacenDestino(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Proveedor (Opcional)</label>
                <select 
                  value={selectedProveedorId}
                  disabled={Boolean(selectedOCId)}
                  onChange={(e) => setSelectedProveedorId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.documento})</option>
                  ))}
                </select>
                {supplier && <div className="mt-2 text-xs text-slate-500 space-y-1"><p>{supplier.nombre || 'Nombre no registrado'}</p><p>Documento: {supplier.documento || 'No registrado'}</p><p>Dirección: {supplier.direccion || 'No registrada'}</p><p>Correo: {supplier.email || 'No registrado'}</p><p>Teléfono: {supplier.telefono || 'No registrado'}</p>{selectedOCId && <p>Datos históricos de la orden cuando están disponibles.</p>}</div>}
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Observaciones</label>
                <textarea 
                  rows={2}
                  placeholder="Detalle adicional de la recepción..." 
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
            </div>
          </div>

          {/* Resumen Valorizado */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
            <h3 className={`text-base font-bold mb-1 ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Resumen del Ingreso</h3>
            <p className={`text-xs mb-6 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Totalización física y monetaria</p>

            <div className={`space-y-3 pb-5 border-b text-sm ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Items a ingresar</span>
                <span className="font-bold">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Total Unidades</span>
                <span className="font-bold">{totalCantidad} UND</span>
              </div>
            </div>

            <div className="pt-4 mb-6 flex justify-between items-end">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>VALORIZACIÓN TOTAL</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">PEN</span>
              </div>
              <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(totalGeneral)}
              </span>
            </div>

            <button 
              onClick={handleSubmitIngreso}
              disabled={isSubmitting || items.length === 0}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando en Kardex...' : 'Confirmar Ingreso a Almacén'}
            </button>
            <p className={`text-[11px] text-center mt-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Esta acción aumentará el stock y generará la entrada en el Kardex permanente.
            </p>
          </div>

        </div>

      </div>
      </fieldset>

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
