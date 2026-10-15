import { commercialSnapshot } from './commercialBackup.ts';
export type BillingStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const BILLING_JOURNAL = 'erp_facturacion_transaccion';
const keys = ['erp_estado_cuenta', 'erp_ordenes_venta'];
type Journal = { committed: boolean; before: Record<string, string | null>; after: Record<string, string> };
export function assertBillingReady(storage: Pick<Storage, 'getItem'>) {
  if (storage.getItem(BILLING_JOURNAL) !== null) throw new Error('Hay una operación de facturación o cobro pendiente de recuperación. Reintenta la carga antes de continuar.');
}
function restore(storage: BillingStore, journal: Journal) {
  for (const key of Object.keys(journal.after)) if (![journal.before[key], journal.after[key]].includes(storage.getItem(key))) throw new Error('Los registros cambiaron; revisa el respaldo antes de recuperar.');
  for (const key of Object.keys(journal.after)) if (journal.before[key] === null) storage.removeItem(key); else storage.setItem(key, journal.before[key]!);
}
export function recoverBilling(storage: BillingStore) {
  const raw = storage.getItem(BILLING_JOURNAL);
  if (raw === null) return;
  const journal = JSON.parse(raw) as Journal;
  if (typeof journal.committed !== 'boolean' || !journal.before || !journal.after || !Object.keys(journal.after).length || Object.keys(journal.after).some(key => !keys.includes(key) || typeof journal.after[key] !== 'string' || (journal.before[key] !== null && typeof journal.before[key] !== 'string'))) throw new Error('Registro de recuperación de cobros inválido.');
  if (journal.committed) {
    if (Object.keys(journal.after).some(key => storage.getItem(key) !== journal.after[key])) throw new Error('Datos confirmados inconsistentes. Revisa el respaldo.');
  } else restore(storage, journal);
  storage.removeItem(BILLING_JOURNAL);
}
export function commitBilling(storage: BillingStore, after: Record<string, string>, kind: 'facturacion' | 'cobro') {
  assertBillingReady(storage);
  const backupKey = `erp_respaldo_${kind}_${Date.now()}_${crypto.randomUUID()}`;
  const journal: Journal = { committed: false, before: Object.fromEntries(Object.keys(after).map(key => [key, storage.getItem(key)])), after };
  storage.setItem(backupKey, JSON.stringify(commercialSnapshot(storage)));
  storage.setItem(BILLING_JOURNAL, JSON.stringify(journal));
  try {
    for (const [key, value] of Object.entries(after)) storage.setItem(key, value);
    storage.setItem(BILLING_JOURNAL, JSON.stringify({ ...journal, committed: true }));
  } catch {
    try { restore(storage, journal); storage.removeItem(BILLING_JOURNAL); }
    catch { throw new Error(`Guardado y reversión incompletos. No continúes; recupera la operación. Respaldo: ${backupKey}`); }
    throw new Error('No se pudo guardar; se restauraron los registros anteriores.');
  }
  try { storage.removeItem(BILLING_JOURNAL); } catch { /* Confirmed; cleanup is retried on next load. */ }
}
export async function withBillingLock<T>(action: () => T): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('erp-billing', action) : action();
}
