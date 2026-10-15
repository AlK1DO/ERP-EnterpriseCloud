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

// Ya no se crean ejemplos automáticamente. Los registros existentes se conservan.
function validateClientForm(data: ClienteFormData) {
  if (typeof data.nombre !== 'string' || !data.nombre.trim() || typeof data.documento !== 'string' || !(data.tipo_persona === 'JURIDICA' ? /^\d{11}$/ : data.tipo_persona === 'NATURAL' ? /^(\d{8}|\d{11})$/ : /a^/).test(data.documento)) throw new Error('Completa nombre y documento válidos (RUC de 11 dígitos o DNI de 8 para persona natural).');
  if (!Number.isFinite(data.limite_credito) || data.limite_credito < 0) throw new Error('El límite de crédito debe ser numérico y no negativo.');
}
function saveClientsWithBackup(clientes: Cliente[]) {
  localStorage.setItem(`erp_respaldo_clientes_${crypto.randomUUID()}`, JSON.stringify({ key: LOCAL_STORAGE_KEY, original: localStorage.getItem(LOCAL_STORAGE_KEY) }));
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clientes));
}
export const clientesService = {
  // Obtener clientes desde localStorage
  getClientes: async (): Promise<Cliente[]> => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data === null) return [];
    const clientes = JSON.parse(data);
    if (!Array.isArray(clientes) || clientes.some(c => !c || typeof c !== 'object' || Array.isArray(c))) throw new Error('Los registros de clientes no son válidos; no se reemplazaron.');
    return clientes;
  },

  // Crear un nuevo cliente y guardarlo en localStorage
  createCliente: async (cliente: ClienteFormData): Promise<Cliente> => {
    validateClientForm(cliente);
    await new Promise(resolve => setTimeout(resolve, 800));
    const clientesActuales = await clientesService.getClientes();
    const nuevoCliente: Cliente = {
      ...cliente,
      id: crypto.randomUUID(),
      estado: 'Activo',
      dias_inactivo: 0,
      fecha_registro: new Date().toISOString(),
      historial: [{ id: Math.random().toString(36).substr(2, 9), fecha: new Date().toISOString(), accion: 'Creación', detalle: 'Cliente registrado en el sistema.' }]
    };
    clientesActuales.push(nuevoCliente);
    saveClientsWithBackup(clientesActuales);
    return nuevoCliente;
  },

  // Actualizar un cliente existente
  updateCliente: async (id: string, clienteData: ClienteFormData): Promise<Cliente> => {
    validateClientForm(clienteData);
    await new Promise(resolve => setTimeout(resolve, 600));
    const clientes = await clientesService.getClientes();
    const index = clientes.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Cliente no encontrado");

    const clienteActualizado: Cliente = {
      ...clientes[index],
      ...clienteData,
      historial: [
        ...(clientes[index].historial ?? []),
        {
          id: Math.random().toString(36).substr(2, 9),
          fecha: new Date().toISOString(),
          accion: 'Actualización',
          detalle: 'Datos generales del cliente actualizados.'
        }
      ]
    };

    clientes[index] = clienteActualizado;
    saveClientsWithBackup(clientes);
    return clienteActualizado;
  },

  // Eliminar un cliente
  deleteCliente: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let clientes = await clientesService.getClientes();
    clientes = clientes.filter(c => c.id !== id);
    saveClientsWithBackup(clientes);
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
