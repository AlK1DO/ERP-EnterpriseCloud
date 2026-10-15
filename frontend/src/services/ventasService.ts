export interface VentaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface VentaFormData {
  cliente_id: string;
  cliente_nombre: string;
  fecha: string;
  metodo_pago: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Crédito';
  moneda: 'PEN' | 'USD';
  items: VentaItem[];
  estado: 'Pendiente' | 'Completada' | 'Anulada';
  notas: string;
}

export interface Venta extends VentaFormData {
  id: string;
  numero: string; // Ej: VEN-0001
  subtotal: number;
  igv: number;
  total: number;
  fecha_creacion: string;
}

const LOCAL_STORAGE_KEY = 'erp_enterprise_ventas';

const generarNumeroVenta = (ventas: Venta[]): string => {
  if (ventas.length === 0) return 'VEN-0001';
  const lastNum = parseInt(ventas[ventas.length - 1].numero.split('-')[1]);
  return `VEN-${String(lastNum + 1).padStart(4, '0')}`;
};

export const ventasService = {
  getVentas: async (): Promise<Venta[]> => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  },

  createVenta: async (data: VentaFormData): Promise<Venta> => {
    await new Promise(resolve => setTimeout(resolve, 600)); 
    
    const ventas = await ventasService.getVentas();
    
    const subtotal = data.items.reduce((acc, item) => acc + item.subtotal, 0);
    const igv = subtotal * 0.18; 
    const total = subtotal + igv;

    const nuevaVenta: Venta = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      numero: generarNumeroVenta(ventas),
      subtotal,
      igv,
      total,
      fecha_creacion: new Date().toISOString()
    };

    ventas.push(nuevaVenta);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ventas));
    return nuevaVenta;
  },

  updateVenta: async (id: string, data: VentaFormData): Promise<Venta> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const ventas = await ventasService.getVentas();
    const index = ventas.findIndex(v => v.id === id);
    if (index === -1) throw new Error("Venta no encontrada");

    const subtotal = data.items.reduce((acc, item) => acc + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    const ventaActualizada: Venta = {
      ...ventas[index],
      ...data,
      subtotal,
      igv,
      total
    };

    ventas[index] = ventaActualizada;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ventas));
    return ventaActualizada;
  },

  deleteVenta: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let ventas = await ventasService.getVentas();
    ventas = ventas.filter(v => v.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ventas));
  },

  cambiarEstado: async (id: string, nuevoEstado: Venta['estado']): Promise<Venta> => {
    const ventas = await ventasService.getVentas();
    const index = ventas.findIndex(v => v.id === id);
    if (index === -1) throw new Error("Venta no encontrada");
    
    ventas[index].estado = nuevoEstado;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ventas));
    return ventas[index];
  }
};
