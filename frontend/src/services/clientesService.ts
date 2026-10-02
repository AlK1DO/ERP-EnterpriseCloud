// Manejo local con localStorage para la persistencia temporal

export interface ClienteFormData {
  tipo_persona: 'NATURAL' | 'JURIDICA';
  documento: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  limite_credito: number;
}

export interface EntradaHistorial {
  id: string;
  fecha: string;
  accion: string;
  detalle: string;
}

export interface Cliente extends ClienteFormData {
  id: string;
  estado: string;
  dias_inactivo?: number;
  fecha_registro: string;
  historial: EntradaHistorial[];
}

const LOCAL_STORAGE_KEY = 'erp_enterprise_clientes';

// Datos iniciales de prueba (se guardarán en localStorage si está vacío)
const mockInicial: Cliente[] = [
  { 
    id: '1', tipo_persona: 'JURIDICA', nombre: 'Acme Corp', documento: '20123456789', 
    email: 'contacto@acme.com', telefono: '987654321', direccion: 'Av. Siempre Viva 123', 
    limite_credito: 5000, estado: 'Activo', fecha_registro: new Date().toISOString(),
    historial: [
      { id: 'h1', fecha: new Date().toISOString(), accion: 'Creación', detalle: 'Cliente registrado en el sistema.' }
    ]
  },
  { 
    id: '3', tipo_persona: 'NATURAL', nombre: 'Jordan Rojas B', documento: '70646686', 
    email: 'jordan@gmail.com', telefono: '986182856', direccion: 'Calle Falsa 456', 
    limite_credito: 0, estado: 'Inactivo', dias_inactivo: 45, fecha_registro: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    historial: [
      { id: 'h2', fecha: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), accion: 'Creación', detalle: 'Cliente registrado.' },
      { id: 'h3', fecha: new Date().toISOString(), accion: 'Suspensión', detalle: 'Cuenta marcada como inactiva por falta de operaciones.' }
    ]
  },
];

export const clientesService = {
  // Obtener clientes desde localStorage
  getClientes: async (): Promise<Cliente[]> => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockInicial));
      return mockInicial;
    }
    return JSON.parse(data);
  },

  // Crear un nuevo cliente y guardarlo en localStorage
  createCliente: async (cliente: ClienteFormData): Promise<Cliente> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const clientesActuales = await clientesService.getClientes();
    const nuevoCliente: Cliente = {
      ...cliente,
      id: Math.random().toString(36).substr(2, 9),
      estado: 'Activo',
      dias_inactivo: 0,
      fecha_registro: new Date().toISOString(),
      historial: [{ id: Math.random().toString(36).substr(2, 9), fecha: new Date().toISOString(), accion: 'Creación', detalle: 'Cliente registrado en el sistema.' }]
    };
    clientesActuales.push(nuevoCliente);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientesActuales));
    return nuevoCliente;
  },

  // Actualizar un cliente existente
  updateCliente: async (id: string, clienteData: ClienteFormData): Promise<Cliente> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const clientes = await clientesService.getClientes();
    const index = clientes.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Cliente no encontrado");

    const clienteActualizado: Cliente = {
      ...clientes[index],
      ...clienteData,
      historial: [
        ...clientes[index].historial,
        {
          id: Math.random().toString(36).substr(2, 9),
          fecha: new Date().toISOString(),
          accion: 'Actualización',
          detalle: 'Datos generales del cliente actualizados.'
        }
      ]
    };

    clientes[index] = clienteActualizado;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientes));
    return clienteActualizado;
  },

  // Eliminar un cliente
  deleteCliente: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let clientes = await clientesService.getClientes();
    clientes = clientes.filter(c => c.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientes));
  },

  // Consultar RUC externamente usando OpenRUC
  consultarRUC: async (ruc: string) => {
    try {
      const response = await fetch(`https://openruc.com/api/ruc/${ruc}`);
      if (!response.ok) {
        throw new Error('No se encontró el RUC o hubo un error en la API.');
      }
      return await response.json();
    } catch (error) {
      console.error("Error al consultar RUC:", error);
      throw error;
    }
  }
};
