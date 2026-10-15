import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Boxes, Plus, Search, AlertTriangle, ArrowRightLeft, 
  Download, Edit2, Trash2, PackageCheck, Layers, Package, X, Save
} from 'lucide-react';
import { inventarioService, type Producto } from '../../services/inventarioService';

export const StockProductosPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const navigate = useNavigate();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('TODAS');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | 'NORMAL' | 'BAJO' | 'AGOTADO'>('TODOS');
  
  // Modal de Nuevo / Editar Producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const initialForm = {
    codigo: '',
    descripcion: '',
    categoria: 'Hardware',
    unidad: 'NIU',
    almacen: 'Almacén Central',
    costoUnitario: '',
    precioVenta: '',
    stockMinimo: '5',
    stockInicial: '0'
  };

  const [form, setForm] = useState(initialForm);

  const loadProductos = async () => {
    const data = await inventarioService.getProductos();
    setProductos(data);
  };

  useEffect(() => {
    loadProductos();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // KPIs
  const totalItems = productos.length;
  const totalUnidades = productos.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const valorizacionTotal = productos.reduce((acc, p) => acc + ((Number(p.stock) || 0) * (Number(p.costoUnitario) || 0)), 0);
  const stockCriticoCount = productos.filter(p => (Number(p.stock) || 0) <= (Number(p.stockMinimo) || 0)).length;

  const categorias = useMemo(() => {
    const set = new Set<string>();
    productos.forEach(p => { if (p.categoria) set.add(p.categoria); });
    return Array.from(set);
  }, [productos]);

  const filteredProductos = useMemo(() => {
    return productos.filter(p => {
      const matchSearch = p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCat = categoriaFilter === 'TODAS' || p.categoria === categoriaFilter;

      let matchEstado = true;
      if (estadoFilter === 'NORMAL') matchEstado = p.stock > p.stockMinimo;
      if (estadoFilter === 'BAJO') matchEstado = p.stock <= p.stockMinimo && p.stock > 0;
      if (estadoFilter === 'AGOTADO') matchEstado = p.stock === 0;

      return matchSearch && matchCat && matchEstado;
    });
  }, [productos, searchTerm, categoriaFilter, estadoFilter]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Producto) => {
    setEditingProduct(p);
    setForm({
      codigo: p.codigo,
      descripcion: p.descripcion,
      categoria: p.categoria,
      unidad: p.unidad,
      almacen: p.almacen,
      costoUnitario: p.costoUnitario.toString(),
      precioVenta: p.precioVenta.toString(),
      stockMinimo: p.stockMinimo.toString(),
      stockInicial: p.stock.toString()
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el producto "${name}" del catálogo?`)) {
      await inventarioService.deleteProducto(id);
      await loadProductos();
      showToast(`Producto ${name} eliminado.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo.trim() || !form.descripcion.trim()) {
      alert('Código y descripción son obligatorios.');
      return;
    }

    try {
      if (editingProduct) {
        await inventarioService.updateProducto(editingProduct.id, {
          codigo: form.codigo.trim().toUpperCase(),
          descripcion: form.descripcion.trim(),
          categoria: form.categoria,
          unidad: form.unidad,
          almacen: form.almacen,
          costoUnitario: Number(form.costoUnitario) || 0,
          precioVenta: Number(form.precioVenta) || 0,
          stockMinimo: Number(form.stockMinimo) || 0
        });
        showToast('Producto actualizado con éxito.');
      } else {
        await inventarioService.createProducto({
          codigo: form.codigo.trim().toUpperCase(),
          descripcion: form.descripcion.trim(),
          categoria: form.categoria,
          unidad: form.unidad,
          almacen: form.almacen,
          costoUnitario: Number(form.costoUnitario) || 0,
          precioVenta: Number(form.precioVenta) || 0,
          stockMinimo: Number(form.stockMinimo) || 0,
          stockInicial: Number(form.stockInicial) || 0
        });
        showToast('Nuevo producto registrado e ingresado al kardex.');
      }
      setIsModalOpen(false);
      await loadProductos();
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    }
  };

  const exportCSV = () => {
    const headers = ['Código', 'Descripción', 'Categoría', 'Almacén', 'Unidad', 'Costo Unit (S/)', 'Precio Venta (S/)', 'Stock Actual', 'Stock Mínimo', 'Valor Total (S/)'];
    let csv = headers.join(';') + '\n';
    filteredProductos.forEach(p => {
      const row = [
        p.codigo,
        `"${p.descripcion}"`,
        p.categoria,
        p.almacen,
        p.unidad,
        p.costoUnitario.toFixed(2),
        p.precioVenta.toFixed(2),
        p.stock,
        p.stockMinimo,
        (p.stock * p.costoUnitario).toFixed(2)
      ];
      csv += row.join(';') + '\n';
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_productos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
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
            <span className="text-gray-400 dark:text-slate-500">STOCK DE PRODUCTOS</span>
          </div>
          <h1 className={`text-[26px] font-bold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>
            Stock de productos
          </h1>
          <p className={`mt-2 text-[13px] ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Monitoreo en tiempo real de existencias, almacenes, costos y valorización de inventario.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/ingreso-kardex')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-700' : 'bg-white border-gray-200 text-teal-600 hover:bg-gray-50'
            }`}
          >
            <PackageCheck size={16} />
            Ingreso a Kardex
          </button>
          <button 
            onClick={() => navigate('/movimiento-kardex')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-slate-700' : 'bg-white border-gray-200 text-sky-600 hover:bg-gray-50'
            }`}
          >
            <ArrowRightLeft size={16} />
            Ver Kardex
          </button>
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo producto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Productos Activos</span>
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Boxes size={18} /></div>
          </div>
          <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalItems} SKU</h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Referencias en catálogo</p>
        </div>

        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Unidades Físicas</span>
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><Layers size={18} /></div>
          </div>
          <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalUnidades} UND</h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Existencias totales disponibles</p>
        </div>

        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Valorización Total</span>
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>S/</div>
          </div>
          <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(valorizacionTotal)}</h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Al costo promedio de inventario</p>
        </div>

        <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${stockCriticoCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Stock Crítico</span>
            <div className={`p-2 rounded-lg ${stockCriticoCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <h3 className={`text-2xl font-black ${stockCriticoCount > 0 ? 'text-amber-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>
            {stockCriticoCount} SKU
          </h3>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Por debajo o igual al mínimo</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className={`p-4 rounded-2xl border mb-6 flex flex-col md:flex-row items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative flex-1 w-full">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
          <input 
            type="text" 
            placeholder="Buscar por código, descripción o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
              darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
              darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="TODAS">Todas las Categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as any)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
              darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="NORMAL">Stock Normal</option>
            <option value="BAJO">Stock Crítico</option>
            <option value="AGOTADO">Agotado</option>
          </select>

          <button 
            onClick={exportCSV}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download size={14} />
            Exportar
          </button>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`text-xs uppercase tracking-wider font-bold ${darkMode ? 'bg-slate-800/50 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'} border-b`}>
              <tr>
                <th className="px-5 py-3.5">Código</th>
                <th className="px-5 py-3.5">Descripción</th>
                <th className="px-5 py-3.5">Categoría</th>
                <th className="px-5 py-3.5">Almacén</th>
                <th className="px-5 py-3.5 text-right">Costo Unit.</th>
                <th className="px-5 py-3.5 text-right">P. Venta</th>
                <th className="px-5 py-3.5 text-right">Stock Actual</th>
                <th className="px-5 py-3.5 text-right">Mínimo</th>
                <th className="px-5 py-3.5 text-right">Valor Total</th>
                <th className="px-5 py-3.5 text-center">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              <AnimatePresence>
                {filteredProductos.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Package size={24} />
                      </div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No se encontraron productos coincidentes.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProductos.map((prod) => {
                    const isBajo = prod.stock <= prod.stockMinimo && prod.stock > 0;
                    const isAgotado = prod.stock === 0;

                    return (
                      <motion.tr 
                        key={prod.id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-500">{prod.codigo}</td>
                        <td className={`px-5 py-3.5 font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          <div>{prod.descripcion}</div>
                          <span className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{prod.unidad}</span>
                        </td>
                        <td className={`px-5 py-3.5 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {prod.categoria}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{prod.almacen}</td>
                        <td className={`px-5 py-3.5 text-right text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatCurrency(prod.costoUnitario)}</td>
                        <td className={`px-5 py-3.5 text-right text-xs font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(prod.precioVenta)}</td>
                        <td className="px-5 py-3.5 text-right font-black text-sm">
                          <span className={isAgotado ? 'text-rose-500' : isBajo ? 'text-amber-500' : darkMode ? 'text-emerald-400' : 'text-emerald-600'}>
                            {prod.stock}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-right text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{prod.stockMinimo}</td>
                        <td className={`px-5 py-3.5 text-right text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {formatCurrency(prod.stock * prod.costoUnitario)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isAgotado ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                              Agotado
                            </span>
                          ) : isBajo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                              Bajo Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenEdit(prod)}
                              className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}
                              title="Editar producto"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button 
                              onClick={() => handleDelete(prod.id, prod.descripcion)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Producto */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
            >
              <div className={`px-6 py-4 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Código / SKU *</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ej: LAP-HP450" 
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm uppercase ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Categoría</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Laptops, Monitores" 
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Descripción del Producto *</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ej: Laptop HP ProBook 450 G8 15.6'' Core i7" 
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Unidad de Medida</label>
                    <input 
                      type="text" 
                      placeholder="NIU, UNID, KGM" 
                      value={form.unidad}
                      onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Almacén Asignado</label>
                    <input 
                      type="text" 
                      placeholder="Almacén Central" 
                      value={form.almacen}
                      onChange={(e) => setForm({ ...form, almacen: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Costo Unitario (S/)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={form.costoUnitario}
                      onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Precio de Venta (S/)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={form.precioVenta}
                      onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Stock Mínimo (Alerta)</label>
                    <input 
                      type="number" 
                      placeholder="5" 
                      value={form.stockMinimo}
                      onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  {!editingProduct && (
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Stock Inicial</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        value={form.stockInicial}
                        onChange={(e) => setForm({ ...form, stockInicial: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                  )}
                </div>

                <div className={`pt-4 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border ${darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save size={16} />
                    Guardar
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
            <PackageCheck size={18} />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
