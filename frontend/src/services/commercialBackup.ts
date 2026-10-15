export const COMMERCIAL_KEYS = ['erp_ordenes_venta', 'erp_ordenes_compra', 'erp_estado_cuenta', 'erp_products_db', 'erp_kardex_movimientos', 'erp_dashboard_data', 'erp_enterprise_proveedores', 'erp_enterprise_clientes'] as const;
export function commercialSnapshot(storage: Pick<Storage, 'getItem'>) {
  return { version: 1, createdAt: new Date().toISOString(), records: Object.fromEntries(COMMERCIAL_KEYS.map(key => [key, storage.getItem(key)])) };
}
export function backupBeforeInvoice(storage: Pick<Storage, 'getItem' | 'setItem'>): string {
  const key = `erp_respaldo_facturacion_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  storage.setItem(key, JSON.stringify(commercialSnapshot(storage)));
  return key;
}
