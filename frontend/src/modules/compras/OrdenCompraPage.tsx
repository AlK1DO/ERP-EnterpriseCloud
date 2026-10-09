import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Save, Search, Package, Receipt, Info, Building2, Trash2, ArrowRight
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
  const [descuentoGlobal, setDescuentoGlobal] = useState('0.00');
  
  // Dummy data for products
  const productDB = [
    { id: '1', codigo: 'PP-1200', descripcion: 'Pelicula polipropileno 1.2mm', unidad: 'KG' },
    { id: '2', codigo: 'ABS-25', descripcion: 'Gránulo ABS virgen 25kg', unidad: 'SACO' },
    { id: '3', codigo: 'PEL-001', descripcion: 'Pelicula stretch industrial 25mm', unidad: 'ROLLO' },
  ];

  const handleAddProduct = () => {
    if (!searchQuery || !inputCant || !inputPrecio) return;
    
    // Simular búsqueda en BD
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

  // Calculations
  const subtotal = products.reduce((acc, curr) => acc + curr.importe, 0);
  const descValue = parseFloat(descuentoGlobal) || 0;
  const subtotalConDescuento = subtotal - descValue;
  const igv = subtotalConDescuento * 0.18;
  const total = subtotalConDescuento + igv;

  const formatCurrency = (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto pb-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            <span className="text-blue-500">ERP</span>
            <ArrowRight size={10} />
            <span>Compras</span>
            <ArrowRight size={10} />
            <span>Consulta</span>
          </div>
          <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Orden de compra
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Gestiona proveedores, productos, cantidades, descuentos y totales desde un flujo centralizado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Plus size={16} />
            Nueva compra
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20">
            <Save size={16} />
            Grabar orden
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Left Column - Forms */}
        <div className="flex-1 w-full space-y-6">
          
          {/* 01. Detalle de productos */}
          <div className={`rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} overflow-hidden`}>
            <div className={`px-6 py-4 border-b flex items-center gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Detalle de productos</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{products.length} items registrados. Solo cantidad y precio son editables.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Add Product Form */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>PRODUCTO</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Seleccionar producto" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-teal-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-teal-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="w-full md:w-32">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>CANTIDAD</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={inputCant}
                    onChange={(e) => setInputCant(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-teal-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-teal-500'
                    }`}
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>PRECIO UNITARIO</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={inputPrecio}
                    onChange={(e) => setInputPrecio(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-teal-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-teal-500'
                    }`}
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleAddProduct}
                    className="h-[42px] px-5 flex items-center gap-2 rounded-lg bg-teal-500 text-white font-semibold text-sm hover:bg-teal-600 transition-colors"
                  >
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className={`mt-6 border rounded-xl overflow-hidden ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <table className="w-full text-left text-sm">
                  <thead className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                    <tr>
                      <th className="px-4 py-3 border-b border-inherit">CÓDIGO</th>
                      <th className="px-4 py-3 border-b border-inherit">DESCRIPCIÓN</th>
                      <th className="px-4 py-3 border-b border-inherit">UNIDAD</th>
                      <th className="px-4 py-3 border-b border-inherit text-right">CANT.</th>
                      <th className="px-4 py-3 border-b border-inherit text-right">P. UNITARIO</th>
                      <th className="px-4 py-3 border-b border-inherit text-right">IMPORTE</th>
                      <th className="px-4 py-3 border-b border-inherit w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    <AnimatePresence>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center">
                            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                              <Package size={24} />
                            </div>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No hay productos agregados a la orden.</p>
                          </td>
                        </tr>
                      ) : (
                        products.map((p) => (
                          <motion.tr 
                            initial={{ opacity: 0, backgroundColor: 'rgba(20, 184, 166, 0.2)' }}
                            animate={{ opacity: 1, backgroundColor: 'transparent' }}
                            exit={{ opacity: 0, height: 0 }}
                            key={p.id} 
                            className={`group transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                          >
                            <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                            <td className="px-4 py-3 font-medium">{p.descripcion}</td>
                            <td className="px-4 py-3 text-xs">{p.unidad}</td>
                            <td className="px-4 py-3 text-right">{p.cantidad.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(p.precioUnitario)}</td>
                            <td className="px-4 py-3 text-right font-bold">{formatCurrency(p.importe)}</td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => removeProduct(p.id)}
                                className="text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
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
          <div className={`rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} overflow-hidden`}>
            <div className={`px-6 py-4 border-b flex items-center gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Condiciones económicas</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Descuentos y valores aplicados a la operación.</p>
              </div>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Descuento global</label>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">PEN</span>
                </div>
                <p className={`text-xs mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Se aplica antes de calcular el IGV</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">S/</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={descuentoGlobal}
                    onChange={(e) => setDescuentoGlobal(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-teal-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-teal-500'
                    }`}
                  />
                </div>
              </div>
              <div className={`p-4 rounded-xl border flex gap-3 ${darkMode ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
                <Receipt className="text-blue-500 shrink-0" size={20} />
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Verifica cantidades y precios directamente en la tabla. Los importes y el total se actualizan automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-6">
          
          {/* Proveedor */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Datos del proveedor</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Datos editables y operativos</p>
              </div>
              <Building2 className="text-slate-400" size={20} />
            </div>
            
            <button className={`w-full py-4 px-4 rounded-xl border-2 border-dashed flex items-center gap-3 transition-colors ${
              darkMode ? 'border-slate-700 hover:border-teal-500/50 hover:bg-slate-800/50' : 'border-slate-200 hover:border-teal-500/50 hover:bg-slate-50'
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <Search size={18} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-700'}`}>Seleccionar un proveedor</p>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Usa Buscar proveedor para cargar los datos.</p>
              </div>
            </button>
          </div>

          {/* Resumen */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Resumen de la orden</h3>
            <p className={`text-xs mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cálculo automático de la operación</p>

            <div className={`space-y-3 pb-4 border-b text-sm ${darkMode ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'}`}>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>Descuento</span>
                <span>- {formatCurrency(descValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>IGV (18%)</span>
                <span className="font-medium">{formatCurrency(igv)}</span>
              </div>
              <div className="flex justify-between">
                <span>Otros cargos</span>
                <span className="font-medium">S/ 0.00</span>
              </div>
            </div>

            <div className="pt-4 mb-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>TOTAL ORDEN</p>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">PEN</span>
                </div>
                <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <button className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold transition-colors shadow-sm shadow-teal-500/20 mb-3">
              Grabar orden de compra
            </button>
            <p className={`text-[11px] leading-relaxed text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Al grabar podrás decidir si la operación genera automáticamente el movimiento en Kardex.
            </p>
          </div>

        </div>
      </div>
    </motion.div>
  );
};
