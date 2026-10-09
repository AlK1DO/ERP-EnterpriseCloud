import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Package, Receipt, Users, Trash2, CheckCircle
} from 'lucide-react';

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
  const [products, setProducts] = useState<ProductLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputCant, setInputCant] = useState('');
  const [stockDisp, setStockDisp] = useState<number | ''>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [clienteSearch, setClienteSearch] = useState('');

  // Base de datos simulada de clientes
  const clientesDB = [
    { nombre: 'Corporación Tecnológica S.A.C.', ruc: '20111111111', condicion: 'Crédito 30 días', tipo: 'Corporativo' },
    { nombre: 'Universidad Nacional Mayor', ruc: '20222222222', condicion: 'Contado', tipo: 'Educación' },
    { nombre: 'Grupo Retail del Perú', ruc: '20333333333', condicion: 'Crédito 15 días', tipo: 'Retail' },
    { nombre: 'Consultores TI Asociados', ruc: '20444444444', condicion: 'Contado', tipo: 'Servicios' },
    { nombre: 'Julio Yanavelca Yanavilca', ruc: '10748596123', condicion: 'Contado', tipo: 'Persona Natural' },
  ];

  // Base de datos de productos persistente en localStorage para descontar stock
  const [productDB, setProductDB] = useState<any[]>(() => {
    const cached = localStorage.getItem('erp_products_db');
    if (cached) return JSON.parse(cached);
    
    const initialDB = [
      { id: '1', codigo: 'LAP-HP450', descripcion: 'Laptop HP ProBook 450 G8 15.6"', precioVenta: 4200.00, stock: 45 },
      { id: '2', codigo: 'MON-DELL27', descripcion: 'Monitor Dell UltraSharp 27 4K', precioVenta: 1850.00, stock: 30 },
      { id: '3', codigo: 'TEC-MXM', descripcion: 'Teclado Mecánico Logitech MX', precioVenta: 450.00, stock: 20 },
    ];
    localStorage.setItem('erp_products_db', JSON.stringify(initialDB));
    return initialDB;
  });

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
    
    const dbProduct = productDB.find(p => p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) || p.codigo.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const cant = parseFloat(inputCant);
    
    if (isNaN(cant) || cant <= 0) return;
    
    // Calcular cuánto stock ya hemos metido a la orden para no sobrepasar el límite
    const currentAdded = products.filter(p => p.codigo === (dbProduct?.codigo || 'GEN-001')).reduce((acc, curr) => acc + curr.cantidad, 0);

    if (dbProduct && (cant + currentAdded) > dbProduct.stock) {
      showToast(`¡Error! Solo te quedan ${dbProduct.stock - currentAdded} unidades disponibles para agregar.`);
      return;
    }

    const precio = dbProduct ? dbProduct.precioVenta : 100; // Precio genérico si no existe

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
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const subtotal = products.reduce((acc, curr) => acc + curr.importe, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  const formatCurrency = (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSaveOrder = () => {
    if (products.length === 0) {
      showToast("No puedes grabar una orden vacía. Agrega al menos un producto.");
      return;
    }

    if (!selectedCliente) {
      showToast("Debes seleccionar un cliente para generar la orden.");
      return;
    }

    // 1. Descontar Stock de los productos y guardar en localStorage
    const updatedDB = productDB.map(dbProd => {
      // Sumamos la cantidad de este producto en la orden actual
      const soldQuantity = products
        .filter(p => p.codigo === dbProd.codigo)
        .reduce((acc, curr) => acc + curr.cantidad, 0);
        
      if (soldQuantity > 0) {
        return { ...dbProd, stock: dbProd.stock - soldQuantity };
      }
      return dbProd;
    });
    
    setProductDB(updatedDB);
    localStorage.setItem('erp_products_db', JSON.stringify(updatedDB));

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
        descripcion: `Venta a ${selectedCliente.nombre.substring(0, 15)}... - Orden #${Math.floor(Math.random() * 900) + 100}`,
        tipo: 'ingreso',
        monto: total
      };

      dashboardData.ultimosMovimientos = [newMovement, ...dashboardData.ultimosMovimientos].slice(0, 5);
      localStorage.setItem('erp_dashboard_data', JSON.stringify(dashboardData));
    }

    // 3. Guardar la Orden de Venta en la base de datos de órdenes
    const cachedOrders = localStorage.getItem('erp_ordenes_venta');
    const ordersDB = cachedOrders ? JSON.parse(cachedOrders) : [];
    
    // Formatear items para que coincidan con la estructura que espera Facturación
    const orderItems = products.map(p => ({
      desc: p.descripcion,
      cant: p.cantidad,
      pUnitario: p.precioVenta,
      total: p.cantidad * p.precioVenta
    }));

    const newOrder = {
      id: `OV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
      cliente: selectedCliente.nombre,
      ruc: selectedCliente.ruc,
      fecha: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
      total: total,
      vendedor: 'Vendedor Actual',
      items: orderItems,
      estado: 'Pendiente'
    };
    
    localStorage.setItem('erp_ordenes_venta', JSON.stringify([newOrder, ...ordersDB]));

    showToast(`¡Orden de Venta por S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} grabada exitosamente!`);
    
    setProducts([]);
    setSearchQuery('');
    setInputCant('');
    setStockDisp('');
    setSelectedCliente(null);
  };

  const handleNuevaVenta = () => {
    if (products.length > 0 || searchQuery || inputCant || selectedCliente) {
      if (window.confirm('¿Estás seguro de limpiar la pantalla para crear una nueva venta?')) {
        setProducts([]);
        setSearchQuery('');
        setInputCant('');
        setStockDisp('');
        setSelectedCliente(null);
      }
    }
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
            onClick={handleNuevaVenta}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-slate-700' : 'bg-white border-gray-200 text-sky-500 hover:bg-gray-50'
            }`}
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva venta
          </button>
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
                      placeholder="Seleccionar producto" 
                      value={searchQuery}
                      onChange={(e) => handleProductSearch(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all ${
                        darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-[#2d3436]'
                      }`}
                    />
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
                className={`w-full p-4 rounded-xl border relative group cursor-pointer transition-all ${
                  darkMode ? 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50' : 'border-sky-500/30 bg-sky-50 hover:border-sky-500/50'
                }`}
                onClick={() => setIsModalOpen(true)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-bold mb-1 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>{selectedCliente.nombre}</p>
                    <p className={`text-[12px] font-medium mb-0.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>RUC: {selectedCliente.ruc}</p>
                    <p className={`text-[12px] ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Condición: {selectedCliente.condicion}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Search size={14} />
                  </div>
                </div>
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
              className={`relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
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
                    placeholder="Cliente / RUC" 
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-[#2d3436]'
                    }`}
                  />
                </div>

                <div className={`border rounded-xl overflow-hidden ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                  <table className="w-full text-left text-sm">
                    <thead className={`${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>CLIENTE</th>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>RUC</th>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>CONDICIÓN</th>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>TIPO</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                      {clientesDB.filter(c => 
                        c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || 
                        c.ruc.includes(clienteSearch)
                      ).map(cli => (
                        <tr 
                          key={cli.ruc}
                          onClick={() => {
                            setSelectedCliente(cli);
                            setIsModalOpen(false);
                            setClienteSearch('');
                          }}
                          className={`cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className={`px-5 py-3.5 font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>{cli.nombre}</td>
                          <td className={`px-5 py-3.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{cli.ruc}</td>
                          <td className={`px-5 py-3.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{cli.condicion}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              darkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'
                            }`}>
                              {cli.tipo}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {clientesDB.filter(c => 
                        c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || 
                        c.ruc.includes(clienteSearch)
                      ).length === 0 && (
                        <tr>
                          <td colSpan={4} className={`px-5 py-8 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            No se encontraron clientes.
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
