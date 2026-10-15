import { commercialSnapshot } from './commercialBackup.ts';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const RECEIPT_JOURNAL = 'erp_recepcion_transaccion';
const allowed = ['erp_products_db', 'erp_kardex_movimientos', 'erp_ordenes_compra', 'erp_ordenes_venta'];
type Journal = { version: 1; committed: boolean; before: Record<string, string | null>; after: Record<string, string> };
export function assertInventoryReady(storage: Pick<Storage, 'getItem'>) {
  if (storage.getItem(RECEIPT_JOURNAL) !== null) throw new Error('Hay una recepción pendiente de recuperación. Abre Ingreso al Kardex antes de continuar.');
}
function restore(storage: Store, journal: Journal) {
  for (const key of Object.keys(journal.after)) {
    const current = storage.getItem(key);
    if (current !== journal.before[key] && current !== journal.after[key]) throw new Error('Los datos cambiaron durante la recepción. Se requiere revisar el respaldo antes de recuperar.');
  }
  for (const key of Object.keys(journal.after)) {
    if (journal.before[key] === null) storage.removeItem(key); else storage.setItem(key, journal.before[key]!);
  }
}
export function recoverInventoryTransaction(storage: Store) {
  const raw = storage.getItem(RECEIPT_JOURNAL);
  if (raw === null) return false;
  const journal = JSON.parse(raw) as Journal;
  if (journal.version !== 1 || typeof journal.committed !== 'boolean' || !journal.before || !journal.after || !Object.keys(journal.after).length
    || Object.keys(journal.after).some(key => !allowed.includes(key) || typeof journal.after[key] !== 'string' || (journal.before[key] !== null && typeof journal.before[key] !== 'string'))) throw new Error('El registro de recuperación no es válido; revisa el respaldo.');
  if (journal.committed) {
    if (Object.keys(journal.after).some(key => storage.getItem(key) !== journal.after[key])) throw new Error('La recepción confirmada tiene datos inconsistentes. Revisa el respaldo.');
  } else restore(storage, journal);
  storage.removeItem(RECEIPT_JOURNAL);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('erp-inventory-changed'));
  return true;
}
export function commitInventoryTransaction(storage: Store, after: Record<string, string>, receiptId: string) {
  assertInventoryReady(storage);
  const journal: Journal = { version: 1, committed: false, before: Object.fromEntries(Object.keys(after).map(key => [key, storage.getItem(key)])), after };
  const backup = `erp_respaldo_recepcion_${receiptId}_${crypto.randomUUID()}`;
  storage.setItem(backup, JSON.stringify(commercialSnapshot(storage)));
  storage.setItem(RECEIPT_JOURNAL, JSON.stringify(journal));
  try {
    for (const [key, value] of Object.entries(after)) storage.setItem(key, value);
    storage.setItem(RECEIPT_JOURNAL, JSON.stringify({ ...journal, committed: true }));
  } catch {
    try { restore(storage, journal); storage.removeItem(RECEIPT_JOURNAL); }
    catch { throw new Error(`No se pudo completar ni revertir la recepción. No continúes operando; recupera desde esta pantalla. Respaldo: ${backup}`); }
    throw new Error('No se guardó la recepción. Se restauraron los registros anteriores; puedes reintentar.');
  }
  // A committed journal can safely be cleaned up on the next visit if removal fails.
  try { storage.removeItem(RECEIPT_JOURNAL); } catch { /* Keep the committed recovery marker. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('erp-inventory-changed'));
}
export async function withInventoryLock<T>(action: () => T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('erp-inventory-receipt', action);
  return action();
}
