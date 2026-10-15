import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save, FileText, XCircle, PlusCircle, Calculator } from 'lucide-react';
import { cotizacionesService } from '../../services/cotizacionesService';
import { clientesService } from '../../services/clientesService';
import type { Cotizacion, CotizacionFormData, CotizacionItem } from '../../services/cotizacionesService';
import type { Cliente } from '../../services/clientesService';

export const CotizacionesPage: React.FC = () => {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState: CotizacionFormData = {
    cliente_id: '',
    cliente_nombre: '',
    fecha: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    validez_dias: 15,
    moneda: 'PEN',
    items: [],
    estado: 'Borrador',
    notas: ''
  };

  const [formData, setFormData] = useState<CotizacionFormData>(initialFormState);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const dataCotizaciones = await cotizacionesService.getCotizaciones();
    const dataClientes = await clientesService.getClientes();
    setCotizaciones(dataCotizaciones);
    setClientes(dataClientes.filter(c => c.estado !== 'Inactivo' && !c.estado.includes('Suspendido')));
  };

  // Manejo general del formulario
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

  // Manejo de Items (Productos/Servicios en la cotización)
  const addItem = () => {
    const newItem: CotizacionItem = {
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

  const updateItem = (id: string, field: keyof CotizacionItem, value: string | number) => {
    setFormData(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Recalcular subtotal del item
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
      alert("Debes agregar al menos un producto o servicio a la cotización.");
      return;
    }
    
    // Validar que no haya items vacíos
    const itemIncompleto = formData.items.find(i => !i.descripcion || i.precio_unitario <= 0 || i.cantidad <= 0);
    if (itemIncompleto) {
      alert("Por favor completa correctamente la descripción, cantidad y precio de todos los ítems.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const actualizado = await cotizacionesService.updateCotizacion(editingId, formData);
        setCotizaciones(prev => prev.map(c => c.id === editingId ? actualizado : c));
      } else {
        const nueva = await cotizacionesService.createCotizacion(formData);
        setCotizaciones(prev => [...prev, nueva]);
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar la cotización.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (cotizacion: Cotizacion) => {
    setFormData({
      cliente_id: cotizacion.cliente_id,
      cliente_nombre: cotizacion.cliente_nombre,
      fecha: cotizacion.fecha,
      validez_dias: cotizacion.validez_dias,
      moneda: cotizacion.moneda,
      items: [...cotizacion.items],
      estado: cotizacion.estado,
      notas: cotizacion.notas
    });
    setEditingId(cotizacion.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, numero: string) => {
    if (window.confirm(`¿Estás seguro que deseas eliminar la cotización ${numero}?`)) {
      try {
        await cotizacionesService.deleteCotizacion(id);
        setCotizaciones(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  const handleCambiarEstado = async (id: string, estadoActual: string) => {
    // Ciclo simple para probar estados: Borrador -> Enviada -> Aprobada
    const estadosPermitidos: Cotizacion['estado'][] = ['Borrador', 'Enviada', 'Aprobada', 'Rechazada'];
    const currentIndex = estadosPermitidos.indexOf(estadoActual as any);
    const nextEstado = estadosPermitidos[(currentIndex + 1) % estadosPermitidos.length];
    
    try {
      const actualizada = await cotizacionesService.cambiarEstado(id, nextEstado);
      setCotizaciones(prev => prev.map(c => c.id === id ? actualizada : c));
    } catch (error) {
      alert("Error al cambiar de estado.");
    }
  };

  // Cálculos para la vista previa en el formulario
  const subtotalForm = formData.items.reduce((acc, item) => acc + item.subtotal, 0);
  const igvForm = subtotalForm * 0.18;
  const totalForm = subtotalForm + igvForm;

  const getBadgeColor = (estado: string) => {
    switch(estado) {
      case 'Aprobada': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rechazada': return 'bg-red-100 text-red-700 border-red-200';
      case 'Enviada': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSimboloMoneda = (moneda: string) => moneda === 'PEN' ? 'S/' : '$';

  const cotizacionesFiltradas = cotizaciones.filter(c => 
    c.numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Crea y gestiona presupuestos para tus clientes antes de convertirlos en ventas.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
          className="bg-[#ff5a1f] hover:bg-[#e04712] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm shadow-orange-200"
        >
          <Plus size={18} />
          <span>Nueva Cotización</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por número o cliente..." 
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Número</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Resumen / Productos</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cotizacionesFiltradas.map((cotizacion) => (
                <tr key={cotizacion.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{cotizacion.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{cotizacion.cliente_nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="truncate max-w-[200px]" title={cotizacion.items?.map(i => i.descripcion).join(', ')}>
                      {cotizacion.items?.length > 0 
                        ? (cotizacion.items.length === 1 
                            ? cotizacion.items[0].descripcion 
                            : `${cotizacion.items[0].descripcion} y ${cotizacion.items.length - 1} más...`)
                        : 'Sin ítems'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(cotizacion.fecha).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                    {getSimboloMoneda(cotizacion.moneda)} {cotizacion.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => handleCambiarEstado(cotizacion.id, cotizacion.estado)}
                      className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border transition-all hover:opacity-80 ${getBadgeColor(cotizacion.estado)}`}
                      title="Clic para avanzar el estado"
                    >
                      {cotizacion.estado}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(cotizacion)} className="text-blue-500 hover:text-blue-700 mx-1 p-1.5 bg-blue-50 rounded-md transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(cotizacion.id, cotizacion.numero)} className="text-red-500 hover:text-red-700 mx-1 p-1.5 bg-red-50 rounded-md transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {cotizacionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron cotizaciones. Empieza creando una nueva.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NUEVA COTIZACIÓN (Formulario Amplio) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-[#ff5a1f]" />
                {editingId ? 'Editar Cotización' : 'Nueva Cotización'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors p-1" disabled={isSubmitting}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              
              {/* Sección 1: Datos Generales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Moneda</label>
                  <select name="moneda" value={formData.moneda} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]"
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Emisión *</label>
                  <input required type="date" name="fecha" value={formData.fecha} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Validez (Días)</label>
                  <input required type="number" name="validez_dias" value={formData.validez_dias} onChange={handleInputChange} min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <select name="estado" value={formData.estado} onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]"
                  >
                    <option value="Borrador">Borrador</option>
                    <option value="Enviada">Enviada</option>
                    <option value="Aprobada">Aprobada</option>
                    <option value="Rechazada">Rechazada</option>
                  </select>
                </div>
              </div>

              {/* Sección 2: Detalle de Ítems */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                    <Calculator size={18} className="text-gray-400" /> Detalle de Productos / Servicios
                  </h3>
                  <button type="button" onClick={addItem} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
                    <PlusCircle size={16} /> Agregar Ítem
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100/80 border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Descripción</th>
                        <th className="px-4 py-3 font-semibold w-24">Cant.</th>
                        <th className="px-4 py-3 font-semibold w-32">Precio Und.</th>
                        <th className="px-4 py-3 font-semibold w-32 text-right">Subtotal</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {formData.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">
                            <input type="text" required placeholder="Nombre del producto o servicio"
                              value={item.descripcion} onChange={(e) => updateItem(item.id, 'descripcion', e.target.value)}
                              className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#ff5a1f] rounded focus:outline-none transition-colors text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" required min="0.01" step="0.01"
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
                            No hay ítems en la cotización. Presiona "Agregar Ítem".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sección 3: Totales y Notas */}
              <div className="flex flex-col md:flex-row justify-between gap-8 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notas / Condiciones Comerciales</label>
                  <textarea name="notas" value={formData.notas} onChange={handleInputChange} rows={3}
                    placeholder="Ej: El pago se realizará en 2 partes. Garantía de 1 año..."
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
                  <span>{isSubmitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Guardar Cotización')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
