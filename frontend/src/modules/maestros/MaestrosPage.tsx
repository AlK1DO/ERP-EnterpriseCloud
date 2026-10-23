import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Warehouse, 
  Truck, 
  Users, 
  DollarSign, 
  CreditCard,
  Plus, 
  Search, 
  X, 
  Save, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2,
  TrendingUp,
  Tag
} from 'lucide-react';
import { 
  maestrosService, 
  type ProductoTech, 
  type AlmacenTech, 
  type VendedorTech, 
  type TransportistaTech,
  type FormaPagoTech,
  type MonedaTech,
  type ListaPrecioTech
} from '../../services/maestrosService';

type MaestroTab = 'productos' | 'almacenes' | 'comercial' | 'finanzas';

export const MaestrosPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MaestroTab>('productos');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('TODAS');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados de datos
  const [productos, setProductos] = useState<ProductoTech[]>(() => maestrosService.getProductos());
  const [almacenes, setAlmacenes] = useState<AlmacenTech[]>(() => maestrosService.getAlmacenes());
  const [vendedores, setVendedores] = useState<VendedorTech[]>(() => maestrosService.getVendedores());
  const [transportistas, setTransportistas] = useState<TransportistaTech[]>(() => maestrosService.getTransportistas());
  const [formasPago] = useState<FormaPagoTech[]>(() => maestrosService.getFormasPago());
  const [monedas, setMonedas] = useState<MonedaTech[]>(() => maestrosService.getMonedas());
  const [listasPrecios] = useState<ListaPrecioTech[]>(() => maestrosService.getListasPrecios());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form State para Productos
  const [formProd, setFormProd] = useState<Partial<ProductoTech>>({
    codigo: '', descripcion: '', linea: 'Monitores', marca: 'Dell', unidad: 'UND',
    almacen: 'Almacén Central', precioCompra: 0, precioVenta: 0, stock: 0, stockMinimo: 5, estado: 'Activo'
  });

  // Form State para Almacenes
  const [formAlm, setFormAlm] = useState<Partial<AlmacenTech>>({
    codigo: '', nombre: '', tipo: 'CENTRAL', direccion: '', responsable: '', telefono: '', estado: 'Activo'
  });

  // Form State para Vendedores
  const [formVen, setFormVen] = useState<Partial<VendedorTech>>({
    codigo: '', nombre: '', email: '', telefono: '', comisionPct: 3.0, metaMensual: 45000, zona: 'Lima Norte & Centro', estado: 'Activo'
  });

  // Mostrar mensaje temporal
  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Filtrado de productos
  const filteredProductos = useMemo(() => {
    return productos.filter(p => {
      const matchSearch = p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.marca.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === 'TODAS' || p.linea === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [productos, searchTerm, filterCategory]);

  // Manejadores de Productos
  const handleOpenNewProd = () => {
    setEditingItem(null);
    setFormProd({
      id: `p-${Date.now()}`,
      codigo: '',
      descripcion: '',
      linea: 'Monitores',
      marca: 'Dell',
      unidad: 'UND',
      almacen: 'Almacén Central',
      precioCompra: 0,
      precioVenta: 0,
      stock: 0,
      stockMinimo: 5,
      estado: 'Activo'
    });
    setIsModalOpen(true);
  };

  const handleSaveProd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProd.codigo || !formProd.descripcion) {
      alert('Código y descripción son obligatorios.');
      return;
    }
    const itemToSave: ProductoTech = {
      id: editingItem ? editingItem.id : `p-${Date.now()}`,
      codigo: formProd.codigo.toUpperCase(),
      descripcion: formProd.descripcion,
      linea: formProd.linea || 'Monitores',
      marca: formProd.marca || 'Dell',
      unidad: formProd.unidad || 'UND',
      almacen: formProd.almacen || 'Almacén Central',
      precioCompra: Number(formProd.precioCompra) || 0,
      precioVenta: Number(formProd.precioVenta) || 0,
      stock: Number(formProd.stock) || 0,
      stockMinimo: Number(formProd.stockMinimo) || 5,
      estado: formProd.estado || 'Activo'
    };
    const updated = maestrosService.saveProducto(itemToSave);
    setProductos(updated);
    setIsModalOpen(false);
    notify(editingItem ? 'Producto actualizado correctamente.' : 'Nuevo producto registrado en el ERP.');
  };

  const tcUsd = monedas.find(m => m.codigoIso === 'USD') || { tipoVenta: 3.758, tipoCompra: 3.742 };

  return (
    <div className="space-y-6">
      
      {/* Encabezado del Módulo Maestro */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                MÓDULO 01 · ARQUITECTURA DE DATOS MAESTROS
              </span>
              <span className="text-xs text-slate-400">Catálogos Transaccionales</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Gestión de Datos Maestros
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Administración de artículos de hardware, almacenes, equipo de ventas y condiciones financieras del ERP.
            </p>
          </div>

          {/* Tarjetas KPI Superiores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block">Artículos Tech</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{productos.length}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block">Almacenes</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{almacenes.length}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block">Vendedores</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{vendedores.length}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block">T.C. Venta Hoy</span>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">S/ {tcUsd.tipoVenta.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Notificación de feedback */}
        {feedback && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium animate-in fade-in">
            <CheckCircle2 size={16} />
            <span>{feedback}</span>
          </div>
        )}

        {/* Pestañas de Navegación del Módulo Maestro */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('productos')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'productos'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Package size={17} />
            <span>1. Artículos y Catálogo Hardware</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'productos' ? 'bg-blue-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {productos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('almacenes')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'almacenes'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Warehouse size={17} />
            <span>2. Almacenes y Sedes</span>
          </button>

          <button
            onClick={() => setActiveTab('comercial')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'comercial'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users size={17} />
            <span>3. Comercial y Despachos</span>
          </button>

          <button
            onClick={() => setActiveTab('finanzas')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'finanzas'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <DollarSign size={17} />
            <span>4. Finanzas y Condiciones</span>
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: CATÁLOGO DE HARDWARE */}
      {activeTab === 'productos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por código SKU, monitor, laptop, teclado, marca..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="text-xs sm:text-sm px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="TODAS">Todas las líneas</option>
                <option value="Monitores">Monitores</option>
                <option value="Laptops">Laptops</option>
                <option value="Teclados">Teclados</option>
                <option value="Mouses">Mouses</option>
                <option value="Almacenamiento">Almacenamiento</option>
                <option value="Memorias RAM">Memorias RAM</option>
              </select>

              <button
                onClick={handleOpenNewProd}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-colors"
              >
                <Plus size={16} />
                <span>Nuevo Artículo</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-3">CÓDIGO (SKU)</th>
                  <th className="py-3 px-3">DESCRIPCIÓN DEL ARTÍCULO</th>
                  <th className="py-3 px-3">LÍNEA</th>
                  <th className="py-3 px-3">MARCA</th>
                  <th className="py-3 px-3 text-center">U.M.</th>
                  <th className="py-3 px-3">ALMACÉN</th>
                  <th className="py-3 px-3 text-right">P. COMPRA</th>
                  <th className="py-3 px-3 text-right">P. VENTA</th>
                  <th className="py-3 px-3 text-right font-bold text-slate-700 dark:text-slate-200">STOCK</th>
                  <th className="py-3 px-3 text-center">ESTADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProductos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No se encontraron artículos con el filtro especificado.
                    </td>
                  </tr>
                ) : (
                  filteredProductos.map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{prod.codigo}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">{prod.descripcion}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                          {prod.linea}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">{prod.marca}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">{prod.unidad}</td>
                      <td className="py-3 px-3 text-slate-500">{prod.almacen}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">S/ {prod.precioCompra.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        S/ {prod.precioVenta.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                        {prod.stock}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          {prod.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ALMACENES & SEDES */}
      {activeTab === 'almacenes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Almacenes y Sedes del ERP</h3>
              <p className="text-xs text-slate-500">Puntos físicos de almacenamiento para control de inventario de equipos y garantías.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {almacenes.map(alm => (
              <div 
                key={alm.id}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{alm.codigo}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {alm.tipo}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">{alm.nombre}</h4>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{alm.direccion}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400 shrink-0" />
                      <span>Encargado: <strong className="text-slate-800 dark:text-slate-200">{alm.responsable}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>{alm.telefono}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-600">Estado: {alm.estado}</span>
                  <span className="text-[11px] text-slate-400 font-mono">ERP Central</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: COMERCIAL & DESPACHOS */}
      {activeTab === 'comercial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Vendedores & Metas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Fuerza de Ventas de Hardware</h3>
              <p className="text-xs text-slate-500">Asesores comerciales, porcentaje de comisión y cuotas mensuales de venta.</p>
            </div>

            <div className="space-y-3">
              {vendedores.map(v => (
                <div 
                  key={v.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600">{v.codigo}</span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{v.nombre}</h4>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">Zona asignada: {v.zona}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1"><Mail size={12} /> {v.email}</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> {v.telefono}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                      {v.comisionPct.toFixed(1)}% Comisión
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                      Meta: S/ {v.metaMensual.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Cuota Mensual</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transportistas & Couriers */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Transportistas y Couriers de Reparto</h3>
              <p className="text-xs text-slate-500">Empresas de despacho y unidades habilitadas para guías de remisión de equipos.</p>
            </div>

            <div className="space-y-3">
              {transportistas.map(t => (
                <div 
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t.razonSocial}</h4>
                    <span className="text-xs font-mono text-slate-400 block">RUC: {t.ruc}</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Vehículo: {t.vehiculoModelo}</span>
                    <span className="text-xs text-slate-500 block">Chofer: {t.conductor} (Lic. {t.brevete})</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 block">
                      {t.vehiculoPlaca}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">{t.telefono}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Habilitado</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* PESTAÑA 4: FINANZAS & CONDICIONES */}
      {activeTab === 'finanzas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Condiciones de Pago */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Formas y Plazos de Pago</h3>
            <p className="text-xs text-slate-500">Condiciones de crédito para ventas y compras en el ERP.</p>

            <div className="space-y-2 pt-2">
              {formasPago.map(fp => (
                <div key={fp.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">{fp.nombre}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{fp.codigo}</span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
                    {fp.diasCredito} días
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de Cambio Oficial */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Monedas y Tipo de Cambio</h3>
            <p className="text-xs text-slate-500">Cotización para importaciones de hardware y ventas en USD.</p>

            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 text-center space-y-2.5">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase block tracking-wider">
                Dólar Estadounidense (USD)
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-purple-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Compra</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono">
                    S/ {tcUsd.tipoCompra.toFixed(3)}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-purple-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Venta</span>
                  <span className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono">
                    S/ {tcUsd.tipoVenta.toFixed(3)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Fuente Oficial SBS / SUNAT</p>
            </div>
          </div>

          {/* Listas de Precios */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Listas de Precios de Hardware</h3>
            <p className="text-xs text-slate-500">Márgenes automáticos por canal de distribución.</p>

            <div className="space-y-2 pt-2">
              {listasPrecios.map(lp => (
                <div key={lp.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">{lp.nombre}</span>
                    <span className="text-[10px] text-slate-400">{lp.descripcion}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                    lp.ajustePct < 0 ? 'bg-emerald-100 text-emerald-800' :
                    lp.ajustePct === 0 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {lp.ajustePct > 0 ? `+${lp.ajustePct}%` : `${lp.ajustePct}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingItem ? 'Editar Artículo' : 'Nuevo Artículo de Hardware'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProd} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Código SKU *</label>
                  <input 
                    type="text" 
                    required 
                    value={formProd.codigo} 
                    onChange={e => setFormProd({ ...formProd, codigo: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    placeholder="Ej. MON-DELL27"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Línea / Categoría</label>
                  <select 
                    value={formProd.linea} 
                    onChange={e => setFormProd({ ...formProd, linea: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="Monitores">Monitores</option>
                    <option value="Laptops">Laptops</option>
                    <option value="Teclados">Teclados</option>
                    <option value="Mouses">Mouses</option>
                    <option value="Almacenamiento">Almacenamiento</option>
                    <option value="Memorias RAM">Memorias RAM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción del Equipo *</label>
                <input 
                  type="text" 
                  required 
                  value={formProd.descripcion} 
                  onChange={e => setFormProd({ ...formProd, descripcion: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium"
                  placeholder="Ej. Monitor Dell UltraSharp 27 4K IPS"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Marca</label>
                  <input 
                    type="text" 
                    value={formProd.marca} 
                    onChange={e => setFormProd({ ...formProd, marca: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                    placeholder="Dell, HP, Asus..."
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad</label>
                  <select 
                    value={formProd.unidad} 
                    onChange={e => setFormProd({ ...formProd, unidad: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-center"
                  >
                    <option value="UND">UND (Unidad)</option>
                    <option value="CAJA">CAJA</option>
                    <option value="PQT">PQT (Paquete)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Almacén</label>
                  <select 
                    value={formProd.almacen} 
                    onChange={e => setFormProd({ ...formProd, almacen: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="Almacén Central">Almacén Central</option>
                    <option value="Almacén Secundario">Almacén Secundario</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">P. Compra (S/)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formProd.precioCompra} 
                    onChange={e => setFormProd({ ...formProd, precioCompra: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">P. Venta (S/)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formProd.precioVenta} 
                    onChange={e => setFormProd({ ...formProd, precioVenta: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Stock Disponible</label>
                  <input 
                    type="number" 
                    value={formProd.stock} 
                    onChange={e => setFormProd({ ...formProd, stock: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Stock Mínimo</label>
                  <input 
                    type="number" 
                    value={formProd.stockMinimo} 
                    onChange={e => setFormProd({ ...formProd, stockMinimo: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors"
                >
                  <Save size={15} />
                  <span>Guardar Artículo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
