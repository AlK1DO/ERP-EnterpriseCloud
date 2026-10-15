import { assertBillingReady, commitBilling } from './billingTransaction.ts';
type RecordData = Record<string, any>;
type LocalStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const ORDERS = 'erp_ordenes_venta';
const INVOICES = 'erp_estado_cuenta';
function rows(raw: string | null): RecordData[] {
  if (raw === null) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object')) throw new Error('Los registros locales no son válidos; no se modificaron.');
  return value;
}
/** Minimal link needed by the dashboard; no issuer/tax/payment redesign in phase 1. */
export function persistInvoice(storage: LocalStore, orderId: string, invoice: RecordData) {
  assertBillingReady(storage);
  const originalOrders = storage.getItem(ORDERS), originalInvoices = storage.getItem(INVOICES);
  const orders = rows(originalOrders), invoices = rows(originalInvoices);
  const order = orders.find(row => row.id === orderId);
  if (!order) throw new Error('La orden ya no está disponible. Actualiza la página.');
  if (order.estado === 'Facturada' || order.comprobante_nro || invoices.some(row => row.orden_id === orderId)) throw new Error('Esta orden ya fue facturada.');
  if (invoices.some(row => row.nro === invoice.nro)) throw new Error('El número de comprobante ya existe. Reintenta para generar otro.');
  if (!Number.isFinite(Number(order.total)) || Number(order.total) < 0) throw new Error('La orden tiene un total inválido.');
  const total = invoice.emision_id ? invoice.total : order.total;
  const linkedInvoice = { ...invoice, orden_id: orderId, fecha_operacion: order.fecha, moneda: order.moneda ?? 'PEN', total, saldo: total, pagado: 0 };
  commitBilling(storage, { [INVOICES]: JSON.stringify([linkedInvoice, ...invoices]), [ORDERS]: JSON.stringify(orders.map(row => row.id === orderId ? { ...row, estado: 'Facturada', comprobante_nro: invoice.nro } : row)) }, 'facturacion');
  return linkedInvoice;
}
