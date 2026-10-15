import React, { useState, useMemo } from 'react';
import { 
  Plus, Save, Edit3, Trash2, X, Search, Check, AlertCircle 
} from 'lucide-react';

interface CatalogDefinition {
  id: string;
  name: string;
  count: number;
}

const CATALOGS: CatalogDefinition[] = [
  { id: 'productos', name: 'Productos', count: 320 },
  { id: 'clientes', name: 'Clientes', count: 96 },
  { id: 'proveedores', name: 'Proveedores', count: 41 },
  { id: 'personal', name: 'Personal', count: 28 },
  { id: 'servicios', name: 'Servicios', count: 12 },
  { id: 'lineas', name: 'Líneas', count: 9 },
  { id: 'marcas', name: 'Marcas', count: 17 },
  { id: 'unidades', name: 'Unidades', count: 11 },
  { id: 'monedas', name: 'Monedas', count: 3 },
  { id: 'almacenes', name: 'Almacenes', count: 4 },
  { id: 'conceptos', name: 'Conceptos', count: 22 },
  { id: 'vehiculos', name: 'Vehículos', count: 6 },
  { id: 'documentos', name: 'Documentos', count: 8 },
  { id: 'transportistas', name: 'Transportistas', count: 14 },
  { id: 'tipo_cambio', name: 'Tipo de cambio', count: 365 },
];

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

const INITIAL_PRODUCTOS: ProductoItem[] = [
  {
    id: '1',
    codigo: 'PP-1200',
    descripcion: 'Película polipropileno 1.2mm',
    linea: 'Películas PP',
    marca: 'Pacifico',
    unidad: 'ROLLO',
    almacen: 'Central',
    pCompra: 153.33,
    pVenta: 212.5,
    stock: 128,
    stockMinimo: 500,
  },
  {
    id: '2',
    codigo: 'PVC-3P',
    descripcion: 'Tubo PVC sanitario 3"',
    linea: 'Tuberias PVC',
    marca: 'Andino',
    unidad: 'UND',
    almacen: 'Central',
    pCompra: 40.5,
    pVenta: 58.9,
    stock: 940,
    stockMinimo: 300,
  },
  {
    id: '3',
    codigo: 'ABS-25',
    descripcion: 'Gránulo ABS virgen 25kg',
    linea: 'Gránulos ABS',
    marca: 'Global',
    unidad: 'BOLSA',
    almacen: 'Planta',
    pCompra: 225,
    pVenta: 298,
    stock: 46,
    stockMinimo: 200,
  },
  {
    id: '4',
    codigo: 'PVC-2P',
    descripcion: 'Tubo PVC agua 2"',
    linea: 'Tuberias PVC',
    marca: 'Andino',
    unidad: 'UND',
    almacen: 'Central',
    pCompra: 28.4,
    pVenta: 41.2,
    stock: 1420,
    stockMinimo: 400,
  },
  {
    id: '5',
    codigo: 'ACC-CD9',
    descripcion: 'Codo 90° PVC 3/4',
    linea: 'Accesorios',
    marca: 'Andino',
    unidad: 'UND',
    almacen: 'Central',
    pCompra: 2.1,
    pVenta: 3.8,
    stock: 5300,
    stockMinimo: 1000,
  },
  {
    id: '6',
    codigo: 'PEL-001',
    descripcion: 'Película stretch industrial 25mm',
    linea: 'Películas PP',
    marca: 'Pacifico',
    unidad: 'ROLLO',
    almacen: 'Planta',
    pCompra: 62,
    pVenta: 89.9,
    stock: 40,
    stockMinimo: 1200,
  },
];

export const MantenimientosPage: React.FC = () => {
  const [activeCatalog, setActiveCatalog] = useState<CatalogDefinition>(CATALOGS[0]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [recordFilter, setRecordFilter] = useState('');

  // Lista de Productos
  const [productos, setProductos] = useState<ProductoItem[]>(INITIAL_PRODUCTOS);
  const [selectedProductId, setSelectedProductId] = useState<string>('1');
  const [mode, setMode] = useState<'Edición' | 'Nuevo' | 'Lectura'>('Edición');

  // Form State
  const [formData, setFormData] = useState<ProductoItem>(INITIAL_PRODUCTOS[0]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filtrado de catálogos en el panel izquierdo
  const filteredCatalogs = useMemo(() => {
    return CATALOGS.filter(c => c.name.toLowerCase().includes(catalogSearch.toLowerCase()));
  }, [catalogSearch]);

  // Filtrado de registros en la tabla
  const displayedRecords = useMemo(() => {
    return productos.filter(p => 
      p.codigo.toLowerCase().includes(recordFilter.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(recordFilter.toLowerCase()) ||
      p.linea.toLowerCase().includes(recordFilter.toLowerCase()) ||
      p.marca.toLowerCase().includes(recordFilter.toLowerCase())
    );
  }, [productos, recordFilter]);

  // Manejo de Selección de fila
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
      linea: 'Películas PP',
      marca: 'Pacifico',
      unidad: 'UND',
      almacen: 'Central',
      pCompra: 0,
      pVenta: 0,
      stock: 0,
      stockMinimo: 0,
    });
    setFeedbackMessage('Ingresa los datos para registrar un nuevo elemento.');
  };

  // Botón Guardar [💾]
  const handleSave = () => {
    if (!formData.codigo || !formData.descripcion) {
      alert('Por favor completa al menos el Código y la Descripción.');
      return;
    }

    if (mode === 'Nuevo') {
      const newItem: ProductoItem = { ...formData, id: String(Date.now()) };
      setProductos(prev => [newItem, ...prev]);
      setSelectedProductId(newItem.id);
      setMode('Edición');
      setFeedbackMessage('¡Registro creado con éxito!');
    } else {
      setProductos(prev => prev.map(p => p.id === formData.id ? { ...formData } : p));
      setFeedbackMessage('¡Cambios guardados con éxito!');
    }

    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Botón Eliminar [🗑️]
  const handleDelete = () => {
    if (!selectedProductId) return;
    if (confirm(`¿Estás seguro de eliminar el registro "${formData.descripcion}"?`)) {
      setProductos(prev => prev.filter(p => p.id !== selectedProductId));
      const remaining = productos.filter(p => p.id !== selectedProductId);
      if (remaining.length > 0) {
        handleSelectRow(remaining[0]);
      } else {
        handleNew();
      }
      setFeedbackMessage('Registro eliminado correctamente.');
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
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
            ERP &nbsp;/&nbsp; RUC 20601123456 · Planta Lima
          </p>
          <span className="text-[11px] font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase">
            MANTENIMIENTOS
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Entidades maestras
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Todos los catálogos permiten crear, editar y eliminar registros con el mismo flujo.
          </p>
        </div>

        {/* Grupo de Botones de Acción [+] [💾] [✏️] [🗑️] [✖️] */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <button
            onClick={handleNew}
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

        {/* Card 2: Maestros */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>MAESTROS</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            15
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Catálogos disponibles
          </p>
        </div>

        {/* Card 3: En Pantalla */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>EN PANTALLA</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {displayedRecords.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registros listados
          </p>
        </div>

        {/* Card 4: Modo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
            <span>MODO</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {mode}
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {mode === 'Nuevo' ? 'Nuevo registro' : formData.descripcion || 'Sin seleccionar'}
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
                15 DE 15
              </p>
            </div>

            {/* Input Buscar catálogo */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar catálogo"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white placeholder-slate-400"
              />
            </div>

            {/* Lista de Catálogos */}
            <div className="space-y-1 max-h-[620px] overflow-y-auto pr-1">
              {filteredCatalogs.map(cat => {
                const isActive = activeCatalog.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCatalog(cat);
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
          
          {/* Ficha · [Nombre Catálogo] */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                Ficha · {activeCatalog.name}
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                {mode === 'Nuevo' ? 'CREANDO NUEVO REGISTRO' : `EDITANDO ${formData.descripcion.toUpperCase()}`}
              </p>
            </div>

            {/* Formulario Productos */}
            <div className="space-y-4">
              
              {/* Fila 1: Código, Descripción, Línea */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    CÓDIGO
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej. PP-1200"
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    DESCRIPCIÓN
                  </label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción del producto o entidad"
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    LÍNEA
                  </label>
                  <select
                    value={formData.linea}
                    onChange={e => setFormData({ ...formData, linea: e.target.value })}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  >
                    <option value="Películas PP">Películas PP</option>
                    <option value="Tuberias PVC">Tuberías PVC</option>
                    <option value="Gránulos ABS">Gránulos ABS</option>
                    <option value="Accesorios">Accesorios</option>
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
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  >
                    <option value="Pacifico">Pacifico</option>
                    <option value="Andino">Andino</option>
                    <option value="Global">Global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    UNIDAD
                  </label>
                  <select
                    value={formData.unidad}
                    onChange={e => setFormData({ ...formData, unidad: e.target.value })}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  >
                    <option value="ROLLO">ROLLO</option>
                    <option value="UND">UND</option>
                    <option value="BOLSA">BOLSA</option>
                    <option value="KGM">KGM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    ALMACÉN
                  </label>
                  <select
                    value={formData.almacen}
                    onChange={e => setFormData({ ...formData, almacen: e.target.value })}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  >
                    <option value="Central">Central</option>
                    <option value="Planta">Planta</option>
                    <option value="Tienda Sur">Tienda Sur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    P. COMPRA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pCompra}
                    onChange={e => setFormData({ ...formData, pCompra: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Fila 3: P. Venta, Stock, Stock Mínimo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    P. VENTA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pVenta}
                    onChange={e => setFormData({ ...formData, pVenta: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    STOCK
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
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
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Listado · [Nombre Catálogo] */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">
                  Listado · {activeCatalog.name}
                </h2>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {displayedRecords.length} DE {activeCatalog.count} REGISTROS
                </p>
              </div>

              {/* Input Filtrar registros */}
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Filtrar registros"
                  value={recordFilter}
                  onChange={e => setRecordFilter(e.target.value)}
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Tabla de registros */}
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
                  {displayedRecords.map(prod => {
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
                          {prod.pCompra.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          {prod.pVenta.toFixed(1)}
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
                  {displayedRecords.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No se encontraron registros coincidentes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default MantenimientosPage;
