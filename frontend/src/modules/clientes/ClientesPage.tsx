import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save, Building, CreditCard, Phone, Mail, MapPin, User, History, Calendar, Activity } from 'lucide-react';
import { clientesService } from '../../services/clientesService';
import type { ClienteFormData, Cliente } from '../../services/clientesService';

export const ClientesPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el Formulario Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingRuc, setIsSearchingRuc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estados para el Modal de Historial
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  
  const initialFormState: ClienteFormData = {
    tipo_persona: 'JURIDICA',
    documento: '',
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    limite_credito: 0
  };

  const [formData, setFormData] = useState<ClienteFormData>(initialFormState);

  // Cargar datos al iniciar
  useEffect(() => {
    clientesService.getClientes().then(data => setClientes(data));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'limite_credito' ? Number(value) : value 
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
      const data = await clientesService.consultarRUC(formData.documento);
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
        const actualizado = await clientesService.updateCliente(editingId, formData);
        setClientes(prev => prev.map(c => c.id === editingId ? actualizado : c));
      } else {
        const nuevoCliente = await clientesService.createCliente(formData);
        setClientes(prev => [...prev, nuevoCliente]);
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar en BD:", error);
      alert("Hubo un error al guardar el cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setFormData({
      tipo_persona: cliente.tipo_persona,
      documento: cliente.documento,
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      limite_credito: cliente.limite_credito
    });
    setEditingId(cliente.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro que deseas eliminar permanentemente a "${nombre}"?`)) {
      try {
        await clientesService.deleteCliente(id);
        setClientes(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        alert("Ocurrió un error al intentar eliminar el cliente.");
      }
    }
  };

  const openHistory = (cliente: Cliente) => {
    setSelectedClient(cliente);
    setIsHistoryModalOpen(true);
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.documento.includes(searchTerm)
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Administra datos, contactos, historial y créditos de tus clientes.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
          className="bg-[#ff5a1f] hover:bg-[#e04712] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm shadow-orange-200"
        >
          <Plus size={18} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUC o DNI..." 
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Crédito Asignado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {cliente.tipo_persona === 'NATURAL' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit">
                        <User size={14} /> Natural
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit">
                        <Building size={14} /> Empresa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{cliente.documento}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{cliente.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1.5"><Mail size={12} /> {cliente.email}</div>
                    <div className="flex items-center gap-1.5 mt-1"><Phone size={12} /> {cliente.telefono}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    S/ {Number(cliente.limite_credito || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        cliente.estado === 'Activo' 
                          ? 'bg-green-100 text-green-700' 
                          : cliente.estado === 'Inactivo' || cliente.estado?.includes('Suspendido')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {cliente.estado || 'Activo'}
                      </span>
                      {(cliente.dias_inactivo ?? 0) > 0 && (
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                          <Activity size={10} /> {cliente.dias_inactivo} días inactivo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => openHistory(cliente)}
                      className="text-amber-500 hover:text-amber-700 mx-1 p-1.5 bg-amber-50 rounded-md transition-colors" 
                      title="Ver Historial"
                    >
                      <History size={16} />
                    </button>
                    <button 
                      onClick={() => handleEdit(cliente)}
                      className="text-blue-500 hover:text-blue-700 mx-1 p-1.5 bg-blue-50 rounded-md transition-colors" 
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(cliente.id, cliente.nombre)}
                      className="text-red-500 hover:text-red-700 mx-1 p-1.5 bg-red-50 rounded-md transition-colors" 
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isHistoryModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <History size={20} className="text-amber-500" />
                Historial del Cliente
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-xl">{selectedClient.nombre}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <User size={15} className="text-gray-400" /> {selectedClient.documento}
                </p>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-4">
                {selectedClient.historial && selectedClient.historial.length > 0 ? (
                  <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 py-2">
                    {selectedClient.historial.map((entry) => (
                      <div key={entry.id} className="relative pl-6">
                        <div className="absolute -left-[7px] top-1 w-3 h-3 bg-[#ff5a1f] rounded-full ring-4 ring-white shadow-sm"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                            <Calendar size={13} className="text-gray-400" />
                            {new Date(entry.fecha).toLocaleDateString('es-PE', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
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
                <Building size={20} className="text-[#ff5a1f]" />
                {editingId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors p-1" disabled={isSubmitting}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6 flex flex-col items-center">
                <label className="text-sm font-semibold text-gray-500 mb-2">Tipo de Cliente</label>
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
                      formData.tipo_persona === 'JURIDICA' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Building size={16} /> Empresa
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                        placeholder={formData.tipo_persona === 'JURIDICA' ? "Ej: 20123456789" : "Ej: 76543210"} 
                        maxLength={formData.tipo_persona === 'JURIDICA' ? 11 : 12}
                      />
                      {formData.tipo_persona === 'JURIDICA' && (
                        <button type="button" onClick={handleSearchRuc} disabled={isSearchingRuc}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-lg border border-indigo-200 transition-colors flex items-center justify-center disabled:opacity-70"
                          title="Consultar RUC en SUNAT"
                        >
                          {isSearchingRuc ? <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div> : <Search size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.tipo_persona === 'JURIDICA' ? 'Razón Social *' : 'Nombres y Apellidos *'}
                    </label>
                    <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                      placeholder={formData.tipo_persona === 'JURIDICA' ? "Nombre de la empresa" : "Ej: Juan Pérez"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección / Domicilio</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                        placeholder="Av. Principal 123" />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 border-b pb-2">Contacto & Crédito</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input required type="email" name="email" value={formData.email} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                        placeholder="contacto@empresa.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                        placeholder="+51 987 654 321" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Límite de Crédito Aprobado</label>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="number" name="limite_credito" value={formData.limite_credito} onChange={handleInputChange} min="0"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f]" 
                        placeholder="0.00" />
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
                  className="px-5 py-2.5 bg-[#ff5a1f] hover:bg-[#e04712] text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                  <span>{isSubmitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Guardar Cliente')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
