// Servicio de Órdenes de Compra conectado a Supabase PostgreSQL
import { supabase } from '@/lib/supabase';

export interface OrdenCompraItem {
  id?: string;
  producto_id?: string;
  producto_codigo: string;
  producto_descripcion: string;
  unidad: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
}

export interface OrdenCompra {
  id: string;
  codigo: string;
  proveedor_id?: string;
  proveedor_nombre: string;
  proveedor_documento?: string;
  subtotal: number;
  igv: number;
  total: number;
  moneda: string;
  estado: 'BORRADOR' | 'EMITIDA' | 'RECEPCIONADA' | 'ANULADA';
  observaciones?: string;
  fecha_emision: string;
  items?: OrdenCompraItem[];
}

export const comprasService = {
  // Obtener órdenes de compra
  getOrdenesCompra: async (): Promise<OrdenCompra[]> => {
    try {
      let data: any[] | null = null;
      
      // 1. Intentamos consultar con relación explícita
      const { data: directData, error: directError } = await supabase
        .from('ordenes_compra')
        .select(`
          id,
          codigo,
          numero,
          proveedor_id,
          proveedor_nombre,
          proveedor_documento,
          proveedor_ruc,
          subtotal,
          igv,
          total,
          moneda,
          estado,
          observaciones,
          notas,
          fecha_emision,
          fecha,
          created_at,
          items:ordenes_compra_items!orden_id(
            id,
            producto_id,
            producto_codigo,
            producto_descripcion,
            unidad,
            cantidad,
            costo_unitario,
            subtotal
          )
        `)
        .order('created_at', { ascending: false });

      if (!directError && directData) {
        data = directData;
      } else {
        // Fallback: consulta directa sin embed ambiguo para compatibilidad universal
        const { data: ocsData } = await supabase
          .from('ordenes_compra')
          .select('*')
          .order('created_at', { ascending: false });

        if (ocsData && ocsData.length > 0) {
          const { data: itemsData } = await supabase.from('ordenes_compra_items').select('*');
          data = ocsData.map((oc: any) => ({
            ...oc,
            items: (itemsData || []).filter((it: any) => it.orden_id === oc.id || it.orden_compra_id === oc.id)
          }));
        }
      }

      if (!data || data.length === 0) {
        const cached = localStorage.getItem('erp_ordenes_compra');
        return cached ? JSON.parse(cached) : [];
      }

      return data.map((oc: any) => ({
        id: oc.id,
        codigo: oc.codigo || oc.numero || 'OC-0000',
        proveedor_id: oc.proveedor_id,
        proveedor_nombre: oc.proveedor_nombre || 'Proveedor General',
        proveedor_documento: oc.proveedor_documento || oc.proveedor_ruc || '',
        subtotal: Number(oc.subtotal) || 0,
        igv: Number(oc.igv) || 0,
        total: Number(oc.total) || 0,
        moneda: oc.moneda || 'PEN',
        estado: oc.estado || 'EMITIDA',
        observaciones: oc.observaciones || oc.notas || '',
        fecha_emision: oc.fecha_emision || oc.fecha || oc.created_at || new Date().toISOString(),
        items: (oc.items || []).map((it: any) => ({
          id: it.id,
          producto_id: it.producto_id,
          producto_codigo: it.producto_codigo || it.codigo || '',
          producto_descripcion: it.producto_descripcion || it.descripcion || '',
          unidad: it.unidad || 'UND',
          cantidad: Number(it.cantidad) || 0,
          costo_unitario: Number(it.costo_unitario || it.precioUnitario) || 0,
          subtotal: Number(it.subtotal || it.importe) || 0
        }))
      }));
    } catch (err) {
      console.warn('Fallback a respaldo local para órdenes de compra:', err);
      const cached = localStorage.getItem('erp_ordenes_compra');
      return cached ? JSON.parse(cached) : [];
    }
  },

  // Crear orden de compra en Supabase y sincronizar con localStorage
  createOrdenCompra: async (orden: {
    codigo: string;
    proveedor_id?: string;
    proveedor_nombre: string;
    proveedor_documento?: string;
    subtotal: number;
    igv: number;
    total: number;
    items: {
      producto_id?: string;
      producto_codigo: string;
      producto_descripcion: string;
      unidad: string;
      cantidad: number;
      costo_unitario: number;
      subtotal: number;
    }[];
  }): Promise<OrdenCompra> => {
    try {
      const { data: nuevaOC, error: errorCabecera } = await supabase
        .from('ordenes_compra')
        .insert([{
          codigo: orden.codigo,
          proveedor_id: orden.proveedor_id || null,
          proveedor_nombre: orden.proveedor_nombre,
          proveedor_documento: orden.proveedor_documento || null,
          subtotal: orden.subtotal,
          igv: orden.igv,
          total: orden.total,
          moneda: 'PEN',
          estado: 'EMITIDA'
        }])
        .select()
        .single();

      if (errorCabecera) throw errorCabecera;

      if (orden.items && orden.items.length > 0) {
        const itemsToInsert = orden.items.map(it => ({
          orden_id: nuevaOC.id,
          producto_id: it.producto_id || null,
          producto_codigo: it.producto_codigo,
          producto_descripcion: it.producto_descripcion,
          unidad: it.unidad || 'UND',
          cantidad: it.cantidad,
          costo_unitario: it.costo_unitario,
          subtotal: it.subtotal
        }));

        const { error: errorItems } = await supabase
          .from('ordenes_compra_items')
          .insert(itemsToInsert);

        if (errorItems) console.error('Error insertando items de OC:', errorItems);
      }

      const resOC: OrdenCompra = {
        id: nuevaOC.id,
        codigo: nuevaOC.codigo,
        proveedor_id: nuevaOC.proveedor_id,
        proveedor_nombre: nuevaOC.proveedor_nombre,
        proveedor_documento: nuevaOC.proveedor_documento,
        subtotal: Number(nuevaOC.subtotal),
        igv: Number(nuevaOC.igv),
        total: Number(nuevaOC.total),
        moneda: nuevaOC.moneda,
        estado: nuevaOC.estado,
        fecha_emision: nuevaOC.fecha_emision,
        items: orden.items
      };

      // Guardar también en localStorage para compatibilidad inmediata
      const cached = localStorage.getItem('erp_ordenes_compra');
      const ocs = cached ? JSON.parse(cached) : [];
      const localOC = {
        id: resOC.codigo,
        uuid: resOC.id,
        proveedor: resOC.proveedor_nombre,
        ruc: resOC.proveedor_documento || '',
        fecha: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
        total: resOC.total,
        subtotal: resOC.subtotal,
        igv: resOC.igv,
        items: (orden.items || []).map(it => ({
          codigo: it.producto_codigo,
          descripcion: it.producto_descripcion,
          unidad: it.unidad,
          cantidad: it.cantidad,
          precioUnitario: it.costo_unitario,
          importe: it.subtotal
        })),
        estado: 'Emitida'
      };
      localStorage.setItem('erp_ordenes_compra', JSON.stringify([localOC, ...ocs]));

      return resOC;
    } catch (err: any) {
      console.warn('Fallo guardado en Supabase, usando respaldo local:', err.message);
      // Fallback local
      const localOC = {
        id: orden.codigo,
        codigo: orden.codigo,
        proveedor_nombre: orden.proveedor_nombre,
        proveedor_documento: orden.proveedor_documento,
        subtotal: orden.subtotal,
        igv: orden.igv,
        total: orden.total,
        moneda: 'PEN',
        estado: 'EMITIDA' as const,
        fecha_emision: new Date().toISOString(),
        items: orden.items
      };

      const cached = localStorage.getItem('erp_ordenes_compra');
      const ocs = cached ? JSON.parse(cached) : [];
      localStorage.setItem('erp_ordenes_compra', JSON.stringify([{
        id: orden.codigo,
        proveedor: orden.proveedor_nombre,
        ruc: orden.proveedor_documento || '',
        fecha: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
        total: orden.total,
        subtotal: orden.subtotal,
        igv: orden.igv,
        items: (orden.items || []).map(it => ({
          codigo: it.producto_codigo,
          descripcion: it.producto_descripcion,
          unidad: it.unidad,
          cantidad: it.cantidad,
          precioUnitario: it.costo_unitario,
          importe: it.subtotal
        })),
        estado: 'Emitida'
      }, ...ocs]));

      return localOC;
    }
  }
};
