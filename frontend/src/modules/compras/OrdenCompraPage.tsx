import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Package, Receipt, Building2, Trash2, CheckCircle
} from 'lucide-react';

interface ProductLine {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export const OrdenCompraPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const [products, setProducts] = useState<ProductLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputCant, setInputCant] = useState('');
  const [inputPrecio, setInputPrecio] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null);
  const [proveedorSearch, setProveedorSearch] = useState('');

  const proveedoresDB = [
    { nombre: 'TechSolutions S.A.C.', ruc: '20512345678', condicion: 'Contado' },
    { nombre: 'Dell Perú S.A.C.', ruc: '20123456789', condicion: '30 días' },
    { nombre: 'Logitech Latam S.R.L.', ruc: '20987654321', condicion: '15 días' },
    { nombre: 'HP Inc Perú S.A.', ruc: '20456789123', condicion: 'Contado' },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };
  
  // Base de datos simulada
  const productDB = [
    { id: '1', codigo: 'LAP-HP450', descripcion: 'Laptop HP ProBook 450 G8 15.6"', unidad: 'UNID' },
    { id: '2', codigo: 'MON-DELL27', descripcion: 'Monitor Dell UltraSharp 27 4K', unidad: 'UNID' },
    { id: '3', codigo: 'TEC-MXM', descripcion: 'Teclado Mecánico Logitech MX', unidad: 'UNID' },
  ];

  const handleAddProduct = () => {
    if (!searchQuery || !inputCant || !inputPrecio) return;
    
    const dbProduct = productDB.find(p => p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) || p.codigo.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const cant = parseFloat(inputCant);
    const precio = parseFloat(inputPrecio);
    
    if (isNaN(cant) || isNaN(precio) || cant <= 0 || precio <= 0) return;

    const newProduct: ProductLine = {
      id: Math.random().toString(),
      codigo: dbProduct ? dbProduct.codigo : 'GEN-001',
      descripcion: dbProduct ? dbProduct.descripcion : searchQuery,
      unidad: dbProduct ? dbProduct.unidad : 'UNID',
      cantidad: cant,
      precioUnitario: precio,
      importe: cant * precio
    };

    setProducts([...products, newProduct]);
    setSearchQuery('');
    setInputCant('');
    setInputPrecio('');
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const subtotal = products.reduce((acc, curr) => acc + curr.importe, 0);
  const descValue = parseFloat(descuentoGlobal) || 0;
  const subtotalConDescuento = subtotal - descValue;
  const igv = subtotalConDescuento * 0.18;
  const total = subtotalConDescuento + igv;

  const formatCurrency = (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSaveOrder = () => {
    if (products.length === 0) {
      showToast("No puedes grabar una orden vacía. Agrega al menos un producto.");
      return;
    }

    // Obtener los datos actuales del Dashboard desde localStorage
    const cached = localStorage.getItem('erp_dashboard_data');
    if (cached) {
      const dashboardData = JSON.parse(cached);
      
      // Actualizar total de compras
      dashboardData.comprasTotales += total;
      
      // Crear un nuevo movimiento para el dashboard
      const today = new Date();
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dateStr = `${today.getDate().toString().padStart(2, '0')} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
      
      const newMovement = {
        id: Date.now(),
        fecha: dateStr,
        descripcion: `Compra de componentes TI - Orden #${Math.floor(Math.random() * 900) + 100}`,
        tipo: 'salida',
        monto: total
      };

      // Agregar al inicio de la lista y mantener solo los últimos 4 o 5
      dashboardData.ultimosMovimientos = [newMovement, ...dashboardData.ultimosMovimientos].slice(0, 5);

      // Guardar de vuelta en localStorage
      localStorage.setItem('erp_dashboard_data', JSON.stringify(dashboardData));
    }

    showToast(`¡Orden por ${formatCurrency(total)} grabada exitosamente!`);
    
    // Limpiar el formulario
    setProducts([]);
    setDescuentoGlobal('');
    setSearchQuery('');
    setInputCant('');
    setInputPrecio('');
    setSelectedProveedor(null);
  };

  const handleNuevaCompra = () => {
    if (products.length > 0 || searchQuery || inputCant || inputPrecio || descuentoGlobal || selectedProveedor) {
      if (window.confirm('¿Estás seguro de limpiar la pantalla para crear una nueva orden?')) {
        setProducts([]);
        setSearchQuery('');
        setInputCant('');
        setInputPrecio('');
        setDescuentoGlobal('');
        setSelectedProveedor(null);
      }
    }
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
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-700' : 'bg-white border-gray-200 text-[#00b894] hover:bg-gray-50'
            }`}
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva compra
          </button>
          <button 
            onClick={handleSaveOrder}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg text-white transition-colors shadow-sm"
            style={{ backgroundColor: tealColor }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00a884'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = tealColor}
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
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all ${
                        darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-[#2d3436]'
                      }`}
                    />
                  </div>
                </div>
                <div className="w-full md:w-32">
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-300' : 'text-[#2d3436]'}`}>CANTIDAD</label>
                  <input 
                    type="number" 
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
                            <td className={`px-5 py-3.5 text-right text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{p.cantidad.toFixed(2)}</td>
                            <td className={`px-5 py-3.5 text-right text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{formatCurrency(p.precioUnitario)}</td>
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
                <p className={`text-[13px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Datos editables y operativos</p>
              </div>
              <Building2 className={`${darkMode ? 'text-slate-600' : 'text-gray-300'}`} size={20} />
            </div>
            
            {selectedProveedor ? (
              <div 
                className={`w-full p-4 rounded-xl border relative group cursor-pointer transition-all ${
                  darkMode ? 'border-teal-500/30 bg-teal-500/5 hover:border-teal-500/50' : 'border-[#00b894]/30 bg-[#00b894]/5 hover:border-[#00b894]/50'
                }`}
                onClick={() => setIsModalOpen(true)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-bold mb-1 ${darkMode ? 'text-teal-400' : 'text-[#00b894]'}`}>{selectedProveedor.nombre}</p>
                    <p className={`text-[12px] font-medium mb-0.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>RUC: {selectedProveedor.ruc}</p>
                    <p className={`text-[12px] ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Condición: {selectedProveedor.condicion}</p>
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
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-colors shadow-sm mb-4"
              style={{ backgroundColor: tealColor }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00a884'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = tealColor}
            >
              Grabar orden de compra
            </button>
            <p className={`text-[12px] leading-relaxed text-center px-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              Al grabar podrás decidir si la operación genera automáticamente el movimiento en Kardex.
            </p>
          </div>

        </div>
      </div>

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
                <div className="relative mb-6">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} size={18} />
                  <input 
                    type="text" 
                    placeholder="Proveedor / RUC" 
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
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>RUC</th>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>CONDICIÓN</th>
                        <th className={`px-5 py-3 text-xs font-bold border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>ESTADO</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                      {proveedoresDB.filter(p => 
                        p.nombre.toLowerCase().includes(proveedorSearch.toLowerCase()) || 
                        p.ruc.includes(proveedorSearch)
                      ).map(prov => (
                        <tr 
                          key={prov.ruc}
                          onClick={() => {
                            setSelectedProveedor(prov);
                            setIsModalOpen(false);
                            setProveedorSearch('');
                          }}
                          className={`cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className={`px-5 py-3.5 font-bold ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>{prov.nombre}</td>
                          <td className={`px-5 py-3.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{prov.ruc}</td>
                          <td className={`px-5 py-3.5 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{prov.condicion}</td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00b894]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00b894]"></span> Activo
                            </span>
                          </td>
                        </tr>
                      ))}
                      {proveedoresDB.filter(p => 
                        p.nombre.toLowerCase().includes(proveedorSearch.toLowerCase()) || 
                        p.ruc.includes(proveedorSearch)
                      ).length === 0 && (
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
