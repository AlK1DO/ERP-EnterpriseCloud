// Manejo local con localStorage para la persistencia temporal de Proveedores

export interface ProveedorFormData {
  tipo_persona: 'NATURAL' | 'JURIDICA';
  documento: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  condicion_pago: number; // En días, ej: 30, 60, 90 días
}

export interface EntradaHistorialProveedor {
  id: string;
  fecha: string;
  accion: string;
  detalle: string;
}

export interface Proveedor extends ProveedorFormData {
  id: string;
  estado: string; // 'Activo', 'Inactivo', 'Suspendido'
  dias_inactivo?: number;
  fecha_registro: string;
  historial: EntradaHistorialProveedor[];
}

const LOCAL_STORAGE_KEY_PROVEEDORES = 'erp_enterprise_proveedores';

const mockInicialProveedores: Proveedor[] = [
  { 
    id: 'p1', tipo_persona: 'JURIDICA', nombre: 'Distribuidora Central S.A.', documento: '20512345678', 
    email: 'ventas@distribuidora.com', telefono: '01 456 7890', direccion: 'Zona Industrial Lote 4', 
    condicion_pago: 30, estado: 'Activo', fecha_registro: new Date().toISOString(),
    historial: [
      { id: 'h1', fecha: new Date().toISOString(), accion: 'Creación', detalle: 'Proveedor registrado en el sistema.' }
    ]
  }
];

export const proveedoresService = {
  getProveedores: async (): Promise<Proveedor[]> => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY_PROVEEDORES);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROVEEDORES, JSON.stringify(mockInicialProveedores));
      return mockInicialProveedores;
    }
    return JSON.parse(data);
  },

  createProveedor: async (proveedor: ProveedorFormData): Promise<Proveedor> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const proveedoresActuales = await proveedoresService.getProveedores();
    const nuevoProveedor: Proveedor = {
      ...proveedor,
      id: Math.random().toString(36).substr(2, 9),
      estado: 'Activo',
      dias_inactivo: 0,
      fecha_registro: new Date().toISOString(),
      historial: [{ id: Math.random().toString(36).substr(2, 9), fecha: new Date().toISOString(), accion: 'Creación', detalle: 'Proveedor registrado.' }]
    };
    proveedoresActuales.push(nuevoProveedor);
    localStorage.setItem(LOCAL_STORAGE_KEY_PROVEEDORES, JSON.stringify(proveedoresActuales));
    return nuevoProveedor;
  },

  updateProveedor: async (id: string, proveedorData: ProveedorFormData): Promise<Proveedor> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const proveedores = await proveedoresService.getProveedores();
    const index = proveedores.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Proveedor no encontrado");

    const proveedorActualizado: Proveedor = {
      ...proveedores[index],
      ...proveedorData,
      historial: [
        ...proveedores[index].historial,
        {
          id: Math.random().toString(36).substr(2, 9),
          fecha: new Date().toISOString(),
          accion: 'Actualización',
          detalle: 'Datos generales del proveedor actualizados.'
        }
      ]
    };

    proveedores[index] = proveedorActualizado;
    localStorage.setItem(LOCAL_STORAGE_KEY_PROVEEDORES, JSON.stringify(proveedores));
    return proveedorActualizado;
  },

  deleteProveedor: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let proveedores = await proveedoresService.getProveedores();
    proveedores = proveedores.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY_PROVEEDORES, JSON.stringify(proveedores));
  },

  consultarRUC: async (ruc: string) => {
    try {
      const response = await fetch(`https://openruc.com/api/ruc/${ruc}`);
      if (!response.ok) throw new Error('No se encontró el RUC');
      return await response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};
