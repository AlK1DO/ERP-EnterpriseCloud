import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Package, Receipt, Users, Trash2, CheckCircle, ArrowRight
} from 'lucide-react';
import { inventarioService, type Producto } from '../../services/inventarioService';
import { clientesService } from '../../services/clientesService';
import { ventasService } from '../../services/ventasService';

interface ProductLine {
  id: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioVenta: number;
  importe: number;
}

export const OrdenVentaPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputCant, setInputCant] = useState('');
  const [stockDisp, setStockDisp] = useState<number | ''>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedOrderAlert, setSavedOrderAlert] = useState<{
    ovId: string;
    total: number;
    cliente: string;
  } | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [clienteSearch, setClienteSearch] = useState('');

  // Clientes desde Supabase con información completa
  const [clientesDB, setClientesDB] = useState<any[]>([]);
  // Base de datos de productos desde inventarioService
  const [productDB, setProductDB] = useState<Producto[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  useEffect(() => {
    inventarioService.getProductos().then(prods => {
      setProductDB(prods);
    });
    clientesService.getClientes().then(cls => {
      setClientesDB(cls.map(c => ({
        id: c.id,
        nombre: c.nombre,
        tipo_persona: c.tipo_persona,
        tipo_documento: c.documento?.length === 8 ? 'DNI' : 'RUC',
        documento: c.documento,
        ruc: c.documento,
        telefono: c.telefono || 'Sin teléfono',
        email: c.email || 'Sin correo',
        direccion: c.direccion || 'Sin dirección',
        condicion: c.limite_credito > 0 ? `Crédito (S/ ${c.limite_credito})` : 'Contado',
        tipo: c.tipo_persona === 'JURIDICA' ? 'Persona Jurídica' : 'Persona Natural',
        estado: c.estado || 'Activo'
      })));
    });
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return productDB.slice(0, 8);
    return productDB.filter(p => 
      p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.categoria && p.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 8);
  }, [productDB, searchQuery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Simular la búsqueda de stock cuando el usuario escribe
  const handleProductSearch = (val: string) => {
    setSearchQuery(val);
    const found = productDB.find(p => p.descripcion.toLowerCase().includes(val.toLowerCase()) || p.codigo.toLowerCase().includes(val.toLowerCase()));
    if (found && val.length > 2) {
      setStockDisp(found.stock);
    } else {
      setStockDisp('');
    }
  };

  const handleAddProduct = () => {
    if (!searchQuery || !inputCant) return;
    
    const dbProduct = selectedProduct || productDB.find(p => p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) || p.codigo.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const cant = parseFloat(inputCant);
    
    if (isNaN(cant) || cant <= 0) return;
    
    // Calcular cuánto stock ya hemos metido a la orden para no sobrepasar el límite
    const currentAdded = products.filter(p => p.codigo === (dbProduct?.codigo || 'GEN-001')).reduce((acc, curr) => acc + curr.cantidad, 0);

    if (dbProduct && (cant + currentAdded) > dbProduct.stock) {
      showToast(`¡Error! Solo te quedan ${dbProduct.stock - currentAdded} unidades disponibles para agregar.`);
      return;
    }

    const precio = dbProduct ? dbProduct.precioVenta : 100;

    const newProduct: ProductLine = {
      id: Math.random().toString(),
      codigo: dbProduct ? dbProduct.codigo : 'GEN-001',
      descripcion: dbProduct ? dbProduct.descripcion : searchQuery,
      cantidad: cant,
      precioVenta: precio,
      importe: cant * precio
    };

    setProducts([...products, newProduct]);
    setSearchQuery('');
    setInputCant('');
    setStockDisp('');
    setSelectedProduct(null);
    setShowProductDropdown(false);
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const subtotal = products.reduce((acc, curr) => acc + curr.importe, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  const formatCurrency = (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSaveOrder = async () => {
    if (products.length === 0) {
      showToast("No puedes grabar una orden vacía. Agrega al menos un producto.");
      return;
    }

    if (!selectedCliente) {
      showToast("Debes seleccionar un cliente para generar la orden.");
      return;
    }

    const ovId = `OV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

    // 1. Descontar stock y registrar movimiento en Kardex por cada item
    for (const prod of products) {
      const match = productDB.find(p => p.codigo === prod.codigo);
      if (match) {
        try {
          await inventarioService.registrarMovimiento({
            productoId: match.id,
            productoCodigo: match.codigo,
            productoDescripcion: match.descripcion,
            tipoMovimiento: 'SALIDA',
            tipoOperacion: 'VENTA',
            documentoTipo: 'ORDEN DE VENTA',
            documentoNumero: ovId,
            detalle: `Salida por venta a ${selectedCliente.nombre}`,
            almacen: match.almacen || 'Almacén Central',
            cantidad: prod.cantidad,
            costoUnitario: match.costoUnitario
          });
        } catch (err: any) {
          showToast(`Error al descontar stock: ${err.message}`);
          return;
        }
      }
    }

    // Refrescar lista de productos con nuevo stock
    const prodsActualizados = await inventarioService.getProductos();
    setProductDB(prodsActualizados);

    // 2. Actualizar KPIs y Movimientos en el Dashboard
    const cached = localStorage.getItem('erp_dashboard_data');
    if (cached) {
      const dashboardData = JSON.parse(cached);
      dashboardData.ventasTotales += total;
      
      const today = new Date();
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dateStr = `${today.getDate().toString().padStart(2, '0')} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
      
      const newMovement = {
        id: Date.now(),
        fecha: dateStr,
        descripcion: `Venta a ${selectedCliente.nombre.substring(0, 15)}... - ${ovId}`,
        tipo: 'ingreso',
        monto: total
      };

      dashboardData.ultimosMovimientos = [newMovement, ...(dashboardData.ultimosMovimientos || [])].slice(0, 5);
      localStorage.setItem('erp_dashboard_data', JSON.stringify(dashboardData));
    }

    // 3. Guardar la venta en Supabase como Pendiente con el número de orden unificado
    try {
      await ventasService.createVenta({
        numero: ovId,
        cliente_id: selectedCliente.id || 'cli-generic',
        cliente_nombre: selectedCliente.nombre,
        fecha: new Date().toISOString(),
        metodo_pago: 'Efectivo',
        moneda: 'PEN',
        items: products.map(p => ({
          id: p.id,
          descripcion: p.descripcion,
          cantidad: p.cantidad,
          precio_unitario: p.precioVenta,
          subtotal: p.importe
        })),
        estado: 'Pendiente',
        notas: `Orden de venta ${ovId}`
      });
    } catch (e) {
      console.error('Error al guardar venta en Supabase:', e);
    }

    // Guardar en almacenamiento local sincronizado con el MISMO identificador (sin duplicar)
    const cachedOrders = localStorage.getItem('erp_ordenes_venta');
    const ordersDB = cachedOrders ? JSON.parse(cachedOrders) : [];
    
    const orderItems = products.map(p => ({
      desc: p.descripcion,
      cant: p.cantidad,
      pUnitario: p.precioVenta,
      total: p.cantidad * p.precioVenta
    }));

    const newOrder = {
      id: ovId,
      cliente: selectedCliente.nombre,
      ruc: selectedCliente.ruc || selectedCliente.documento,
      fecha: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
      total: total,
      items: orderItems,
      estado: 'Pendiente'
    };
    
    const filteredLocal = ordersDB.filter((o: any) => o.id !== ovId && o.id !== `VEN-${ovId.replace('OV-2026-', '')}`);
    localStorage.setItem('erp_ordenes_venta', JSON.stringify([newOrder, ...filteredLocal]));

    showToast(`¡Orden de Venta ${ovId} grabada con éxito! Se envió al módulo de FACTURACIÓN para la emisión del comprobante.`);
    
    setProducts([]);
    setSearchQuery('');
    setInputCant('');
    setStockDisp('');
    setSelectedCliente(null);
  };

  // Colores (Usaremos un azul principal para diferenciarlo de compras que es teal)
  const mainColor = '#0ea5e9'; // sky-500
  const badgeColor = '#38bdf8'; // sky-400
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto pb-10 font-sans"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 mt-2">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 text-blue-500">
            <span>ERP</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span>VENTAS</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span className="text-gray-400 dark:text-slate-500">CONSULTA</span>
          </div>
          <h1 className={`text-[26px] font-bold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>
            Orden de venta
          </h1>
          <p className={`mt-2 text-[13px] ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Valida stock, calcula importes y envía la orden a facturación.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveOrder}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg text-white transition-colors shadow-sm"
            style={{ backgroundColor: mainColor }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = mainColor}
          >
            <Receipt size={16} strokeWidth={2.5} />
            Grabar orden
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column - Forms */}
        <div className="flex-1 w-full space-y-6">
          
          {/* 01. Detalle de productos */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm overflow-hidden`}>
            <div className="px-6 py-4 flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
                style={{ backgroundColor: badgeColor }}
              >
                01
              </div>
              <div>
                <h3 className={`text-[17px] font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Detalle de productos</h3>
                <p className={`text-[13px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Validación de stock en tiempo real.</p>
              </div>
            </div>

            <div className="p-6 pt-2">
              <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                <div className="flex-1">
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>PRODUCTO</label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`} size={16} />
                    <input 
                      type="text" 
                      placeholder="Seleccionar o buscar producto..." 
                      value={searchQuery}
                      onChange={(e) => {
                        handleProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all ${
                        darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-[#2d3436]'
                      }`}
                    />

                    {/* Dropdown de opciones de productos */}
                    {showProductDropdown && (
                      <div className={`absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl shadow-2xl border overflow-hidden max-h-64 overflow-y-auto ${
                        darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
                      }`}>
                        {filteredProducts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-500">
                            No se encontraron productos coincidentes. Puedes crearlos en <strong className="text-sky-600">Mantenimientos</strong>.
                          </div>
                        ) : (
                          filteredProducts.map((p) => (
                            <div
                              key={p.id}
                              onMouseDown={() => {
                                setSelectedProduct(p);
                                setSearchQuery(p.descripcion);
                                setStockDisp(p.stock);
                                setShowProductDropdown(false);
                              }}
                              className={`p-3 border-b last:border-b-0 cursor-pointer flex items-center justify-between transition-colors ${
                                darkMode ? 'border-slate-800 hover:bg-slate-800/80' : 'border-gray-100 hover:bg-sky-50/60'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                                    {p.codigo}
                                  </span>
                                  <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {p.descripcion}
                                  </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                  {p.categoria} • Stock disponible: <span className="font-bold text-sky-600">{p.stock} {p.unidad}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs font-bold ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                                  S/ {p.precioVenta.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-32">
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>CANTIDAD</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={inputCant}
                    onChange={(e) => setInputCant(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-[#2d3436]'
                    }`}
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>STOCK DISP. (UND)</label>
                  <input 
                    type="text" 
                    placeholder="0.00" 
                    readOnly
                    value={stockDisp}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none cursor-not-allowed ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-500'
                    }`}
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleAddProduct}
                    className="h-[42px] px-6 flex items-center gap-2 rounded-lg text-white font-bold text-sm transition-colors shadow-sm"
                    style={{ backgroundColor: badgeColor }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = mainColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = badgeColor}
                  >
                    <Plus size={18} /> Agregar
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className={`border rounded-xl overflow-hidden min-h-[250px] ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                <table className="w-full text-left text-sm">
                  <thead className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                    <tr>
                      <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>CÓDIGO</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>DESCRIPCIÓN</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b text-right ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>CANT.</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b text-right ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>P. VENTA</th>
                      <th className={`px-5 py-3 text-xs font-bold border-b text-right ${darkMode ? 'text-slate-300 border-slate-800' : 'text-[#2d3436] border-gray-200'}`}>IMPORTE</th>
                      <th className={`px-3 py-3 border-b w-10 ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}></th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800 bg-slate-900' : 'divide-gray-100 bg-white'}`}>
                    <AnimatePresence>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-20 text-center">
                            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-gray-50 text-gray-300'}`}>
                              <Package size={28} />
                            </div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Sin productos en el detalle</p>
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
                            <td className={`px-5 py-3.5 text-right text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{p.cantidad.toFixed(2)}</td>
                            <td className={`px-5 py-3.5 text-right text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{formatCurrency(p.precioVenta)}</td>
                            <td className={`px-5 py-3.5 text-right text-sm font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>{formatCurrency(p.importe)}</td>
                            <td className="px-3 py-3.5">
                              <button 
                                onClick={() => removeProduct(p.id)}
                                className={`transition-colors opacity-0 group-hover:opacity-100 ${darkMode ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
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
        </div>

        {/* Right Column - Summary */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-6">
          
          {/* Cliente */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Datos del cliente</h3>
                <p className={`text-[13px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Información de la operación</p>
              </div>
              <Users className={`${darkMode ? 'text-slate-600' : 'text-gray-300'}`} size={20} />
            </div>
            
            {selectedCliente ? (
              <div 
                className={`w-full p-4 rounded-xl border relative transition-all ${
                  darkMode ? 'border-sky-500/30 bg-sky-500/5' : 'border-sky-500/30 bg-sky-50/70'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                      selectedCliente.tipo_persona === 'JURIDICA'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}>
                      {selectedCliente.tipo_persona === 'JURIDICA' ? 'Persona Jurídica' : 'Persona Natural'}
                    </span>
                    <h4 className={`text-sm font-bold leading-snug ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {selectedCliente.nombre}
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-1.5 rounded-lg border text-sky-600 hover:bg-sky-100/50 dark:border-slate-700 dark:text-sky-400 dark:hover:bg-slate-800 transition-colors shrink-0"
                    title="Cambiar cliente"
                  >
                    <Search size={14} />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs pt-2 border-t border-sky-100 dark:border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Documento:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {selectedCliente.tipo_documento || 'RUC'}: {selectedCliente.ruc || selectedCliente.documento}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Teléfono:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {selectedCliente.telefono || 'Sin registrar'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Correo:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px]" title={selectedCliente.email}>
                      {selectedCliente.email || 'Sin correo'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Dirección:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px]" title={selectedCliente.direccion}>
                      {selectedCliente.direccion || 'Sin dirección'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Condición:</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {selectedCliente.condicion || 'Contado'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full mt-3 py-1.5 text-center text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline bg-sky-100/50 dark:bg-sky-950/40 rounded-lg transition-colors"
                >
                  Cambiar cliente seleccionado
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsModalOpen(true)}
                className={`w-full py-3.5 px-4 rounded-xl border flex items-center gap-3 transition-all shadow-sm ${
                  darkMode ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  <Users size={16} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Seleccionar un cliente</p>
                  <p className={`text-[12px] ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Usa Buscar cliente para cargar los datos.</p>
                </div>
              </button>
            )}
          </div>

          {/* Resumen */}
          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} rounded-2xl border shadow-sm p-6`}>
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Resumen de la orden</h3>
            <p className={`text-[13px] mt-0.5 mb-6 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Cálculo automático</p>

            <div className={`space-y-3.5 pb-5 border-b text-[14px] ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`flex justify-between ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                <span>Subtotal</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>{formatCurrency(subtotal)}</span>
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
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-colors shadow-sm mb-4"
              style={{ backgroundColor: badgeColor }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = mainColor}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = badgeColor}
            >
              Grabar orden de venta
            </button>
            <p className={`text-[12px] leading-relaxed text-center px-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              Al grabar podrás decidir si la operación pasa a facturación.
            </p>
          </div>

        </div>
      </div>

      {/* Modal Buscar Cliente */}
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
              className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
            >
              <div className={`px-6 py-4 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-sky-400' : 'bg-sky-50 text-sky-500'}`}>
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>Buscar cliente</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Busca un cliente registrado para emitir la orden.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className={`text-gray-400 hover:text-gray-600 transition-colors ${darkMode ? 'hover:text-white' : ''}`}
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <div className="relative mb-6">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} size={18} />
                  <input 
                    type="text" 
                    placeholder="Cliente / RUC / DNI / Correo" 
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-[#2d3436]'
                    }`}
                  />
                </div>

                <div className={`border rounded-xl overflow-hidden ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className={`${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`w-[28%] px-4 py-3 font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>CLIENTE / TIPO</th>
                        <th className={`w-[14%] px-4 py-3 font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>DOCUMENTO</th>
                        <th className={`w-[22%] px-4 py-3 font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>CONTACTO</th>
                        <th className={`w-[18%] px-4 py-3 font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>DIRECCIÓN</th>
                        <th className={`w-[10%] px-4 py-3 font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>CONDICIÓN</th>
                        <th className={`w-[8%] px-4 py-3 font-bold border-b text-center ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>ESTADO</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                      {clientesDB.filter(c => 
                        c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || 
                        (c.documento && c.documento.includes(clienteSearch)) ||
                        (c.ruc && c.ruc.includes(clienteSearch)) ||
                        (c.email && c.email.toLowerCase().includes(clienteSearch.toLowerCase())) ||
                        (c.telefono && c.telefono.includes(clienteSearch))
                      ).map(cli => (
                        <tr 
                          key={cli.id || cli.documento || cli.ruc}
                          onClick={() => {
                            setSelectedCliente(cli);
                            setIsModalOpen(false);
                            setClienteSearch('');
                          }}
                          className={`cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-sky-50/50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <p className={`font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`} title={cli.nombre}>{cli.nombre}</p>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-0.5 ${
                              cli.tipo_persona === 'JURIDICA'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}>
                              {cli.tipo_persona === 'JURIDICA' ? 'Persona Jurídica' : 'Persona Natural'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {cli.tipo_documento || (cli.documento?.length === 8 ? 'DNI' : 'RUC')}: {cli.documento || cli.ruc}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            <p className="font-medium text-slate-700 dark:text-slate-300">{cli.telefono}</p>
                            <p className="text-[10px] text-slate-400 truncate" title={cli.email}>{cli.email}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            <p className="truncate text-xs" title={cli.direccion}>{cli.direccion}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                            {cli.condicion}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {cli.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {clientesDB.filter(c => 
                        c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || 
                        (c.documento && c.documento.includes(clienteSearch)) ||
                        (c.ruc && c.ruc.includes(clienteSearch))
                      ).length === 0 && (
                        <tr>
                          <td colSpan={6} className={`px-5 py-8 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            No se encontraron clientes registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`px-6 py-4 border-t flex justify-end ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setClienteSearch('');
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
