import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Package, Receipt, Building2, Trash2
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
  const [products, setProducts] = useState<ProductLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputCant, setInputCant] = useState('');
  const [inputPrecio, setInputPrecio] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState('');
  
  // Base de datos simulada
  const productDB = [
    { id: '1', codigo: 'PP-1200', descripcion: 'Pelicula polipropileno 1.2mm', unidad: 'KG' },
    { id: '2', codigo: 'ABS-25', descripcion: 'Gránulo ABS virgen 25kg', unidad: 'SACO' },
    { id: '3', codigo: 'PEL-001', descripcion: 'Pelicula stretch industrial 25mm', unidad: 'ROLLO' },
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

  // Colores principales de la imagen
  const tealColor = '#00b894';
  const tealBadge = '#78e08f';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto pb-10 font-sans"
    >
      <div className="flex flex-col xl:flex-row gap-6 items-start mt-4">
        
        {/* Left Column - Forms */}
        <div className="flex-1 w-full space-y-6">
          
          {/* 01. Detalle de productos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
                style={{ backgroundColor: tealBadge }}
              >
                01
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#2d3436]">Detalle de productos</h3>
                <p className="text-[13px] text-gray-500 mt-0.5">{products.length} items registrados. Solo cantidad y precio son editables.</p>
              </div>
            </div>

            <div className="p-6 pt-2">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[#2d3436] uppercase tracking-wide mb-2">PRODUCTO</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Seleccionar producto" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all"
                    />
                  </div>
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-bold text-[#2d3436] uppercase tracking-wide mb-2">CANTIDAD</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={inputCant}
                    onChange={(e) => setInputCant(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all"
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-bold text-[#2d3436] uppercase tracking-wide mb-2">PRECIO UNITARIO</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={inputPrecio}
                    onChange={(e) => setInputPrecio(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all"
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
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-5 py-3 text-xs font-bold text-[#2d3436] border-b border-gray-200">CÓDIGO</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#2d3436] border-b border-gray-200">DESCRIPCIÓN</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#2d3436] border-b border-gray-200">UNIDAD</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#2d3436] border-b border-gray-200 text-right">CANT.</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#2d3436] border-b border-gray-200 text-right">P. UNITARIO</th>
                      <th className="px-5 py-3 text-xs font-bold text-[#2d3436] border-b border-gray-200 text-right">IMPORTE</th>
                      <th className="px-3 py-3 border-b border-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    <AnimatePresence>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 text-gray-300 mb-3">
                              <Package size={28} />
                            </div>
                            <p className="text-sm text-gray-500 font-medium">No hay productos agregados a la orden.</p>
                          </td>
                        </tr>
                      ) : (
                        products.map((p) => (
                          <motion.tr 
                            initial={{ opacity: 0, backgroundColor: '#f0fdf4' }}
                            animate={{ opacity: 1, backgroundColor: '#ffffff' }}
                            exit={{ opacity: 0, height: 0 }}
                            key={p.id} 
                            className="group hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-5 py-3.5 text-xs text-gray-500">{p.codigo}</td>
                            <td className="px-5 py-3.5 text-sm font-medium text-[#2d3436]">{p.descripcion}</td>
                            <td className="px-5 py-3.5 text-xs text-gray-500">{p.unidad}</td>
                            <td className="px-5 py-3.5 text-right text-sm text-gray-600">{p.cantidad.toFixed(2)}</td>
                            <td className="px-5 py-3.5 text-right text-sm text-gray-600">{formatCurrency(p.precioUnitario)}</td>
                            <td className="px-5 py-3.5 text-right text-sm font-bold text-[#2d3436]">{formatCurrency(p.importe)}</td>
                            <td className="px-3 py-3.5">
                              <button 
                                onClick={() => removeProduct(p.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
                style={{ backgroundColor: tealBadge }}
              >
                02
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#2d3436]">Condiciones económicas</h3>
                <p className="text-[13px] text-gray-500 mt-0.5">Descuentos y valores aplicados a la operación.</p>
              </div>
            </div>
            
            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[#2d3436] uppercase tracking-wide">DESCUENTO GLOBAL</label>
                  <span className="text-[10px] font-bold text-white bg-[#1e272e] px-2 py-0.5 rounded">PEN</span>
                </div>
                <p className="text-[13px] text-gray-400 mb-3">Se aplica antes de calcular el IGV</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">S/</span>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={descuentoGlobal}
                    onChange={(e) => setDescuentoGlobal(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b894]/30 focus:border-[#00b894] transition-all"
                  />
                </div>
              </div>
              <div className="p-4 rounded-xl border border-blue-100 bg-[#f0f7ff] flex gap-3">
                <Receipt className="text-blue-500 shrink-0 mt-0.5" size={20} />
                <p className="text-[13px] leading-relaxed text-blue-700">
                  Verifica cantidades y precios directamente en la tabla. Los importes y el total se actualizan automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-6">
          
          {/* Proveedor */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-base font-bold text-[#2d3436]">Datos del proveedor</h3>
                <p className="text-[13px] text-gray-500 mt-0.5">Datos editables y operativos</p>
              </div>
              <Building2 className="text-gray-300" size={20} />
            </div>
            
            <button className="w-full py-3.5 px-4 rounded-xl border border-gray-200 flex items-center gap-3 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 border border-gray-100">
                <Search size={16} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#2d3436]">Seleccionar un proveedor</p>
                <p className="text-[12px] text-gray-400">Usa Buscar proveedor para cargar los datos.</p>
              </div>
            </button>
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-[#2d3436]">Resumen de la orden</h3>
            <p className="text-[13px] text-gray-500 mt-0.5 mb-6">Cálculo automático de la operación</p>

            <div className="space-y-3.5 pb-5 border-b border-gray-100 text-[14px]">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-[#2d3436]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#ff7675]">
                <span>Descuento</span>
                <span>- {formatCurrency(descValue)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IGV (18%)</span>
                <span className="font-medium text-[#2d3436]">{formatCurrency(igv)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Otros cargos</span>
                <span className="font-medium text-[#2d3436]">S/ 0.00</span>
              </div>
            </div>

            <div className="pt-5 mb-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#2d3436] mb-1.5">TOTAL ORDEN</p>
                  <span className="text-[10px] font-bold text-white bg-[#1e272e] px-2 py-0.5 rounded">PEN</span>
                </div>
                <span className="text-[28px] font-black text-[#2d3436] leading-none">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <button 
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-colors shadow-sm mb-4"
              style={{ backgroundColor: tealColor }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00a884'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = tealColor}
            >
              Grabar orden de compra
            </button>
            <p className="text-[12px] leading-relaxed text-center text-gray-400 px-2">
              Al grabar podrás decidir si la operación genera automáticamente el movimiento en Kardex.
            </p>
          </div>

        </div>
      </div>
    </motion.div>
  );
};
