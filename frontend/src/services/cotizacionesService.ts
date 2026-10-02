export interface CotizacionItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CotizacionFormData {
  cliente_id: string;
  cliente_nombre: string;
  fecha: string;
  validez_dias: number;
  moneda: 'PEN' | 'USD';
  items: CotizacionItem[];
  estado: 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada';
  notas: string;
}

export interface Cotizacion extends CotizacionFormData {
  id: string;
  numero: string; // Ej: COT-0001
  subtotal: number;
  igv: number;
  total: number;
  fecha_creacion: string;
}

const LOCAL_STORAGE_KEY = 'erp_enterprise_cotizaciones';

const generarNumeroCotizacion = (cotizaciones: Cotizacion[]): string => {
  if (cotizaciones.length === 0) return 'COT-0001';
  const lastNum = parseInt(cotizaciones[cotizaciones.length - 1].numero.split('-')[1]);
  return `COT-${String(lastNum + 1).padStart(4, '0')}`;
};

export const cotizacionesService = {
  getCotizaciones: async (): Promise<Cotizacion[]> => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  },

  createCotizacion: async (data: CotizacionFormData): Promise<Cotizacion> => {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulando red
    
    const cotizaciones = await cotizacionesService.getCotizaciones();
    
    // Cálculos
    const subtotal = data.items.reduce((acc, item) => acc + item.subtotal, 0);
    const igv = subtotal * 0.18; // 18% IGV (Perú)
    const total = subtotal + igv;

    const nuevaCotizacion: Cotizacion = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      numero: generarNumeroCotizacion(cotizaciones),
      subtotal,
      igv,
      total,
      fecha_creacion: new Date().toISOString()
    };

    cotizaciones.push(nuevaCotizacion);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cotizaciones));
    return nuevaCotizacion;
  },

  updateCotizacion: async (id: string, data: CotizacionFormData): Promise<Cotizacion> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const cotizaciones = await cotizacionesService.getCotizaciones();
    const index = cotizaciones.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Cotización no encontrada");

    const subtotal = data.items.reduce((acc, item) => acc + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    const cotizacionActualizada: Cotizacion = {
      ...cotizaciones[index],
      ...data,
      subtotal,
      igv,
      total
    };

    cotizaciones[index] = cotizacionActualizada;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cotizaciones));
    return cotizacionActualizada;
  },

  deleteCotizacion: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let cotizaciones = await cotizacionesService.getCotizaciones();
    cotizaciones = cotizaciones.filter(c => c.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cotizaciones));
  },

  cambiarEstado: async (id: string, nuevoEstado: Cotizacion['estado']): Promise<Cotizacion> => {
    const cotizaciones = await cotizacionesService.getCotizaciones();
    const index = cotizaciones.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Cotización no encontrada");
    
    cotizaciones[index].estado = nuevoEstado;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cotizaciones));
    return cotizaciones[index];
  }
};
