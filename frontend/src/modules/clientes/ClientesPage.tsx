import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Save, Building, CreditCard, Phone, Mail, MapPin, User, History, Calendar, Activity } from 'lucide-react';
import { clientesService } from '../../services/clientesService';
import type { ClienteFormData, Cliente } from '../../services/clientesService';

export const ClientesPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
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

  const handleSearchDocumento = async () => {
    const doc = formData.documento.trim();
    if (!doc) {
      alert("Por favor ingresa un número de documento.");
      return;
    }

    if (formData.tipo_persona === 'NATURAL') {
      if (doc.length !== 8) {
        alert("El DNI debe tener 8 dígitos.");
        return;
      }
      setIsSearchingRuc(true);
      try {
        const data = await clientesService.consultarDNI(doc);
        if (data && (data.nombre || data.nombres)) {
          const fullName = data.nombre || `${data.nombres || ''} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim();
          setFormData(prev => ({
            ...prev,
            nombre: fullName
          }));
        } else {
          alert("No se encontró información para este DNI en RENIEC.");
        }
      } catch (error: any) {
        alert(error.message || "Error al consultar el DNI.");
      } finally {
        setIsSearchingRuc(false);
      }
    } else {
      if (doc.length !== 11) {
        alert("El RUC debe tener 11 dígitos.");
        return;
      }
      setIsSearchingRuc(true);
      try {
        const data = await clientesService.consultarRUC(doc);
        const razonSocial = data.nombre_o_razon_social || (data as any).razon_social;
        if (razonSocial) {
          setFormData(prev => ({
            ...prev,
            nombre: razonSocial,
            direccion: data.direccion || prev.direccion
          }));
        } else {
          alert("No se encontró información para este RUC en SUNAT.");
        }
      } catch (error: any) {
        alert(error.message || "Error al consultar el RUC.");
      } finally {
        setIsSearchingRuc(false);
      }
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
      <div className={`flex justify-between items-center p-5 rounded-xl shadow-sm border transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
      }`}>
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Gestión de Clientes</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Administra datos, contactos, historial y créditos de tus clientes.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
          className="bg-[#ff5a1f] hover:bg-[#e04712] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm shadow-orange-200"
        >
          <Plus size={18} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className={`p-4 rounded-xl shadow-sm border flex gap-4 transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
      }`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUC o DNI..." 
            className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] transition-all ${
              darkMode 
                ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-[#ff5a1f]' 
                : 'bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:border-[#ff5a1f]'
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b transition-colors ${
                darkMode ? 'bg-slate-800/80 border-slate-800' : 'bg-gray-50/80 border-gray-200'
              }`}>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Tipo</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Documento</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Cliente</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Contacto</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Crédito Asignado</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Estado</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-right ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className={`transition-colors ${
                  darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-orange-50/30'
                }`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {cliente.tipo_persona === 'NATURAL' ? (
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md w-fit ${
                        darkMode ? 'text-blue-400 bg-blue-950/60 border border-blue-800/50' : 'text-blue-600 bg-blue-50'
                      }`}>
                        <User size={14} /> Natural
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md w-fit ${
                        darkMode ? 'text-indigo-400 bg-indigo-950/60 border border-indigo-800/50' : 'text-indigo-600 bg-indigo-50'
                      }`}>
                        <Building size={14} /> Empresa
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>{cliente.documento}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cliente.nombre}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-1.5"><Mail size={12} /> {cliente.email}</div>
                    <div className="flex items-center gap-1.5 mt-1"><Phone size={12} /> {cliente.telefono}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    S/ {Number(cliente.limite_credito || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        cliente.estado === 'Activo' 
                          ? (darkMode ? 'bg-green-950/60 text-green-400 border border-green-800/50' : 'bg-green-100 text-green-700')
                          : cliente.estado === 'Inactivo' || cliente.estado?.includes('Suspendido')
                          ? (darkMode ? 'bg-red-950/60 text-red-400 border border-red-800/50' : 'bg-red-100 text-red-700')
                          : (darkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700')
                      }`}>
                        {cliente.estado || 'Activo'}
                      </span>
                      {(cliente.dias_inactivo ?? 0) > 0 && (
                        <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                          <Activity size={10} /> {cliente.dias_inactivo} días inactivo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => openHistory(cliente)}
                      className={`mx-1 p-1.5 rounded-md transition-colors ${
                        darkMode ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20' : 'text-amber-500 hover:text-amber-700 bg-amber-50'
                      }`} 
                      title="Ver Historial"
                    >
                      <History size={16} />
                    </button>
                    <button 
                      onClick={() => handleEdit(cliente)}
                      className={`mx-1 p-1.5 rounded-md transition-colors ${
                        darkMode ? 'text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20' : 'text-blue-500 hover:text-blue-700 bg-blue-50'
                      }`} 
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(cliente.id, cliente.nombre)}
                      className={`mx-1 p-1.5 rounded-md transition-colors ${
                        darkMode ? 'text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20' : 'text-red-500 hover:text-red-700 bg-red-50'
                      }`} 
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className={`px-6 py-8 text-center ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isHistoryModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity">
          <div className={`rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              darkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50/50 border-gray-100'
            }`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <History size={20} className="text-amber-500" />
                Historial del Cliente
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className={`transition-colors p-1 ${
                darkMode ? 'text-slate-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
              }`}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className={`mb-6 pb-4 border-b ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <h3 className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedClient.nombre}</h3>
                <p className={`text-sm flex items-center gap-2 mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  <User size={15} className="text-gray-400" /> {selectedClient.documento}
                </p>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-4">
                {selectedClient.historial && selectedClient.historial.length > 0 ? (
                  <div className={`relative border-l-2 ml-3 space-y-8 py-2 ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    {selectedClient.historial.map((entry) => (
                      <div key={entry.id} className="relative pl-6">
                        <div className={`absolute -left-[7px] top-1 w-3 h-3 bg-[#ff5a1f] rounded-full ring-4 ${
                          darkMode ? 'ring-slate-900' : 'ring-white'
                        } shadow-sm`}></div>
                        <div className="flex flex-col">
                          <div className={`flex items-center gap-2 text-xs font-bold mb-1.5 uppercase tracking-wide ${
                            darkMode ? 'text-slate-400' : 'text-gray-400'
                          }`}>
                            <Calendar size={13} className="text-gray-400" />
                            {new Date(entry.fecha).toLocaleDateString('es-PE', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                          <div className={`rounded-lg p-3 border shadow-sm ${
                            darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-100 text-gray-800'
                          }`}>
                            <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{entry.accion}</h4>
                            <p className={`text-sm mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>{entry.detalle}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <History size={32} className="mb-3 opacity-20" />
                    <p className="text-sm">No hay historial registrado.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className={`px-6 py-4 border-t flex justify-end ${
              darkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'
            }`}>
               <button onClick={() => setIsHistoryModalOpen(false)} className={`px-5 py-2 border font-medium rounded-lg transition-colors ${
                 darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
               }`}>
                  Cerrar
                </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity">
          <div className={`rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              darkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50/50 border-gray-100'
            }`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <Building size={20} className="text-[#ff5a1f]" />
                {editingId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h2>
              <button onClick={closeModal} className={`transition-colors p-1 ${
                darkMode ? 'text-slate-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
              }`} disabled={isSubmitting}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6 flex flex-col items-center">
                <label className={`text-sm font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Tipo de Cliente</label>
                <div className={`p-1 rounded-lg w-full max-w-xs shadow-inner flex ${
                  darkMode ? 'bg-slate-800' : 'bg-gray-100'
                }`}>
                  <button type="button" onClick={() => handleTipoPersonaChange('NATURAL')}
                    className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      formData.tipo_persona === 'NATURAL' 
                        ? (darkMode ? 'bg-slate-700 shadow-sm text-blue-400' : 'bg-white shadow-sm text-blue-600') 
                        : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')
                    }`}
                  >
                    <User size={16} /> Natural
                  </button>
                  <button type="button" onClick={() => handleTipoPersonaChange('JURIDICA')}
                    className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      formData.tipo_persona === 'JURIDICA' 
                        ? (darkMode ? 'bg-slate-700 shadow-sm text-indigo-400' : 'bg-white shadow-sm text-indigo-600') 
                        : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')
                    }`}
                  >
                    <Building size={16} /> Empresa
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1 space-y-4">
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 border-b pb-2 ${
                    darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-400 border-gray-200'
                  }`}>Datos Principales</h3>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      {formData.tipo_persona === 'JURIDICA' ? 'RUC *' : 'DNI / CE *'}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        required 
                        type="text" 
                        name="documento" 
                        value={formData.documento} 
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchDocumento();
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'
                        }`} 
                        placeholder={formData.tipo_persona === 'JURIDICA' ? "Ej: 20123456789 (Presiona Enter o Buscar)" : "Ej: 70646686 (Presiona Enter o Buscar)"} 
                        maxLength={formData.tipo_persona === 'JURIDICA' ? 11 : 12}
                      />
                      <button 
                        type="button" 
                        onClick={handleSearchDocumento} 
                        disabled={isSearchingRuc}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-70 whitespace-nowrap"
                        title={formData.tipo_persona === 'JURIDICA' ? "Consultar RUC en SUNAT vía Migo API" : "Consultar DNI en RENIEC vía Migo API"}
                      >
                        {isSearchingRuc ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                            <span>Consultando...</span>
                          </>
                        ) : (
                          <>
                            <Search size={15} />
                            <span>Buscar {formData.tipo_persona === 'JURIDICA' ? 'SUNAT' : 'RENIEC'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      {formData.tipo_persona === 'JURIDICA' ? 'Razón Social *' : 'Nombres y Apellidos *'}
                    </label>
                    <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'
                      }`} 
                      placeholder={formData.tipo_persona === 'JURIDICA' ? "Nombre de la empresa" : "Ej: Juan Pérez"} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Dirección / Domicilio</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange}
                        className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'
                        }`} 
                        placeholder="Av. Principal 123" />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1 space-y-4">
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 border-b pb-2 ${
                    darkMode ? 'text-slate-400 border-slate-800' : 'text-gray-400 border-gray-200'
                  }`}>Contacto & Crédito</h3>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Correo Electrónico *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input required type="email" name="email" value={formData.email} onChange={handleInputChange}
                        className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'
                        }`} 
                        placeholder="contacto@empresa.com" />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Teléfono</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange}
                        className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'
                        }`} 
                        placeholder="+51 987 654 321" />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Límite de Crédito Aprobado</label>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="number" name="limite_credito" value={formData.limite_credito} onChange={handleInputChange} min="0"
                        className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'
                        }`} 
                        placeholder="0.00" />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-8 pt-4 border-t flex justify-end gap-3 ${
                darkMode ? 'border-slate-800' : 'border-gray-100'
              }`}>
                <button type="button" onClick={closeModal} disabled={isSubmitting}
                  className={`px-5 py-2.5 font-medium rounded-lg transition-colors ${
                    darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}>
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
