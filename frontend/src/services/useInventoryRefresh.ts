import { useEffect } from 'react';
// Actualiza vistas montadas despues del commit, entre pestanas y al volver al ERP.
export function useInventoryRefresh(refresh: () => void) {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (!event.key || ['erp_products_db','erp_recepcion_transaccion'].includes(event.key)) refresh(); };
    window.addEventListener('erp-inventory-changed', refresh);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('erp-inventory-changed', refresh); window.removeEventListener('storage', onStorage); window.removeEventListener('focus', refresh); };
  }, [refresh]);
}
