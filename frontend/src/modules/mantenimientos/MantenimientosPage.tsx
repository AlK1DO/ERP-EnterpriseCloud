import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Save, Edit3, Trash2, X, Search, Check, Layers, Tag, Warehouse, Scale, Package
} from 'lucide-react';
import { inventarioService, type CatalogoItem } from '../../services/inventarioService';

interface CatalogDefinition {
  id: string;
  name: string;
  count: number;
}

interface ProductoItem {
  id: string;
  codigo: string;
  descripcion: string;
  linea: string;
  marca: string;
  unidad: string;
  almacen: string;
  pCompra: number;
  pVenta: number;
  stock: number;
  stockMinimo: number;
}

const DEFAULT_LINEAS: CatalogoItem[] = [
  { id: '1', codigo: 'CAT-01', nombre: 'Monitores', descripcion: 'Pantallas gamer y profesionales' },
  { id: '2', codigo: 'CAT-02', nombre: 'Teclados', descripcion: 'Teclados mecánicos y de oficina' },
  { id: '3', codigo: 'CAT-03', nombre: 'Mouses', descripcion: 'Mouses ópticos e inalámbricos de precisión' },
  { id: '4', codigo: 'CAT-04', nombre: 'Laptops', descripcion: 'Equipos portátiles para oficina y gaming' },
  { id: '5', codigo: 'CAT-05', nombre: 'Almacenamiento', descripcion: 'Discos sólidos SSD NVMe y SATA' },
  { id: '6', codigo: 'CAT-06', nombre: 'Memorias RAM', descripcion: 'Módulos de memoria RAM DDR4 y DDR5' },
];

const DEFAULT_MARCAS: CatalogoItem[] = [
  { id: '1', nombre: 'Logitech', paisOrigen: 'Suiza' },
  { id: '2', nombre: 'Dell', paisOrigen: 'Estados Unidos' },
  { id: '3', nombre: 'HP', paisOrigen: 'Estados Unidos' },
  { id: '4', nombre: 'Kingston', paisOrigen: 'Estados Unidos' },
  { id: '5', nombre: 'Corsair', paisOrigen: 'Estados Unidos' },
  { id: '6', nombre: 'Asus', paisOrigen: 'Taiwán' },
  { id: '7', nombre: 'Redragon', paisOrigen: 'China' },
  { id: '8', nombre: 'Samsung', paisOrigen: 'Corea del Sur' },
];

const DEFAULT_ALMACENES: CatalogoItem[] = [
  { id: '1', codigo: 'ALM-01', nombre: 'Almacén Central', direccion: 'Sede Principal - Av. Los Olivos 123' },
  { id: '2', codigo: 'ALM-02', nombre: 'Almacén Secundario', direccion: 'Planta de Distribución Norte' },
];

const DEFAULT_UNIDADES: CatalogoItem[] = [
  { id: '1', codigo: 'NIU', nombre: 'Unidad (Bienes)', simbolo: 'UND' },
  { id: '2', codigo: 'BX', nombre: 'Caja', simbolo: 'CAJA' },
  { id: '3', codigo: 'PK', nombre: 'Paquete', simbolo: 'PQT' },
];

const EMPTY_FORM: ProductoItem = {
  id: '',
  codigo: '',
  descripcion: '',
  linea: 'Monitores',
  marca: 'Dell',
  unidad: 'UND',
  almacen: 'Almacén Central',
  pCompra: 0,
  pVenta: 0,
  stock: 0,
  stockMinimo: 5,
};

export const MantenimientosPage: React.FC = () => {
  const [activeCatalogId, setActiveCatalogId] = useState<string>('productos');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [recordFilter, setRecordFilter] = useState('');

  // Catálogos base
  const [lineas, setLineas] = useState<CatalogoItem[]>(DEFAULT_LINEAS);
  const [marcas, setMarcas] = useState<CatalogoItem[]>(DEFAULT_MARCAS);
  const [almacenes, setAlmacenes] = useState<CatalogoItem[]>(DEFAULT_ALMACENES);
  const [unidades, setUnidades] = useState<CatalogoItem[]>(DEFAULT_UNIDADES);

  // Lista de Productos reales desde Supabase
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [mode, setMode] = useState<'Edición' | 'Nuevo' | 'Lectura'>('Edición');

  // Form State
  const [formData, setFormData] = useState<ProductoItem>(EMPTY_FORM);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Cargar productos de la base de datos
  const cargarProductos = async () => {
    try {
      const dbProds = await inventarioService.getProductos();
      const mapped: ProductoItem[] = dbProds.map(p => ({
        id: p.id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        linea: p.categoria || 'Monitores',
        marca: p.marca || 'Logitech',
        unidad: p.unidad || 'UND',
        almacen: p.almacen || 'Almacén Central',
        pCompra: p.costoUnitario,
        pVenta: p.precioVenta,
        stock: p.stock,
        stockMinimo: p.stockMinimo
      }));
      setProductos(mapped);
      if (mapped.length > 0) {
        setSelectedProductId(mapped[0].id);
        setFormData(mapped[0]);
        setMode('Edición');
      } else {
        handleNew();
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  // Cargar catálogos base desde Supabase
  const cargarCatalogos = async () => {
    try {
      const data = await inventarioService.getCatalogosBase();
      if (data.lineas && data.lineas.length > 0) setLineas(data.lineas);
      if (data.marcas && data.marcas.length > 0) setMarcas(data.marcas);
      if (data.almacenes && data.almacenes.length > 0) setAlmacenes(data.almacenes);
      if (data.unidades && data.unidades.length > 0) {
        // Priorizar Unidad (Bienes) al inicio por ser el estándar para hardware y tecnología
        const sorted = [...data.unidades].sort((a, b) => {
          if (a.simbolo === 'UND' || a.codigo === 'NIU') return -1;
          if (b.simbolo === 'UND' || b.codigo === 'NIU') return 1;
          return a.nombre.localeCompare(b.nombre);
        });
        setUnidades(sorted);
      }
    } catch (err) {
      console.error('Error al cargar catálogos base:', err);
    }
  };

  useEffect(() => {
    cargarProductos();
    cargarCatalogos();
  }, []);

  // Definición dinámica de catálogos
  const catalogsList: CatalogDefinition[] = useMemo(() => [
    { id: 'productos', name: 'Productos', count: productos.length },
    { id: 'lineas', name: 'Líneas / Categorías', count: lineas.length },
    { id: 'marcas', name: 'Marcas', count: marcas.length },
    { id: 'almacenes', name: 'Almacenes', count: almacenes.length },
    { id: 'unidades', name: 'Unidades de medida', count: unidades.length },
  ], [productos.length, lineas.length, marcas.length, almacenes.length, unidades.length]);

  const activeCatalog = useMemo(() => {
    return catalogsList.find(c => c.id === activeCatalogId) || catalogsList[0];
  }, [catalogsList, activeCatalogId]);

  // Filtrado de catálogos en el panel izquierdo
  const filteredCatalogs = useMemo(() => {
    return catalogsList.filter(c => c.name.toLowerCase().includes(catalogSearch.toLowerCase()));
  }, [catalogsList, catalogSearch]);

  // Filtrado de registros de productos
  const displayedProducts = useMemo(() => {
    return productos.filter(p => 
      p.codigo.toLowerCase().includes(recordFilter.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(recordFilter.toLowerCase()) ||
      p.linea.toLowerCase().includes(recordFilter.toLowerCase()) ||
      p.marca.toLowerCase().includes(recordFilter.toLowerCase())
    );
  }, [productos, recordFilter]);

  // Filtrado para otros catálogos
  const displayedLineas = useMemo(() => {
    return lineas.filter(l => 
      l.nombre.toLowerCase().includes(recordFilter.toLowerCase()) ||
      (l.codigo && l.codigo.toLowerCase().includes(recordFilter.toLowerCase())) ||
      (l.descripcion && l.descripcion.toLowerCase().includes(recordFilter.toLowerCase()))
    );
  }, [lineas, recordFilter]);

  const displayedMarcas = useMemo(() => {
    return marcas.filter(m => 
      m.nombre.toLowerCase().includes(recordFilter.toLowerCase()) ||
      (m.paisOrigen && m.paisOrigen.toLowerCase().includes(recordFilter.toLowerCase()))
    );
  }, [marcas, recordFilter]);

  const displayedAlmacenes = useMemo(() => {
    return almacenes.filter(a => 
      a.nombre.toLowerCase().includes(recordFilter.toLowerCase()) ||
      (a.codigo && a.codigo.toLowerCase().includes(recordFilter.toLowerCase())) ||
      (a.direccion && a.direccion.toLowerCase().includes(recordFilter.toLowerCase()))
    );
  }, [almacenes, recordFilter]);

  const displayedUnidades = useMemo(() => {
    return unidades.filter(u => 
      u.nombre.toLowerCase().includes(recordFilter.toLowerCase()) ||
      (u.codigo && u.codigo.toLowerCase().includes(recordFilter.toLowerCase())) ||
      (u.simbolo && u.simbolo.toLowerCase().includes(recordFilter.toLowerCase()))
    );
  }, [unidades, recordFilter]);

  // Conteo de registros en pantalla
  const currentDisplayedCount = useMemo(() => {
    switch (activeCatalog.id) {
      case 'productos': return displayedProducts.length;
      case 'lineas': return displayedLineas.length;
      case 'marcas': return displayedMarcas.length;
      case 'almacenes': return displayedAlmacenes.length;
      case 'unidades': return displayedUnidades.length;
      default: return 0;
    }
  }, [activeCatalog.id, displayedProducts.length, displayedLineas.length, displayedMarcas.length, displayedAlmacenes.length, displayedUnidades.length]);

  // Manejo de Selección de fila de producto
  const handleSelectRow = (prod: ProductoItem) => {
    setSelectedProductId(prod.id);
    setFormData({ ...prod });
    setMode('Edición');
    setFeedbackMessage(null);
  };

  // Botón Nuevo [+]
  const handleNew = () => {
    setMode('Nuevo');
    setSelectedProductId('');
    setFormData({
      id: String(Date.now()),
      codigo: '',
      descripcion: '',
      linea: lineas[0]?.nombre || 'Monitores',
      marca: marcas[0]?.nombre || 'Dell',
      unidad: unidades.find(u => u.simbolo === 'UND' || u.codigo === 'NIU' || u.nombre.toLowerCase().includes('unidad'))?.simbolo || 'UND',
      almacen: almacenes[0]?.nombre || 'Almacén Central',
      pCompra: 0,
      pVenta: 0,
      stock: 0,
      stockMinimo: 5,
    });
    setFeedbackMessage('Ingresa los datos para registrar un nuevo producto.');
  };

  // Botón Guardar [💾]
  const handleSave = async () => {
    if (activeCatalog.id !== 'productos') {
      alert('La edición directa está habilitada para el catálogo de Productos.');
      return;
    }

    if (!formData.codigo || !formData.descripcion) {
      alert('Por favor completa al menos el Código y la Descripción del producto.');
      return;
    }

    try {
      if (mode === 'Nuevo') {
        const nuevo = await inventarioService.createProducto({
          codigo: formData.codigo,
          descripcion: formData.descripcion,
          categoria: formData.linea,
          marca: formData.marca,
          unidad: formData.unidad,
          costoUnitario: formData.pCompra,
          precioVenta: formData.pVenta,
          stockMinimo: formData.stockMinimo,
          stockInicial: formData.stock,
          almacen: formData.almacen
        });
        await cargarProductos();
        setSelectedProductId(nuevo.id);
        setMode('Edición');
        setFeedbackMessage('¡Producto guardado en Supabase con éxito!');
      } else {
        await inventarioService.updateProducto(formData.id, {
          codigo: formData.codigo,
          descripcion: formData.descripcion,
          categoria: formData.linea,
          marca: formData.marca,
          unidad: formData.unidad,
          costoUnitario: formData.pCompra,
          precioVenta: formData.pVenta,
          stockMinimo: formData.stockMinimo,
          stock: formData.stock,
          almacen: formData.almacen
        });
        await cargarProductos();
        setFeedbackMessage('¡Cambios actualizados en Supabase con éxito!');
      }
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
    }

    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Botón Eliminar [🗑️]
  const handleDelete = async () => {
    if (activeCatalog.id !== 'productos' || !selectedProductId) return;
    if (confirm(`¿Estás seguro de eliminar el producto "${formData.descripcion}"?`)) {
      try {
        await inventarioService.deleteProducto(selectedProductId);
        await cargarProductos();
        setFeedbackMessage('Producto eliminado de Supabase correctamente.');
      } catch (err: any) {
        alert(err.message || 'Error al eliminar');
      }
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // Botón Cancelar [✖️]
  const handleCancel = () => {
    if (productos.length > 0) {
      handleSelectRow(productos[0]);
    }
    setFeedbackMessage(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado y Barra de Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase">
            MÓDULO DE MANTENIMIENTO
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Mantenimiento del Sistema
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión centralizada de productos, categorías tecnológicas, marcas y almacenes.
          </p>
        </div>

        {/* Grupo de Botones de Acción [+] [💾] [✏️] [🗑️] [✖️] */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => {
              if (activeCatalog.id !== 'productos') setActiveCatalogId('productos');
              handleNew();
            }}
            title="Crear nuevo registro"
            className="p-2.5 rounded-xl text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={handleSave}
            title="Guardar registro"
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Save size={18} />
          </button>
          <button
            onClick={() => setMode('Edición')}
            title="Editar registro activo"
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={handleDelete}
            title="Eliminar registro"
            className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={handleCancel}
            title="Cancelar / Restablecer"
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Alerta de notificación si se ejecuta una acción */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-medium animate-in fade-in">
          <Check size={16} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* 4 Cards de Métricas Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Card 1: Catálogo Activo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>CATÁLOGO ACTIVO</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {activeCatalog.count}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {activeCatalog.name}
          </p>
        </div>

        {/* Card 2: Catálogos */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>CATÁLOGOS</span>
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {catalogsList.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tablas de inventario
          </p>
        </div>

        {/* Card 3: En Pantalla */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>EN PANTALLA</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {currentDisplayedCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registros listados
          </p>
        </div>

        {/* Card 4: Modo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>MODO</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {activeCatalog.id === 'productos' ? mode : 'Consulta'}
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {activeCatalog.id === 'productos' 
              ? (mode === 'Nuevo' ? 'Nuevo registro' : formData.descripcion || 'Sin seleccionar')
              : `Catálogo de ${activeCatalog.name}`}
          </p>
        </div>

      </div>

      {/* Contenedor Principal: 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel Izquierdo: Catálogos */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                Catálogos
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {filteredCatalogs.length} DE {catalogsList.length}
              </p>
            </div>

            {/* Input Buscar catálogo */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar catálogo..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white placeholder-slate-400"
              />
            </div>

            {/* Lista de Catálogos */}
            <div className="space-y-1 overflow-y-auto pr-1">
              {filteredCatalogs.map(cat => {
                const isActive = activeCatalog.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCatalogId(cat.id);
                      setRecordFilter('');
                      setFeedbackMessage(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all ${
                      isActive
                        ? 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold border border-sky-100 dark:border-sky-900/50'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <span className="truncate pr-2">{cat.name}</span>
                    <span className={`text-[11px] font-medium shrink-0 ${
                      isActive ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-400'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel Derecho: Ficha y Listado */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* VISTA 1: SI EL CATÁLOGO ACTIVO ES PRODUCTOS */}
          {activeCatalog.id === 'productos' && (
            <>
              {/* Ficha · Productos */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Ficha · Productos
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                    {mode === 'Nuevo' ? 'CREANDO NUEVO PRODUCTO' : `EDITANDO ${formData.descripcion.toUpperCase() || 'PRODUCTO'}`}
                  </p>
                </div>

                {/* Formulario Productos */}
                <div className="space-y-4">
                  
                  {/* Fila 1: Código, Descripción, Línea */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        CÓDIGO (SKU)
                      </label>
                      <input
                        type="text"
                        value={formData.codigo}
                        onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                        placeholder="Ej. MON-DELL27"
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        DESCRIPCIÓN DEL PRODUCTO
                      </label>
                      <input
                        type="text"
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        placeholder="Ej. Monitor Dell UltraSharp 27 4K IPS"
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        LÍNEA / CATEGORÍA
                      </label>
                      <select
                        value={formData.linea}
                        onChange={e => setFormData({ ...formData, linea: e.target.value })}
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      >
                        {lineas.map(l => (
                          <option key={l.id} value={l.nombre}>{l.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fila 2: Marca, Unidad, Almacén, P. Compra */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        MARCA
                      </label>
                      <select
                        value={formData.marca}
                        onChange={e => setFormData({ ...formData, marca: e.target.value })}
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      >
                        {marcas.map(m => (
                          <option key={m.id} value={m.nombre}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        UNIDAD
                      </label>
                      <select
                        value={formData.unidad}
                        onChange={e => setFormData({ ...formData, unidad: e.target.value })}
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      >
                        {unidades.map(u => (
                          <option key={u.id} value={u.simbolo || u.codigo || u.nombre}>
                            {u.nombre} ({u.simbolo || u.codigo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        ALMACÉN
                      </label>
                      <select
                        value={formData.almacen}
                        onChange={e => setFormData({ ...formData, almacen: e.target.value })}
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      >
                        {almacenes.map(a => (
                          <option key={a.id} value={a.nombre}>{a.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        P. COMPRA (S/)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pCompra}
                        onChange={e => setFormData({ ...formData, pCompra: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Fila 3: P. Venta, Stock, Stock Mínimo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        P. VENTA (S/)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pVenta}
                        onChange={e => setFormData({ ...formData, pVenta: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        STOCK DISPONIBLE
                      </label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        STOCK MÍNIMO
                      </label>
                      <input
                        type="number"
                        value={formData.stockMinimo}
                        onChange={e => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) || 0 })}
                        className="w-full text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Listado · Productos */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">
                      Listado · Productos
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {displayedProducts.length} DE {productos.length} PRODUCTOS REGISTRADOS
                    </p>
                  </div>

                  {/* Input Filtrar registros */}
                  <div className="relative sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Filtrar por código, descripción..."
                      value={recordFilter}
                      onChange={e => setRecordFilter(e.target.value)}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Tabla de productos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3">CÓDIGO</th>
                        <th className="py-3 px-3">DESCRIPCIÓN</th>
                        <th className="py-3 px-3">LÍNEA</th>
                        <th className="py-3 px-3">MARCA</th>
                        <th className="py-3 px-3">UNIDAD</th>
                        <th className="py-3 px-3">ALMACÉN</th>
                        <th className="py-3 px-3">P. COMPRA</th>
                        <th className="py-3 px-3">P. VENTA</th>
                        <th className="py-3 px-3">STOCK</th>
                        <th className="py-3 px-3">STOCK MÍNIMO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:border-slate-800">
                      {displayedProducts.map(prod => {
                        const isSelected = selectedProductId === prod.id;
                        return (
                          <tr 
                            key={prod.id}
                            onClick={() => handleSelectRow(prod)}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-sky-50/70 dark:bg-sky-950/40 font-medium' 
                                : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-3 px-3 font-semibold text-sky-600 dark:text-sky-400">
                              {prod.codigo}
                            </td>
                            <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                              {prod.descripcion}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                              {prod.linea}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                              {prod.marca}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {prod.unidad}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {prod.almacen}
                            </td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                              S/ {prod.pCompra.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                              S/ {prod.pVenta.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {prod.stock.toLocaleString('es-PE')}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {prod.stockMinimo.toLocaleString('es-PE')}
                            </td>
                          </tr>
                        );
                      })}
                      {displayedProducts.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No se encontraron productos coincidentes.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </>
          )}

          {/* VISTA 2: SI EL CATÁLOGO ACTIVO ES LÍNEAS / CATEGORÍAS */}
          {activeCatalog.id === 'lineas' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Listado · Líneas / Categorías
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {displayedLineas.length} DE {lineas.length} CATEGORÍAS
                  </p>
                </div>
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Filtrar categorías..."
                    value={recordFilter}
                    onChange={e => setRecordFilter(e.target.value)}
                    className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">CÓDIGO</th>
                      <th className="py-3 px-3">CATEGORÍA / LÍNEA</th>
                      <th className="py-3 px-3">DESCRIPCIÓN</th>
                      <th className="py-3 px-3">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:border-slate-800">
                    {displayedLineas.map(lin => (
                      <tr key={lin.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-sky-600 dark:text-sky-400">{lin.codigo || '-'}</td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{lin.nombre}</td>
                        <td className="py-3 px-3 text-slate-500">{lin.descripcion || 'Sin descripción'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                            Activo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 3: SI EL CATÁLOGO ACTIVO ES MARCAS */}
          {activeCatalog.id === 'marcas' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Listado · Marcas
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {displayedMarcas.length} DE {marcas.length} MARCAS
                  </p>
                </div>
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Filtrar marcas..."
                    value={recordFilter}
                    onChange={e => setRecordFilter(e.target.value)}
                    className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">MARCA</th>
                      <th className="py-3 px-3">PAÍS DE ORIGEN</th>
                      <th className="py-3 px-3">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:border-slate-800">
                    {displayedMarcas.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{m.nombre}</td>
                        <td className="py-3 px-3 text-slate-500">{m.paisOrigen || 'Internacional'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                            Activo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 4: SI EL CATÁLOGO ACTIVO ES ALMACENES */}
          {activeCatalog.id === 'almacenes' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Listado · Almacenes
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {displayedAlmacenes.length} DE {almacenes.length} ALMACENES
                  </p>
                </div>
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Filtrar almacenes..."
                    value={recordFilter}
                    onChange={e => setRecordFilter(e.target.value)}
                    className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">CÓDIGO</th>
                      <th className="py-3 px-3">NOMBRE DE ALMACÉN</th>
                      <th className="py-3 px-3">DIRECCIÓN</th>
                      <th className="py-3 px-3">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:border-slate-800">
                    {displayedAlmacenes.map(alm => (
                      <tr key={alm.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-sky-600 dark:text-sky-400">{alm.codigo || '-'}</td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{alm.nombre}</td>
                        <td className="py-3 px-3 text-slate-500">{alm.direccion || 'Sede Principal'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                            Activo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 5: SI EL CATÁLOGO ACTIVO ES UNIDADES DE MEDIDA */}
          {activeCatalog.id === 'unidades' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Listado · Unidades de Medida
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {displayedUnidades.length} DE {unidades.length} UNIDADES
                  </p>
                </div>
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Filtrar unidades..."
                    value={recordFilter}
                    onChange={e => setRecordFilter(e.target.value)}
                    className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">CÓDIGO SUNAT</th>
                      <th className="py-3 px-3">DESCRIPCIÓN</th>
                      <th className="py-3 px-3">SÍMBOLO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:border-slate-800">
                    {displayedUnidades.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-sky-600 dark:text-sky-400">{u.codigo || '-'}</td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{u.nombre}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-semibold">{u.simbolo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default MantenimientosPage;
