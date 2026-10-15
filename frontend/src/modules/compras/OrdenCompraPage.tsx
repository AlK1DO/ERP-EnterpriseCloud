import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Package, Receipt, Building2, Trash2, CheckCircle
} from 'lucide-react';
import type { Producto } from '../../services/inventarioService';
import { proveedoresService, type Proveedor } from '../../services/proveedoresService';
import { addPurchaseLine, hasUnsavedPurchase, newPurchaseId, paymentLabel, persistPurchase, positiveNumber, purchaseTotals, readPurchaseProducts, supplierSnapshot, supplierUsable } from './purchaseOrder';
import type { PurchaseLine } from './purchaseOrder';

export const OrdenCompraPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<PurchaseLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [inputCant, setInputCant] = useState('');
  const [inputPrecio, setInputPrecio] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<{ id: string; total: number } | null>(null);
  const [draftId, setDraftId] = useState(newPurchaseId);
  const savePending = useRef(false);
  const mounted = useRef(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [proveedorSearch, setProveedorSearch] = useState('');
  const [proveedoresDB, setProveedoresDB] = useState<Proveedor[]>([]);
  const [productDB, setProductDB] = useState<Producto[]>([]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);
  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const providers = await proveedoresService.getProveedores({ initializeIfEmpty: false });
        if (!Array.isArray(providers) || providers.some(p => !p || typeof p !== 'object')) throw new Error('Datos de proveedores inválidos.');
        const catalog = readPurchaseProducts(localStorage);
        if (active) { setProveedoresDB(providers); setProductDB(catalog); setCatalogError(null); }
      } catch {
        if (active) setCatalogError('No se pudieron cargar proveedores o productos. No se modificaron los registros. Revisa los datos y reintenta.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCatalog();
    return () => { active = false; };
  }, [reload]);

  const showToast = (message: string) => setToastMessage(message);
  const retryCatalog = () => { setLoading(true); setReload(value => value + 1); };
  const openProvider = () => { if (!saving && !savedOrder) { retryCatalog(); setIsModalOpen(true); } };
  const filteredProviders = proveedoresDB.filter(p => String(p.nombre ?? '').toLowerCase().includes(proveedorSearch.toLowerCase()) || String(p.documento ?? '').includes(proveedorSearch));
  const filteredProducts = productDB.filter(p => p.codigo.toLowerCase().includes(searchQuery.toLowerCase()) || p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
  function selectProduct(id: string) {
    setSelectedProductId(id);
    const product = productDB.find(p => p.id === id);
    setInputPrecio(product && Number.isFinite(Number(product.costoUnitario)) && Number(product.costoUnitario) > 0 ? String(product.costoUnitario) : '');
    setError(null);
  }
  const handleAddProduct = () => {
    if (saving || savedOrder) return;
    try {
      const product = productDB.find(p => p.id === selectedProductId);
      if (!product) throw new Error('Selecciona un producto del catálogo; escribir una descripción no selecciona un producto.');
      if (products.some(p => p.producto_id === product.id)) throw new Error('El producto ya está agregado. Edita su cantidad en la tabla.');
      const line = addPurchaseLine(product, inputCant, inputPrecio);
      setProducts(previous => [...previous, line]);
      setSearchQuery(''); setSelectedProductId(''); setInputCant(''); setInputPrecio(''); setError(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Revisa el producto.'); }
  };
  const removeProduct = (id: string) => { setProducts(previous => previous.filter(p => p.id !== id)); setError(null); };
  function editLine(id: string, field: 'cantidad' | 'precioUnitario', value: string) {
    setProducts(previous => previous.map(p => p.id === id ? { ...p, [field]: value } : p));
    setError(null);
  }
  let preview: ReturnType<typeof purchaseTotals> | null = null;
  let validationError: string | null = null;
  try { preview = purchaseTotals(products, descuentoGlobal); }
  catch (failure) { validationError = failure instanceof Error ? failure.message : 'Revisa los importes.'; }
  const subtotal = preview?.subtotal;
  const descValue = preview?.descuento;
  const igv = preview?.igv;
  const total = preview?.total;
  const formatCurrency = (value: number | undefined) => value !== undefined && Number.isFinite(value) ? `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  const lineAmount = (line: PurchaseLine) => {
    try { return positiveNumber(line.cantidad, 'Cantidad') * positiveNumber(line.precioUnitario, 'Precio'); }
    catch { return undefined; }
  };
  const handleSaveOrder = async () => {
    if (savePending.current || savedOrder || loading || catalogError) return;
    savePending.current = true; setSaving(true); setError(null); setToastMessage(null);
    try {
      if (searchQuery || selectedProductId || inputCant || inputPrecio) throw new Error('Hay un producto sin agregar. Agrégalo o limpia sus campos antes de guardar.');
      const providers = await proveedoresService.getProveedores({ initializeIfEmpty: false });
      if (!mounted.current) return;
      const order = persistPurchase(localStorage, { id: draftId, proveedor: selectedProveedor ? supplierSnapshot(selectedProveedor) : null, items: products, descuento: descuentoGlobal }, providers);
      setSavedOrder({ id: order.id, total: order.total });
      showToast(`Orden ${order.id} guardada por ${formatCurrency(order.total)}. Pendiente de ingreso al Kardex.`);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'No se pudo guardar. Tus campos se mantienen para reintentar.');
    } finally {
      savePending.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const handleNuevaCompra = () => {
    if (savePending.current) return;
    const dirty = hasUnsavedPurchase({ items: products, selectedSupplier: selectedProveedor, search: searchQuery || selectedProductId, quantity: inputCant, price: inputPrecio, discount: descuentoGlobal }, Boolean(savedOrder));
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartarlos e iniciar una nueva compra?')) return;
    setProducts([]); setSearchQuery(''); setSelectedProductId(''); setInputCant(''); setInputPrecio('');
    setDescuentoGlobal(''); setSelectedProveedor(null); setProveedorSearch(''); setIsModalOpen(false);
    setSavedOrder(null); setDraftId(newPurchaseId()); setError(null); setToastMessage(null);
    retryCatalog();
  };
  // Colores principales
  const tealColor = '#00b894';
  const tealBadge = '#78e08f';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto pb-10 font-sans"
    >
      {/* Header (Título y botones superiores) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 mt-2">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 text-blue-500">
            <span>ERP</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span>COMPRAS</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span className="text-gray-400 dark:text-slate-500">CONSULTA</span>
          </div>
          <h1 className={`text-[26px] font-bold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>
            Orden de compra
          </h1>
          <p className={`mt-2 text-[13px] ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Gestiona proveedores, productos, cantidades, descuentos y totales desde un flujo centralizado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleNuevaCompra}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-700' : 'bg-white border-gray-200 text-[#00b894] hover:bg-gray-50'
            }`}
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva compra
          </button>
          <button 
            onClick={handleSaveOrder}
            disabled={saving || loading || Boolean(catalogError) || Boolean(savedOrder)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg text-white transition-colors shadow-sm"
            style={{ backgroundColor: tealColor }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00a884'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = tealColor}
          >
            <Receipt size={16} strokeWidth={2.5} />
            {saving ? 'Guardando…' : savedOrder ? 'Orden guardada' : 'Grabar orden'}
          </button>
        </div>
      </div>

      {loading && <p role="status" className="mb-4 text-sm text-slate-500">Cargando proveedores y productos…</p>}
      {catalogError && <div role="alert" className="mb-4 p-4 border border-red-300 rounded-xl text-red-600">{catalogError} <button type="button" onClick={retryCatalog} className="underline">Reintentar carga</button></div>}
      {(error || validationError) && <p role="alert" className="mb-4 p-4 border border-red-300 rounded-xl text-red-600">{error || validationError}</p>}
      {savedOrder && <div role="status" className={`mb-6 p-4 rounded-xl border ${darkMode ? 'bg-teal-950 border-teal-800 text-teal-200' : 'bg-teal-50 border-teal-200 text-teal-800'}`}>
        <p className="font-semibold break-all">Orden {savedOrder.id} guardada por {formatCurrency(savedOrder.total)}.</p>
        <p className="text-sm mt-1">Pendiente de ingreso al Kardex. No se modificaron existencias ni se generaron movimientos.</p>
        <button type="button" onClick={() => navigate('/ingreso-kardex')} className="mt-3 px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold">Ir a Ingreso al Kardex</button>
      </div>}
      <fieldset disabled={saving || loading || Boolean(catalogError) || Boolean(savedOrder)} className="min-w-0 border-0 p-0 m-0">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column - Forms */}
        <div className="flex-1 w-full space-y-6">
          
          {/* 01. Detalle de productos */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm overflow-hidden`}>
            <div className="px-6 py-4 flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
                style={{ backgroundColor: tealBadge }}
              >
                01
              </div>
              <div>
                <h3 className={`text-[17px] font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Detalle de productos</h3>
                <p className={`text-[13px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{products.length} items registrados. Solo cantidad y precio son editables.</p>
              </div>
            </div>

            <div className="p-6 pt-2">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>PRODUCTO</label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`} size={16} />
                    <input 
                      type="text" 
                      placeholder="Seleccionar producto" 
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSelectedProductId(''); }}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all ${
                        darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-[#2d3436]'
                      }`}
                    />
                  </div>
                  <select aria-label="Seleccionar producto del catálogo" value={selectedProductId} onChange={e => selectProduct(e.target.value)} className={`mt-2 w-full p-2.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-gray-200 text-[#2d3436]'}`}>
                    <option value="">Selecciona un producto</option>
                    {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.descripcion}</option>)}
                  </select>
                  {!loading && !catalogError && productDB.length === 0 && <p className="mt-2 text-xs text-slate-500">No hay productos válidos registrados. Regístralos en Stock de productos.</p>}
                </div>
                <div className="w-full md:w-32">
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>CANTIDAD</label>
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    placeholder="0.00" 
                    value={inputCant}
                    onChange={(e) => setInputCant(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-[#2d3436]'
                    }`}
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>PRECIO UNITARIO</label>
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    placeholder="0.00" 
                    value={inputPrecio}
                    onChange={(e) => setInputPrecio(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-[#2d3436]'
                    }`}
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleAddProduct}
                    className="h-[42px] px-6 flex items-center gap-2 rounded-lg text-white font-bold text-sm transition-colors shadow-sm"
                    style={{ backgroundColor: tealColor }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00a884'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = tealColor}
                  >
                    <Plus size={18} /> Agregar
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className={`border rounded-xl overflow-hidden ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                <table className="w-full text-left text-sm">
                  <thead className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                    <tr>
                      <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>CÓDIGO</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>DESCRIPCIÓN</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>UNIDAD</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b text-right ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>CANT.</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b text-right ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>P. UNITARIO</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b text-right ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>IMPORTE</th>
                      <th className={`px-3 py-3 border-b w-10 ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}></th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800 bg-slate-900' : 'divide-gray-100 bg-white'}`}>
                    <AnimatePresence>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center">
                            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-gray-50 text-gray-300'}`}>
                              <Package size={28} />
                            </div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>No hay productos agregados a la orden.</p>
                          </td>
                        </tr>
                      ) : (
                        products.map((p) => (
                          <motion.tr 
                            initial={{ opacity: 0, backgroundColor: darkMode ? '#0f172a' : '#f0fdf4' }}
                            animate={{ opacity: 1, backgroundColor: 'transparent' }}
                            exit={{ opacity: 0, height: 0 }}
                            key={p.id} 
                            className={`group transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'}`}
                          >
                            <td className={`px-5 py-3.5 text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{p.codigo}</td>
                            <td className={`px-5 py-3.5 text-sm font-medium ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>{p.descripcion}</td>
                            <td className={`px-5 py-3.5 text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{p.unidad}</td>
                            <td className={`px-5 py-3.5 text-right text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}><input aria-label={`Cantidad de ${p.codigo}`} type="number" min="0" step="any" value={p.cantidad} onChange={e => editLine(p.id, 'cantidad', e.target.value)} className="w-24 p-2 text-right border rounded bg-transparent" /></td>
                            <td className={`px-5 py-3.5 text-right text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}><input aria-label={`Precio unitario de ${p.codigo}`} type="number" min="0" step="any" value={p.precioUnitario} onChange={e => editLine(p.id, 'precioUnitario', e.target.value)} className="w-28 p-2 text-right border rounded bg-transparent" /></td>
                            <td className={`px-5 py-3.5 text-right text-sm font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>{formatCurrency(lineAmount(p))}</td>
                            <td className="px-3 py-3.5">
                              <button 
                                onClick={() => removeProduct(p.id)}
                                aria-label={`Quitar ${p.codigo}`}
                                className={`transition-colors ${darkMode ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 02. Condiciones económicas */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm overflow-hidden`}>
            <div className="px-6 py-4 flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
                style={{ backgroundColor: tealBadge }}
              >
                02
              </div>
              <div>
                <h3 className={`text-[17px] font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Condiciones económicas</h3>
                <p className={`text-[13px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Descuentos y valores aplicados a la operación.</p>
              </div>
            </div>
            
            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>DESCUENTO GLOBAL</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#1e272e] text-white'}`}>PEN</span>
                </div>
                <p className={`text-[13px] mb-3 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Se aplica antes de calcular el IGV</p>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>S/</span>
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    placeholder="0.00" 
                    value={descuentoGlobal}
                    onChange={(e) => setDescuentoGlobal(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-[#2d3436]'
                    }`}
                  />
                </div>
              </div>
              <div className={`p-4 rounded-xl border flex gap-3 ${darkMode ? 'bg-blue-900/20 border-blue-900/50' : 'bg-[#f0f7ff] border-blue-100'}`}>
                <Receipt className="text-blue-500 shrink-0 mt-0.5" size={20} />
                <p className={`text-[13px] leading-relaxed ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Verifica cantidades y precios directamente en la tabla. Los importes y el total se actualizan automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-6">
          
          {/* Proveedor */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Datos del proveedor</h3>
                <p className={`text-[13px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Datos del proveedor registrado</p>
              </div>
              <Building2 className={`${darkMode ? 'text-slate-600' : 'text-gray-300'}`} size={20} />
            </div>
            
            {selectedProveedor ? (
              <div 
                className={`w-full p-4 rounded-xl border relative group cursor-pointer transition-all ${
                  darkMode ? 'border-teal-500/30 bg-teal-500/5 hover:border-teal-500/50' : 'border-[#00b894]/30 bg-[#00b894]/5 hover:border-[#00b894]/50'
                }`}
                onClick={openProvider}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-bold mb-1 ${darkMode ? 'text-teal-400' : 'text-[#00b894]'}`}>{selectedProveedor.nombre}</p>
                    <p className={`text-[12px] font-medium mb-0.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>Documento: {selectedProveedor.documento}</p>
                    <div className={`text-[12px] space-y-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      <p>Condición: {paymentLabel(supplierSnapshot(selectedProveedor).condicion_pago)}</p>
                      <p>Dirección: {selectedProveedor.direccion || 'No registrada'}</p>
                      <p>Correo: {selectedProveedor.email || 'No registrado'}</p>
                      <p>Teléfono: {selectedProveedor.telefono || 'No registrado'}</p>
                      <p>Estado: {selectedProveedor.estado}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Search size={14} />
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={openProvider}
                className={`w-full py-3.5 px-4 rounded-xl border flex items-center gap-3 transition-all shadow-sm ${
                  darkMode ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  <Search size={16} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Seleccionar un proveedor</p>
                  <p className={`text-[12px] ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Usa Buscar proveedor para cargar los datos.</p>
                </div>
              </button>
            )}
          </div>

          {/* Resumen */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Resumen de la orden</h3>
            <p className={`text-[13px] mt-0.5 mb-6 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Cálculo automático de la operación</p>

            <div className={`space-y-3.5 pb-5 border-b text-[14px] ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`flex justify-between ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                <span>Subtotal</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>{formatCurrency(subtotal)}</span>
              </div>
              <div className={`flex justify-between ${darkMode ? 'text-red-400' : 'text-[#ff7675]'}`}>
                <span>Descuento</span>
                <span>- {formatCurrency(descValue)}</span>
              </div>
              <div className={`flex justify-between ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                <span>IGV (18%)</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>{formatCurrency(igv)}</span>
              </div>
              <div className={`flex justify-between ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                <span>Otros cargos</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>S/ 0.00</span>
              </div>
            </div>

            <div className="pt-5 mb-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>TOTAL ORDEN</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#1e272e] text-white'}`}>PEN</span>
                </div>
                <span className={`text-[28px] font-black leading-none ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <button 
              onClick={handleSaveOrder}
              disabled={saving || loading || Boolean(catalogError) || Boolean(savedOrder)}
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-colors shadow-sm mb-4"
              style={{ backgroundColor: tealColor }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00a884'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = tealColor}
            >
              {saving ? 'Guardando…' : savedOrder ? 'Orden guardada' : 'Grabar orden de compra'}
            </button>
            <p className={`text-[12px] leading-relaxed text-center px-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              La orden quedará pendiente de ingreso al Kardex. Guardarla no modifica existencias ni genera movimientos.
            </p>
          </div>

        </div>
      </div>
      </fieldset>

      {/* Modal Buscar Proveedor */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
            >
              {/* Modal Header */}
              <div className={`px-6 py-4 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-teal-400' : 'bg-teal-50 text-[#00b894]'}`}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Buscar proveedor</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Busca un proveedor registrado para usarlo en la nueva orden.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className={`text-gray-400 hover:text-gray-600 transition-colors ${darkMode ? 'hover:text-white' : ''}`}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {loading && <p role="status" className="mb-3 text-sm text-slate-500">Actualizando proveedores…</p>}
                {error && <p role="alert" className="mb-3 text-sm text-red-500">{error}</p>}
                <div className="relative mb-6">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} size={18} />
                  <input 
                    type="text" 
                    placeholder="Proveedor / documento"
                    value={proveedorSearch}
                    onChange={(e) => setProveedorSearch(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-[#2d3436]'
                    }`}
                  />
                </div>

                <div className={`border rounded-xl overflow-hidden ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                  <table className="w-full text-left text-sm">
                    <thead className={`${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>PROVEEDOR</th>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>DOCUMENTO</th>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>CONDICIÓN</th>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>ESTADO</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                      {filteredProviders.map(prov => (
                        <tr 
                          key={prov.id}
                          onClick={() => {
                            if (loading || !supplierUsable(prov)) { setError('Selecciona un proveedor activo con nombre y documento válidos.'); return; }
                            setSelectedProveedor(prov);
                            setError(null);
                            setIsModalOpen(false);
                            setProveedorSearch('');
                          }}
                          className={`cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className={`px-5 py-3.5 font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}><button type="button" disabled={loading || !supplierUsable(prov)} className="text-left disabled:opacity-50">{prov.nombre || 'Sin nombre'}</button></td>
                          <td className={`px-5 py-3.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{prov.documento || 'No registrado'}</td>
                          <td className={`px-5 py-3.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{paymentLabel(supplierSnapshot(prov).condicion_pago)}</td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00b894]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00b894]"></span> {prov.estado || 'No registrado'}{!supplierUsable(prov) && ' · No seleccionable'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredProviders.length === 0 && (
                        <tr>
                          <td colSpan={4} className={`px-5 py-8 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            No se encontraron proveedores que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`px-6 py-4 border-t flex justify-end ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setProveedorSearch('');
                  }}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors border ${
                    darkMode ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 bg-emerald-500 text-white px-5 py-4 rounded-xl shadow-lg flex items-center gap-3 z-50 min-w-[300px]"
          >
            <div className="bg-white/20 p-1 rounded-full shrink-0">
              <CheckCircle size={18} />
            </div>
            <p className="font-medium text-sm leading-snug">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
