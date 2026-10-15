import { assertBillingReady, commitBilling } from './billingTransaction.ts';
import type { BillingStore } from './billingTransaction';
import { analysisCsv, dateKey } from '../modules/dashboard/dashboardAnalytics.ts';
import { persistInvoice } from './invoicePersistence.ts';
export type BillingRow = Record<string, any>;
export type Issuer = { ruc: string; legalName: string; fiscalAddress: string; tradeName?: string; phone?: string; email?: string };
export function cents(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('Importe monetario inválido.');
  const text = typeof value === 'number' ? value.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 21 }) : value.trim();
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) throw new Error('Usa un importe decimal válido.');
  const decimals = (match[2] ?? '').padEnd(3, '0');
  const result = BigInt(match[1] || '0') * 100n + BigInt(decimals.slice(0, 2)) + (decimals[2] >= '5' ? 1n : 0n);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Importe fuera de rango.');
  return Number(result);
}
export function currencyOf(row: BillingRow) {
  const currency = row.moneda ?? 'PEN';
  if (currency !== 'PEN' && currency !== 'USD') throw new Error('Moneda no admitida; no se realizará conversión.');
  return currency;
}
export function invoiceKey(row: BillingRow): string { return String(row.id || `legacy:${row.nro}`); }
export function readBillingData(storage: Pick<Storage, 'getItem'>) {
  assertBillingReady(storage);
  function rows(key: string): BillingRow[] {
    const raw = storage.getItem(key); if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(`Datos inválidos en ${key}; no se reemplazaron.`);
    return value;
  }
  return { orders: rows('erp_ordenes_venta'), invoices: rows('erp_estado_cuenta') };
}
export function validateIssuer(issuer: Issuer | null): asserts issuer is Issuer {
  if (!issuer || typeof issuer.ruc !== 'string' || !/^\d{11}$/.test(issuer.ruc) || typeof issuer.legalName !== 'string' || !issuer.legalName.trim() || typeof issuer.fiscalAddress !== 'string' || !issuer.fiscalAddress.trim()) throw new Error('Configura RUC, razón social y dirección fiscal del emisor antes de emitir.');
}
export function localIssuerKey(userId: string) { if (!userId) throw new Error('Falta usuario autenticado.'); return `erp_emisor_local_${userId}`; }
export function readLocalIssuer(storage: Pick<Storage, 'getItem'>, userId: string): Issuer | null {
  const raw = storage.getItem(localIssuerKey(userId)); if (!raw) return null;
  const value = JSON.parse(raw); validateIssuer(value); return value;
}
export function saveLocalIssuer(storage: Pick<Storage, 'getItem' | 'setItem'>, userId: string, issuer: Issuer) {
  validateIssuer(issuer); const key = localIssuerKey(userId);
  storage.setItem(`erp_respaldo_emisor_${crypto.randomUUID()}`, JSON.stringify({ key, original: storage.getItem(key) }));
  storage.setItem(key, JSON.stringify(issuer));
}
export function buildInvoice(order: BillingRow, issuer: Issuer | null, userEmail: string, requestId: string, number: string, now = new Date()) {
  validateIssuer(issuer);
  if (typeof order.id !== 'string' || !order.id.trim() || !requestId) throw new Error('La operación necesita identificadores estables.');
  const currency = currencyOf(order);
  const client = order.cliente_datos ?? { nombre: order.cliente, documento: order.ruc || order.documento || null, direccion: order.cliente_direccion ?? null };
  if (typeof client.nombre !== 'string' || !client.nombre.trim() || !/^(\d{8}|\d{11})$/.test(client.documento ?? client.ruc ?? '')) throw new Error('La orden necesita nombre y documento del cliente válidos. No se completaron datos ficticios.');
  if (!Array.isArray(order.items) || !order.items.length) throw new Error('La orden no tiene productos.');
  const items = order.items.map((item: BillingRow) => {
    if (!item || typeof item.desc !== 'string' || !['string', 'number'].includes(typeof item.cant) || !['string', 'number'].includes(typeof item.pUnitario)) throw new Error('La orden contiene líneas inválidas.');
    const qty = Number(item.cant), price = Number(item.pUnitario);
    if (!item.desc?.trim() || !Number.isFinite(qty) || qty <= 0 || item.pUnitario === null || item.pUnitario === '' || !Number.isFinite(price) || price < 0) throw new Error('La orden contiene líneas inválidas.');
    const amount = cents(qty * price);
    if (item.total !== undefined && cents(item.total) !== amount) throw new Error('Los importes de una línea no concuerdan con cantidad y precio. Revisa la orden.');
    return { desc: item.desc, cant: qty, pUnitario: price, total: amount / 100, codigo: item.codigo ?? null };
  });
  const subtotal = items.reduce((sum: number, item: BillingRow) => sum + cents(item.total), 0);
  const total = cents(order.total), tax = Math.round(subtotal * 18 / 100);
  if (total !== subtotal + tax) throw new Error('El total de la orden no concuerda con sus líneas e IGV. Revisa la operación; no se alteraron sus importes.');
  return { id: requestId, emision_id: requestId, nro: number, tipo: 'COMPROBANTE LOCAL', fecha: now.toISOString(), fecha_operacion: order.fecha,
    orden_id: order.id, emisor: { ...issuer }, cliente_datos: { ...client }, razonSocial: client.nombre, productos: items.map((item: BillingRow) => `${item.cant} × ${item.desc}`).join(', '),
    vendedor: userEmail, moneda: currency, items, subtotal: subtotal / 100, igv: tax / 100, total: total / 100, saldo: total / 100, pagado: 0,
    estado: total === 0 ? 'CANCELADO' : 'PENDIENTE', pagos: [] };
}
export function emitLocalInvoice(storage: BillingStore, orderId: string, issuer: Issuer | null, email: string, requestId: string, now = new Date()) {
  const { orders, invoices } = readBillingData(storage);
  const prior = invoices.find(row => row.emision_id === requestId);
  if (prior) { if (prior.orden_id !== orderId) throw new Error('Este identificador corresponde a otra operación.'); return prior; }
  const matches = orders.filter(row => row.id === orderId);
  if (matches.length !== 1) throw new Error('No se puede identificar una única orden.');
  const numbers = invoices.map(row => /^LOC-(\d+)$/.exec(row.nro ?? '')).filter(Boolean).map(match => Number(match![1]));
  const number = `LOC-${String(Math.max(0, ...numbers) + 1).padStart(6, '0')}`;
  const invoice = buildInvoice(matches[0], issuer, email, requestId, number, now);
  return persistInvoice(storage, orderId, invoice);
}
export function accountBalance(row: BillingRow) {
  const total = cents(row.total), paid = cents(row.pagado), balance = cents(row.saldo);
  if (paid + balance !== total) throw new Error('Total, pagado y saldo no concuerdan; revisa el antecedente antes de cobrar.');
  if (row.pagos !== undefined && !Array.isArray(row.pagos)) throw new Error('Historial de pagos inválido.');
  const payments: BillingRow[] = row.pagos ?? [];
  const historical = payments.reduce((sum, payment) => {
    if (!payment.id || !Number.isSafeInteger(payment.importe_centavos) || payment.importe_centavos <= 0 || payment.moneda !== currencyOf(row)) throw new Error('Historial de pagos inválido.');
    return sum + payment.importe_centavos;
  }, 0);
  if (new Set(payments.map(p => p.id)).size !== payments.length) throw new Error('Hay identificadores de pago repetidos.');
  const antecedent = row.antecedente_pago ? cents(row.antecedente_pago.importe) : paid - historical;
  if (antecedent < 0 || antecedent + historical !== paid) throw new Error('El historial de pagos no concuerda con el importe pagado.');
  return { total, paid, balance, payments, antecedent };
}
export type PaymentDraft = { id: string; invoiceId: string; importe: string; fecha: string; medio: string; referencia: string; moneda: string };
export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'];
export function persistPayment(storage: BillingStore, draft: PaymentDraft, now = new Date()) {
  const { invoices } = readBillingData(storage);
  const matches = invoices.filter(row => invoiceKey(row) === draft.invoiceId);
  if (matches.length !== 1) throw new Error('No se puede identificar un único comprobante.');
  const row = matches[0], balance = accountBalance(row), amount = cents(draft.importe);
  if (typeof row.nro !== 'string' || !row.nro.trim()) throw new Error('El comprobante necesita un número identificable antes de cobrar.');
  const fingerprint = JSON.stringify(draft);
  const previous = invoices.flatMap(invoice => Array.isArray(invoice.pagos) ? invoice.pagos : []).find(payment => payment?.id === draft.id);
  if (previous) { if (previous.firma !== fingerprint) throw new Error('El identificador de pago ya existe con otros datos.'); return row; }
  if (!draft.id || !amount || Number(draft.importe) > balance.balance / 100 || amount > balance.balance) throw new Error('El pago debe ser mayor que cero y no superar el saldo.');
  if (draft.moneda !== currencyOf(row)) throw new Error('Usa la moneda del comprobante, sin conversiones.');
  if (!dateKey(draft.fecha) || !PAYMENT_METHODS.includes(draft.medio)) throw new Error('Completa fecha y medio de pago válidos.');
  const paid = balance.paid + amount, remaining = balance.total - paid;
  const payment = { id: draft.id, importe: amount / 100, importe_centavos: amount, fecha: draft.fecha, medio: draft.medio, referencia: draft.referencia.trim(), moneda: draft.moneda, registrado_en: now.toISOString(), firma: fingerprint };
  const updated = { ...row, id: invoiceKey(row), valores_originales: row.valores_originales ?? { total: row.total, pagado: row.pagado, saldo: row.saldo },
    antecedente_pago: row.antecedente_pago ?? { importe: balance.antecedent / 100, nota: 'Importe previo sin detalle de pagos registrado; no representa un pago nuevo.' },
    pagos: [...balance.payments, payment], pagado: paid / 100, saldo: remaining / 100, estado: remaining === 0 ? 'CANCELADO' : 'PARCIAL' };
  commitBilling(storage, { erp_estado_cuenta: JSON.stringify(invoices.map(invoice => invoice === row ? updated : invoice)) }, 'cobro');
  return updated;
}
export function filterAccounts(rows: BillingRow[], text: string, start: string, end: string, currency: string) {
  if (start && end && start > end) return [];
  return rows.filter(row => {
    const day = dateKey(row.fecha);
    return (row.moneda ?? 'PEN') === currency && (!start && !end || day && (!start || day >= start) && (!end || day <= end))
      && [row.razonSocial, row.nro, row.vendedor].some(value => String(value ?? '').toLowerCase().includes(text.toLowerCase()));
  });
}
export function sumAccounts(rows: BillingRow[]) {
  if (new Set(rows.map(currencyOf)).size > 1) throw new Error('No se suman monedas diferentes.');
  const result = rows.reduce((sum, row) => ({ total: sum.total + cents(row.total), paid: sum.paid + cents(row.pagado), balance: sum.balance + cents(row.saldo) }), { total: 0, paid: 0, balance: 0 });
  if (!Object.values(result).every(Number.isSafeInteger)) throw new Error('La suma monetaria excede el rango permitido.');
  return result;
}
export function accountsCsv(rows: BillingRow[], text: string, start: string, end: string, currency: string) {
  const selected = filterAccounts(rows, text, start, end, currency);
  return analysisCsv({ title: 'Estado de cuenta de ventas', period: `${start || 'Sin inicio'} al ${end || 'Sin fin'}`, currency,
    notes: [`Búsqueda: ${text || 'Todas'}`, 'Registros antiguos sin moneda: PEN. Antecedentes identificados no son pagos nuevos.'],
    headers: ['Tipo', 'Fecha', 'Documento', 'Cliente', 'Moneda', 'Total', 'Saldo', 'Pagado', 'Antecedente', 'Pagos registrados'],
    rows: selected.map(row => { const balance = accountBalance(row); return [row.tipo, row.fecha, row.nro, row.razonSocial, currencyOf(row), balance.total / 100, balance.balance / 100, balance.paid / 100, balance.antecedent / 100, JSON.stringify(balance.payments)]; }) });
}
