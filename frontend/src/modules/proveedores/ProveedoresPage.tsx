import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save, Building2, CalendarDays, Phone, Mail, MapPin, User, History, Calendar, Activity } from 'lucide-react';
import { proveedoresService } from '../../services/proveedoresService';
import type { ProveedorFormData, Proveedor } from '../../services/proveedoresService';

export const ProveedoresPage: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingRuc, setIsSearchingRuc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  
  const initialFormState: ProveedorFormData = {
    tipo_persona: 'JURIDICA',
    documento: '',
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    condicion_pago: 30
  };

  const [formData, setFormData] = useState<ProveedorFormData>(initialFormState);

  useEffect(() => {
    proveedoresService.getProveedores().then(data => setProveedores(data));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'condicion_pago' ? Number(value) : value 
    }));
  };

  const handleTipoPersonaChange = (tipo: 'NATURAL' | 'JURIDICA') => {
    setFormData(prev => ({
      ...prev,
      tipo_persona: tipo,
      documento: '',
      nombre: ''
    }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleSearchRuc = async () => {
    if (!formData.documento || formData.documento.length !== 11) {
      alert("Por favor ingresa un RUC válido de 11 dígitos.");
      return;
    }
    setIsSearchingRuc(true);
    try {
      const data = await proveedoresService.consultarRUC(formData.documento);
      if (data && data.razon_social) {
        setFormData(prev => ({
          ...prev,
          nombre: data.razon_social,
          direccion: data.direccion || prev.direccion
        }));
      } else {
        alert("No se encontró información para este RUC.");
      }
    } catch (error) {
      alert("Error al consultar el RUC. Verifica el número o tu conexión.");
    } finally {
      setIsSearchingRuc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        const actualizado = await proveedoresService.updateProveedor(editingId, formData);
        setProveedores(prev => prev.map(p => p.id === editingId ? actualizado : p));
      } else {
        const nuevoProveedor = await proveedoresService.createProveedor(formData);
        setProveedores(prev => [...prev, nuevoProveedor]);
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar el proveedor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setFormData({
      tipo_persona: proveedor.tipo_persona,
      documento: proveedor.documento,
      nombre: proveedor.nombre,
      email: proveedor.email,
      telefono: proveedor.telefono,
      direccion: proveedor.direccion,
      condicion_pago: proveedor.condicion_pago
    });
    setEditingId(proveedor.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro que deseas eliminar permanentemente a "${nombre}"?`)) {
      try {
        await proveedoresService.deleteProveedor(id);
        setProveedores(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        alert("Ocurrió un error al intentar eliminar el proveedor.");
      }
    }
  };

  const openHistory = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setIsHistoryModalOpen(true);
  };

  const proveedoresFiltrados = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.documento.includes(searchTerm)
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">Administra tus proveedores, compras e historial comercial.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm shadow-teal-200"
        >
          <Plus size={18} />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUC o DNI..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Condición de Pago</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proveedoresFiltrados.map((proveedor) => (
                <tr key={proveedor.id} className="hover:bg-teal-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {proveedor.tipo_persona === 'NATURAL' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit">
                        <User size={14} /> Natural
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit">
                        <Building2 size={14} /> Empresa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{proveedor.documento}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{proveedor.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1.5"><Mail size={12} /> {proveedor.email}</div>
                    <div className="flex items-center gap-1.5 mt-1"><Phone size={12} /> {proveedor.telefono}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md w-fit">
                      <CalendarDays size={14} className="text-gray-500" />
                      {proveedor.condicion_pago} días
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        proveedor.estado === 'Activo' 
                          ? 'bg-green-100 text-green-700' 
                          : proveedor.estado === 'Inactivo' || proveedor.estado?.includes('Suspendido')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {proveedor.estado || 'Activo'}
                      </span>
                      {(proveedor.dias_inactivo ?? 0) > 0 && (
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                          <Activity size={10} /> {proveedor.dias_inactivo} días inactivo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openHistory(proveedor)} className="text-amber-500 hover:text-amber-700 mx-1 p-1.5 bg-amber-50 rounded-md transition-colors" title="Ver Historial">
                      <History size={16} />
                    </button>
                    <button onClick={() => handleEdit(proveedor)} className="text-teal-600 hover:text-teal-800 mx-1 p-1.5 bg-teal-50 rounded-md transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(proveedor.id, proveedor.nombre)} className="text-red-500 hover:text-red-700 mx-1 p-1.5 bg-red-50 rounded-md transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {proveedoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron proveedores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isHistoryModalOpen && selectedProveedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <History size={20} className="text-amber-500" />
                Historial del Proveedor
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-xl">{selectedProveedor.nombre}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <Building2 size={15} className="text-gray-400" /> {selectedProveedor.documento}
                </p>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-4">
                {selectedProveedor.historial && selectedProveedor.historial.length > 0 ? (
                  <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 py-2">
                    {selectedProveedor.historial.map((entry) => (
                      <div key={entry.id} className="relative pl-6">
                        <div className="absolute -left-[7px] top-1 w-3 h-3 bg-teal-500 rounded-full ring-4 ring-white shadow-sm"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                            <Calendar size={13} className="text-gray-400" />
                            {new Date(entry.fecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-800">{entry.accion}</h4>
                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{entry.detalle}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <History size={32} className="mb-3 opacity-20" />
                    <p className="text-sm">No hay historial registrado.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
               <button onClick={() => setIsHistoryModalOpen(false)} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors">
                  Cerrar
                </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Building2 size={20} className="text-teal-600" />
                {editingId ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors p-1" disabled={isSubmitting}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6 flex flex-col items-center">
                <label className="text-sm font-semibold text-gray-500 mb-2">Tipo de Proveedor</label>
                <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-xs shadow-inner">
                  <button type="button" onClick={() => handleTipoPersonaChange('NATURAL')}
                    className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      formData.tipo_persona === 'NATURAL' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <User size={16} /> Natural
                  </button>
                  <button type="button" onClick={() => handleTipoPersonaChange('JURIDICA')}
                    className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      formData.tipo_persona === 'JURIDICA' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Building2 size={16} /> Empresa
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b pb-2">Datos Principales</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.tipo_persona === 'JURIDICA' ? 'RUC *' : 'DNI / CE *'}
                    </label>
                    <div className="flex gap-2">
                      <input required type="text" name="documento" value={formData.documento} onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
                        placeholder={formData.tipo_persona === 'JURIDICA' ? "Ej: 20123456789" : "Ej: 76543210"} 
                        maxLength={formData.tipo_persona === 'JURIDICA' ? 11 : 12}
                      />
                      {formData.tipo_persona === 'JURIDICA' && (
                        <button type="button" onClick={handleSearchRuc} disabled={isSearchingRuc}
                          className="bg-teal-50 hover:bg-teal-100 text-teal-600 px-3 py-2 rounded-lg border border-teal-200 transition-colors flex items-center justify-center disabled:opacity-70"
                          title="Consultar RUC en SUNAT"
                        >
                          {isSearchingRuc ? <div className="w-5 h-5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin"></div> : <Search size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.tipo_persona === 'JURIDICA' ? 'Razón Social *' : 'Nombres y Apellidos *'}
                    </label>
                    <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
                      placeholder={formData.tipo_persona === 'JURIDICA' ? "Nombre de la empresa" : "Ej: Juan Pérez"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección / Domicilio</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
                        placeholder="Av. Principal 123" />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b pb-2">Contacto & Acuerdos</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input required type="email" name="email" value={formData.email} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
                        placeholder="ventas@proveedor.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
                        placeholder="+51 987 654 321" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condición de Pago (Días)</label>
                    <div className="relative">
                      <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="number" name="condicion_pago" value={formData.condicion_pago} onChange={handleInputChange} min="0" step="15"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
                        placeholder="Ej: 30" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={closeModal} disabled={isSubmitting}
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                  <span>{isSubmitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Guardar Proveedor')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
