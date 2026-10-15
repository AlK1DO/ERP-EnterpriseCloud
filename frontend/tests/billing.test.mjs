import test from 'node:test';
import assert from 'node:assert/strict';
import { accountBalance, accountsCsv, buildInvoice, cents, emitLocalInvoice, filterAccounts, invoiceKey, persistPayment, readBillingData, readLocalIssuer, saveLocalIssuer, sumAccounts } from '../src/services/billing.ts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BILLING_JOURNAL, recoverBilling } from '../src/services/billingTransaction.ts';
import { computeDashboard } from '../src/modules/dashboard/dashboardAnalytics.ts';
const issuer = { ruc: '20512345678', legalName: 'Emisor declarado', fiscalAddress: 'Dirección declarada' };
const order = { id: 'OV1', cliente: 'Cliente de la orden', ruc: '20123456789', fecha: '14 oct 2026', total: 118, items: [{ desc: 'Producto vendido', cant: 2, pUnitario: 50, total: 100 }] };
const legacy = { nro: 'F-OLD', tipo: 'FACTURA ELECTRÓNICA', fecha: '14/10/2026 12:00', razonSocial: 'Histórico', vendedor: 'Vendedor previo', productos: 'Detalle', total: 118, pagado: 18, saldo: 100 };
class Store {
  values = new Map(); fail = null; writes = [];
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.fail?.(key, value)) throw new Error('Write failure'); this.writes.push(key); this.values.set(key, value); }
  removeItem(key) { if (this.fail?.(key, null)) throw new Error('Remove failure'); this.values.delete(key); }
}
function setup(invoice = legacy) {
  const storage = new Store(); storage.setItem('erp_estado_cuenta', JSON.stringify([invoice])); storage.setItem('erp_ordenes_venta', JSON.stringify([order])); storage.setItem('erp_products_db', '[{"id":"P","stock":10}]'); storage.setItem('erp_kardex_movimientos', '[{"id":"M"}]'); storage.writes = [];
  const payment = { id: 'PAY1', invoiceId: invoiceKey(invoice), importe: '20', fecha: '2026-10-14', medio: 'Transferencia', referencia: 'REF', moneda: invoice.moneda ?? 'PEN' };
  return { storage, payment };
}
test('redondeo decimal en centavos sin residuos ni NaN', () => {
  assert.equal(cents('1.005'), 101); assert.equal(cents(0.1 + 0.2), 30); assert.equal(cents('.5'), 50);
  for (const value of ['', null, false, '-1', 'Infinity', 'NaN', '1abc']) assert.throws(() => cents(value));
});
test('emisión exige emisor y datos reales; no inventa cliente, guía ni precios', () => {
  assert.throws(() => buildInvoice(order, null, 'usuario@example.test', 'I1', 'LOC-1'), /emisor/);
  assert.throws(() => buildInvoice({ ...order, ruc: '' }, issuer, '', 'I1', 'LOC-1'), /cliente/);
  assert.throws(() => buildInvoice({ ...order, total: 200 }, issuer, '', 'I1', 'LOC-1'), /no concuerda/);
  const invoice = buildInvoice(order, issuer, 'usuario@example.test', 'I1', 'LOC-1');
  assert.equal(invoice.tipo, 'COMPROBANTE LOCAL'); assert.equal(invoice.emisor.ruc, issuer.ruc);
  assert.equal(invoice.cliente_datos.direccion, null); assert.equal(invoice.vendedor, 'usuario@example.test');
  assert.equal(invoice.subtotal, 100); assert.equal(invoice.igv, 18); assert.equal(invoice.total, 118);
});
test('emisor local se configura explícitamente y no se reutiliza entre cuentas', () => {
  const store = new Store(); assert.equal(readLocalIssuer(store, 'A'), null);
  saveLocalIssuer(store, 'A', issuer); assert.deepEqual(readLocalIssuer(store, 'A'), issuer);
  assert.equal(readLocalIssuer(store, 'B'), null);
  assert.throws(() => saveLocalIssuer(store, 'B', { ...issuer, ruc: '' }));
});
test('emisión conserva snapshot, orden y stock; reintento no duplica ventas', () => {
  const { storage } = setup();
  const inventory = storage.getItem('erp_products_db'), movements = storage.getItem('erp_kardex_movimientos');
  const invoice = emitLocalInvoice(storage, 'OV1', issuer, 'real@example.test', 'I1');
  issuer.tradeName = 'Cambio posterior';
  assert.equal(invoice.emisor.tradeName, undefined); delete issuer.tradeName;
  assert.equal(emitLocalInvoice(storage, 'OV1', issuer, 'real@example.test', 'I1').nro, invoice.nro);
  assert.throws(() => emitLocalInvoice(storage, 'OV1', issuer, '', 'I2'), /ya fue facturada/);
  const data = readBillingData(storage); assert.equal(data.orders[0].estado, 'Facturada'); assert.equal(data.invoices.length, 2);
  assert.equal(storage.getItem('erp_products_db'), inventory); assert.equal(storage.getItem('erp_kardex_movimientos'), movements);
  assert.equal(computeDashboard(data.orders, [], data.invoices, [], [], 'monthly', '2026-10-14', 'PEN').ventasTotales, 236);
});
test('pago parcial y final conservan antecedente sin inventar historial previo', () => {
  const { storage, payment } = setup();
  const first = persistPayment(storage, payment);
  assert.equal(first.pagado, 38); assert.equal(first.saldo, 80); assert.equal(first.estado, 'PARCIAL');
  assert.equal(first.antecedente_pago.importe, 18); assert.equal(first.pagos.length, 1);
  assert.deepEqual(first.valores_originales, { total: 118, pagado: 18, saldo: 100 });
  const final = persistPayment(storage, { ...payment, id: 'PAY2', importe: '80' });
  assert.equal(final.pagado, 118); assert.equal(final.saldo, 0); assert.equal(final.estado, 'CANCELADO');
  assert.equal(final.pagos.length, 2); assert.equal(accountBalance(final).balance, 0);
});
test('sobrepago, importes inválidos, moneda, fecha y medio incorrectos no se guardan', () => {
  for (const change of [{ importe: '101' }, { importe: '100.001' }, { importe: '0' }, { importe: '-1' }, { importe: 'NaN' }, { importe: 'Infinity' }, { importe: '' }, { moneda: 'USD' }, { fecha: '2026-02-30' }, { medio: 'Falso' }]) {
    const { storage, payment } = setup(), before = storage.getItem('erp_estado_cuenta');
    assert.throws(() => persistPayment(storage, { ...payment, ...change })); assert.equal(storage.getItem('erp_estado_cuenta'), before);
  }
});
test('pago idempotente por doble clic/reintento; ID diferente después de pago final no cobra otra vez', () => {
  const { storage, payment } = setup();
  const first = persistPayment(storage, { ...payment, importe: '100' });
  const writes = storage.writes.length;
  assert.deepEqual(persistPayment(storage, { ...payment, importe: '100' }), first); assert.equal(storage.writes.length, writes);
  assert.throws(() => persistPayment(storage, { ...payment, importe: '99' }), /otros datos/);
  assert.throws(() => persistPayment(storage, { ...payment, id: 'OTHER' }), /saldo/);
});
test('pagos decimales cierran exactamente y no cambian órdenes, ventas ni inventario', () => {
  const invoice = { ...legacy, total: 0.3, pagado: 0, saldo: 0.3, orden_id: 'OV1' };
  const { storage, payment } = setup(invoice);
  const orders = storage.getItem('erp_ordenes_venta'), products = storage.getItem('erp_products_db'), movements = storage.getItem('erp_kardex_movimientos');
  persistPayment(storage, { ...payment, importe: '0.10' });
  const final = persistPayment(storage, { ...payment, id: 'P2', importe: '0.20' });
  assert.equal(final.saldo, 0); assert.equal(final.pagado, 0.3);
  assert.equal(storage.getItem('erp_ordenes_venta'), orders); assert.equal(storage.getItem('erp_products_db'), products); assert.equal(storage.getItem('erp_kardex_movimientos'), movements);
  const data = readBillingData(storage); const dashboard = computeDashboard(data.orders, [], data.invoices, [], [], 'monthly', '2026-10-14', 'PEN');
  assert.equal(dashboard.ventasTotales, 118); assert.equal(dashboard.ctasPendientes, 0);
});
test('fallos de respaldo, escritura y commit conservan saldos e historial completos', () => {
  for (const stage of ['backup', 'data', 'commit']) {
    const { storage, payment } = setup(), before = storage.getItem('erp_estado_cuenta'); let once = true;
    storage.fail = (key, value) => { const match = stage === 'backup' ? key.startsWith('erp_respaldo_') : stage === 'data' ? key === 'erp_estado_cuenta' : key === BILLING_JOURNAL && value?.includes('"committed":true'); if (match && once) { once = false; return true; } return false; };
    assert.throws(() => persistPayment(storage, payment)); assert.equal(storage.getItem('erp_estado_cuenta'), before);
    storage.fail = null; assert.equal(persistPayment(storage, payment).saldo, 80);
  }
});
test('journal recupera reversión fallida sin pisar cambios ajenos', () => {
  const { storage, payment } = setup(); let writes = 0;
  storage.fail = (key, value) => key === BILLING_JOURNAL && value?.includes('"committed":true') || key === 'erp_estado_cuenta' && ++writes > 1;
  assert.throws(() => persistPayment(storage, payment), /reversión/); assert.ok(storage.getItem(BILLING_JOURNAL));
  storage.fail = null; recoverBilling(storage); assert.equal(readBillingData(storage).invoices[0].saldo, 100);
});
test('comprobantes antiguos inconsistentes y números duplicados se bloquean sin corregirlos', () => {
  const { storage, payment } = setup({ ...legacy, saldo: 99 });
  const before = storage.getItem('erp_estado_cuenta'); assert.throws(() => persistPayment(storage, payment), /no concuerdan/); assert.equal(storage.getItem('erp_estado_cuenta'), before);
  storage.setItem('erp_estado_cuenta', JSON.stringify([legacy, legacy])); assert.throws(() => persistPayment(storage, payment), /único/);
});
test('filtros incluyen operaciones recientes sin rango fijo; rangos y monedas no se mezclan', () => {
  const usd = { ...legacy, nro: 'USD1', moneda: 'USD', fecha: '2026-10-14T15:00:00Z' };
  assert.equal(filterAccounts([legacy, usd], '', '', '', 'PEN').length, 1);
  assert.equal(filterAccounts([legacy, usd], '', '2026-10-14', '2026-10-14', 'USD').length, 1);
  assert.equal(filterAccounts([legacy], '', '2026-11-01', '', 'PEN').length, 0);
  assert.equal(filterAccounts([legacy], '', '2026-11-01', '2026-10-01', 'PEN').length, 0);
  assert.throws(() => sumAccounts([legacy, usd]), /monedas/);
  assert.equal(sumAccounts([legacy]).balance, 10000);
});
test('CSV refleja pagos, antecedente, rango y moneda del mismo conjunto filtrado', () => {
  const { storage, payment } = setup();
  const row = persistPayment(storage, payment);
  const csv = accountsCsv([row, { ...legacy, nro: 'OTRA-MONEDA', moneda: 'USD' }], 'Histórico', '2026-10-01', '2026-10-31', 'PEN');
  assert.ok(csv.includes('PAY1')); assert.ok(csv.includes('Transferencia')); assert.ok(csv.includes('2026-10-01 al 2026-10-31'));
  assert.ok(csv.includes('"80"')); assert.ok(csv.includes('"38"')); assert.ok(csv.includes('"18"'));
  assert.equal(csv.includes('OTRA-MONEDA'), false);
});
test('vista utilizada para imprimir renderiza solo el snapshot seleccionado y sus pagos', () => {
  const source = readFileSync(new URL('../src/modules/ventas/InvoiceDocument.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  const exported = {};
  runInNewContext(js, { exports: exported, require: createRequire(import.meta.url) });
  const row = buildInvoice(order, issuer, 'usuario@example.test', 'I1', 'LOC-SELECCIONADO');
  const html = renderToStaticMarkup(createElement(exported.InvoiceDocument, { invoice: row }));
  assert.ok(html.includes('LOC-SELECCIONADO')); assert.ok(html.includes('Emisor declarado')); assert.ok(html.includes('Producto vendido'));
  assert.equal(html.includes('F002-'), false); assert.equal(html.includes('11:14:48'), false);
  const old = renderToStaticMarkup(createElement(exported.InvoiceDocument, { invoice: legacy }));
  assert.ok(old.includes('Emisor no conservado')); assert.equal(old.includes('Emisor declarado'), false);
});
