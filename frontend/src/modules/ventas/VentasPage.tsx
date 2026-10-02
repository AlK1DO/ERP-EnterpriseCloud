import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save, ShoppingCart, CheckCircle, XCircle, PlusCircle, Calculator, CreditCard } from 'lucide-react';
import { ventasService } from '../../services/ventasService';
import { clientesService } from '../../services/clientesService';
import type { Venta, VentaFormData, VentaItem } from '../../services/ventasService';
import type { Cliente } from '../../services/clientesService';

export const VentasPage: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState: VentaFormData = {
    cliente_id: '',
    cliente_nombre: '',
    fecha: new Date().toISOString().split('T')[0],
    metodo_pago: 'Transferencia',
    moneda: 'PEN',
    items: [],
    estado: 'Pendiente',
    notas: ''
  };

  const [formData, setFormData] = useState<VentaFormData>(initialFormState);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const dataVentas = await ventasService.getVentas();
    const dataClientes = await clientesService.getClientes();
    setVentas(dataVentas);
    setClientes(dataClientes.filter(c => c.estado !== 'Inactivo' && !c.estado.includes('Suspendido')));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cliente_id') {
      const clienteSeleccionado = clientes.find(c => c.id === value);
      setFormData(prev => ({ 
        ...prev, 
        cliente_id: value,
        cliente_nombre: clienteSeleccionado ? clienteSeleccionado.nombre : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addItem = () => {
    const newItem: VentaItem = {
      id: Math.random().toString(36).substr(2, 9),
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateItem = (id: string, field: keyof VentaItem, value: string | number) => {
    setFormData(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'cantidad' || field === 'precio_unitario') {
            updatedItem.subtotal = Number(updatedItem.cantidad) * Number(updatedItem.precio_unitario);
          }
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: newItems };
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert("Debes agregar al menos un producto a la venta.");
      return;
    }
    
    const itemIncompleto = formData.items.find(i => !i.descripcion || i.precio_unitario <= 0 || i.cantidad <= 0);
    if (itemIncompleto) {
      alert("Por favor completa la descripción, cantidad y precio de todos los ítems.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const actualizado = await ventasService.updateVenta(editingId, formData);
        setVentas(prev => prev.map(v => v.id === editingId ? actualizado : v));
      } else {
        const nueva = await ventasService.createVenta(formData);
        setVentas(prev => [...prev, nueva]);
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar la venta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (venta: Venta) => {
    setFormData({
      cliente_id: venta.cliente_id,
      cliente_nombre: venta.cliente_nombre,
      fecha: venta.fecha,
      metodo_pago: venta.metodo_pago,
      moneda: venta.moneda,
      items: [...venta.items],
      estado: venta.estado,
      notas: venta.notas
    });
    setEditingId(venta.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, numero: string) => {
    if (window.confirm(`¿Estás seguro que deseas anular/eliminar la orden de venta ${numero}?`)) {
      try {
        await ventasService.deleteVenta(id);
        setVentas(prev => prev.filter(v => v.id !== id));
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  const handleCambiarEstado = async (id: string, estadoActual: string) => {
    const estadosPermitidos: Venta['estado'][] = ['Pendiente', 'Completada', 'Anulada'];
    const currentIndex = estadosPermitidos.indexOf(estadoActual as any);
    const nextEstado = estadosPermitidos[(currentIndex + 1) % estadosPermitidos.length];
    
    try {
      const actualizada = await ventasService.cambiarEstado(id, nextEstado);
      setVentas(prev => prev.map(v => v.id === id ? actualizada : v));
    } catch (error) {
      alert("Error al cambiar de estado.");
    }
  };

  const subtotalForm = formData.items.reduce((acc, item) => acc + item.subtotal, 0);
  const igvForm = subtotalForm * 0.18;
  const totalForm = subtotalForm + igvForm;

  const getBadgeColor = (estado: string) => {
    switch(estado) {
      case 'Completada': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Anulada': return 'bg-red-100 text-red-700 border-red-200';
      case 'Pendiente': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSimboloMoneda = (moneda: string) => moneda === 'PEN' ? 'S/' : '$';

  const ventasFiltradas = ventas.filter(v => 
    v.numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Órdenes de Venta</h1>
          <p className="text-sm text-gray-500 mt-1">Registra y administra las ventas confirmadas de la empresa.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
          className="bg-[#ff5a1f] hover:bg-[#e04712] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm shadow-orange-200"
        >
          <Plus size={18} />
          <span>Nueva Venta</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por número de orden o cliente..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Productos / Resumen</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventasFiltradas.map((venta) => (
                <tr key={venta.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{venta.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{venta.cliente_nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="truncate max-w-[200px]" title={venta.items?.map(i => i.descripcion).join(', ')}>
                      {venta.items?.length > 0 
                        ? (venta.items.length === 1 
                            ? venta.items[0].descripcion 
                            : `${venta.items[0].descripcion} y ${venta.items.length - 1} más...`)
                        : 'Sin productos'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(venta.fecha).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                    {getSimboloMoneda(venta.moneda)} {venta.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => handleCambiarEstado(venta.id, venta.estado)}
                      className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border transition-all hover:opacity-80 ${getBadgeColor(venta.estado)}`}
                    >
                      {venta.estado}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(venta)} className="text-blue-500 hover:text-blue-700 mx-1 p-1.5 bg-blue-50 rounded-md transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(venta.id, venta.numero)} className="text-red-500 hover:text-red-700 mx-1 p-1.5 bg-red-50 rounded-md transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {ventasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron órdenes de venta. Registra una nueva.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={20} className="text-[#ff5a1f]" />
                {editingId ? 'Editar Orden de Venta' : 'Nueva Orden de Venta'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors p-1" disabled={isSubmitting}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente *</label>
                  <select required name="cliente_id" value={formData.cliente_id} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]"
                  >
                    <option value="">Seleccione un cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.documento} - {c.nombre}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Venta *</label>
                  <input required type="date" name="fecha" value={formData.fecha} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Moneda</label>
                  <select name="moneda" value={formData.moneda} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]"
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Método de Pago</label>
                  <div className="flex gap-2">
                    {['Efectivo', 'Transferencia', 'Tarjeta', 'Crédito'].map(metodo => (
                      <button
                        key={metodo}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, metodo_pago: metodo as any }))}
                        className={`flex-1 py-2 px-2 text-sm font-medium rounded-lg border transition-colors ${
                          formData.metodo_pago === metodo 
                            ? 'bg-orange-50 border-orange-500 text-[#ff5a1f]' 
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {metodo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado de Orden</label>
                  <select name="estado" value={formData.estado} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]"
                  >
                    <option value="Pendiente">Pendiente (Por Entregar/Pagar)</option>
                    <option value="Completada">Completada (Entregado y Pagado)</option>
                    <option value="Anulada">Anulada</option>
                  </select>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                    <Calculator size={18} className="text-gray-400" /> Detalle de Productos Vendidos
                  </h3>
                  <button type="button" onClick={addItem} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
                    <PlusCircle size={16} /> Agregar Producto
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100/80 border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Producto / Servicio</th>
                        <th className="px-4 py-3 font-semibold w-24">Cant.</th>
                        <th className="px-4 py-3 font-semibold w-32">Precio Und.</th>
                        <th className="px-4 py-3 font-semibold w-32 text-right">Subtotal</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {formData.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">
                            <input type="text" required placeholder="Ej: Laptop Dell Inspiron"
                              value={item.descripcion} onChange={(e) => updateItem(item.id, 'descripcion', e.target.value)}
                              className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#ff5a1f] rounded focus:outline-none transition-colors text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" required min="1" step="1"
                              value={item.cantidad || ''} onChange={(e) => updateItem(item.id, 'cantidad', parseFloat(e.target.value))}
                              className="w-full px-2 py-1.5 border border-gray-200 focus:border-[#ff5a1f] rounded focus:outline-none text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" required min="0.01" step="0.01"
                              value={item.precio_unitario || ''} onChange={(e) => updateItem(item.id, 'precio_unitario', parseFloat(e.target.value))}
                              className="w-full px-2 py-1.5 border border-gray-200 focus:border-[#ff5a1f] rounded focus:outline-none text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-sm text-gray-800">
                            {item.subtotal.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                              <XCircle size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {formData.items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                            No has agregado productos a esta venta.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between gap-8 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notas u Observaciones (Internas)</label>
                  <textarea name="notas" value={formData.notas} onChange={handleInputChange} rows={3}
                    placeholder="Ej: El cliente recogerá el producto en almacén el día martes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] text-sm resize-none" 
                  ></textarea>
                </div>
                
                <div className="w-full md:w-72 bg-orange-50/50 p-4 rounded-xl border border-orange-100 flex flex-col gap-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-medium">{getSimboloMoneda(formData.moneda)} {subtotalForm.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IGV (18%):</span>
                    <span className="font-medium">{getSimboloMoneda(formData.moneda)} {igvForm.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="border-t border-orange-200/60 my-1 pt-2 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total:</span>
                    <span>{getSimboloMoneda(formData.moneda)} {totalForm.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={closeModal} disabled={isSubmitting}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#ff5a1f] hover:bg-[#e04712] text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                  <span>{isSubmitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Procesar Venta')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
