import test from 'node:test';
import assert from 'node:assert/strict';
import { filterReceiptMovements, orderReceiptItems, pendingPurchaseOrders, persistReception, readReceptionData, receiptSupplier } from '../src/services/receptionService.ts';
import { assertInventoryReady, RECEIPT_JOURNAL, recoverInventoryTransaction } from '../src/services/inventoryTransaction.ts';
import { readRows } from '../src/modules/dashboard/dashboardAnalytics.ts';
import { readPurchaseProducts } from '../src/modules/compras/purchaseOrder.ts';

class Store {
  values = new Map(); writes = []; fail = null;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.fail?.(key, value)) throw new Error('Write failure'); this.writes.push(key); this.values.set(key, value); }
  removeItem(key) { if (this.fail?.(key, null)) throw new Error('Remove failure'); this.values.delete(key); }
}
const product = { id: 'P1', codigo: 'SKU1', descripcion: 'Producto 1', stock: 10, costoUnitario: 5, almacen: 'Central' };
const second = { ...product, id: 'P2', codigo: 'SKU2', descripcion: 'Producto 2', stock: 20 };
const order = { id: 'OC1', proveedor: 'Proveedor histórico', proveedor_id: 'PROV1', proveedor_datos: { id: 'PROV1', nombre: 'Proveedor histórico', documento: '20512345678', direccion: 'Dirección histórica' }, estado: 'Pendiente de ingreso al Kardex', items: [{ id: 'L1', producto_id: 'P1', codigo: 'SKU1', descripcion: 'Producto 1', unidad: 'NIU', cantidad: 2, precioUnitario: 10 }, { id: 'L2', producto_id: 'P2', codigo: 'SKU2', descripcion: 'Producto 2', unidad: 'NIU', cantidad: 3, precioUnitario: 15 }] };
function setup() {
  const storage = new Store();
  storage.setItem('erp_products_db', JSON.stringify([product, second]));
  storage.setItem('erp_ordenes_compra', JSON.stringify([order, { ...order, id: 'OC-old', estado: 'Ingresado al Kardex' }]));
  storage.setItem('erp_kardex_movimientos', '[]'); storage.writes = [];
  const items = orderReceiptItems(order, [product, second], [], 'Central');
  return { storage, draft: { id: 'REC1', ordenId: 'OC1', tipoOperacion: 'COMPRA', documentoTipo: 'GUÍA DE REMISIÓN', documentoNumero: 'GR-real', almacen: 'Central', observaciones: '', proveedorId: 'PROV1', items } };
}
function rawSnapshot(storage) { return ['erp_products_db', 'erp_kardex_movimientos', 'erp_ordenes_compra'].map(key => storage.getItem(key)); }
test('seleccionar carga todas las líneas y proveedor histórico sin escribir ni inventar documento', () => {
  const { storage, draft } = setup(), before = rawSnapshot(storage);
  const data = readReceptionData(storage);
  assert.equal(orderReceiptItems(order, data.products, data.movements, 'Central').length, 2);
  assert.equal(draft.items.reduce((sum, i) => sum + i.cantidad, 0), 5);
  assert.equal(draft.items.reduce((sum, i) => sum + i.total, 0), 65);
  assert.equal(receiptSupplier(order, [{ id: 'PROV1', nombre: 'Nombre nuevo' }]).nombre, 'Proveedor histórico');
  assert.deepEqual(rawSnapshot(storage), before); assert.deepEqual(storage.writes, []);
  assert.equal(pendingPurchaseOrders(data.orders, []).length, 1);
});
test('recepción completa: promedio ponderado, movimientos vinculados y orden histórica conservada', () => {
  const { storage, draft } = setup();
  persistReception(storage, draft, new Date('2026-10-14T15:00:00Z'));
  const data = readReceptionData(storage);
  assert.equal(data.products[0].stock, 12); assert.equal(data.products[0].costoUnitario, 70 / 12);
  assert.equal(data.products[1].stock, 23); assert.equal(data.products[1].costoUnitario, 145 / 23);
  assert.equal(data.movements.length, 2);
  assert.ok(data.movements.every(m => m.recepcion_id === 'REC1' && m.orden_id === 'OC1' && m.documentoNumero === 'GR-REAL'));
  assert.equal(data.orders.length, 2); assert.equal(data.orders[0].estado, 'Ingresado al Kardex');
  assert.deepEqual(data.orders[0].items, order.items);
  assert.equal(pendingPurchaseOrders(data.orders, data.movements).length, 0);
  assert.equal(storage.getItem(RECEIPT_JOURNAL), null);
  const backup = [...storage.values].find(([key]) => key.startsWith('erp_respaldo_recepcion_'));
  assert.equal(JSON.parse(backup[1]).records.erp_products_db, JSON.stringify([product, second]));
});
test('doble confirmación y reintento no suman stock de nuevo; otro ID para orden completa se rechaza', () => {
  const { storage, draft } = setup();
  persistReception(storage, draft); const before = rawSnapshot(storage), writes = storage.writes.length;
  assert.equal(persistReception(storage, draft).id, 'REC1');
  assert.deepEqual(rawSnapshot(storage), before); assert.equal(storage.writes.length, writes);
  assert.throws(() => persistReception(storage, { ...draft, id: 'REC2' }), /recibida/);
  assert.throws(() => persistReception(storage, { ...draft, documentoNumero: 'otro' }), /otros datos/);
});
test('valida todas las líneas, documento, almacén e importes antes de tocar stock', () => {
  for (const change of [{ documentoNumero: '' }, { almacen: '' }, { tipoOperacion: 'VENTA' }, { items: [] }]) {
    const { storage, draft } = setup(), before = rawSnapshot(storage);
    assert.throws(() => persistReception(storage, { ...draft, ...change })); assert.deepEqual(rawSnapshot(storage), before);
  }
  for (const field of ['cantidad', 'costoUnitario']) for (const value of [0, -1, NaN, Infinity, null]) {
    const { storage, draft } = setup(), before = rawSnapshot(storage);
    const items = draft.items.map((line, index) => index === 1 ? { ...line, [field]: value } : line);
    assert.throws(() => persistReception(storage, { ...draft, items })); assert.deepEqual(rawSnapshot(storage), before);
  }
  const { storage, draft } = setup();
  assert.throws(() => persistReception(storage, { ...draft, items: draft.items.slice(0, 1) }), /falta una línea/);
});
test('fallos en cada escritura comercial o confirmación revierten el conjunto y permiten reintentar', () => {
  for (const failing of ['erp_products_db', 'erp_kardex_movimientos', 'erp_ordenes_compra', 'commit']) {
    const { storage, draft } = setup(), before = rawSnapshot(storage); let once = true;
    storage.fail = (key, value) => { if (once && (key === failing || (failing === 'commit' && key === RECEIPT_JOURNAL && value?.includes('"committed":true')))) { once = false; return true; } return false; };
    assert.throws(() => persistReception(storage, draft), /restauraron/);
    assert.deepEqual(rawSnapshot(storage), before); assert.equal(storage.getItem(RECEIPT_JOURNAL), null);
    storage.fail = null; persistReception(storage, draft);
    assert.equal(readReceptionData(storage).products[0].stock, 12);
  }
});
test('respaldo o journal fallidos bloquean sin modificar datos comerciales', () => {
  for (const kind of ['backup', 'journal']) {
    const { storage, draft } = setup(), before = rawSnapshot(storage);
    storage.fail = key => kind === 'backup' ? key.startsWith('erp_respaldo_') : key === RECEIPT_JOURNAL;
    assert.throws(() => persistReception(storage, draft)); assert.deepEqual(rawSnapshot(storage), before);
  }
});
test('reversión fallida retiene journal y bloquea inventario hasta recuperar sin duplicar', () => {
  const { storage, draft } = setup(), before = rawSnapshot(storage); let failedMovement = false;
  storage.fail = key => { if (key === 'erp_kardex_movimientos') { failedMovement = true; return true; } return failedMovement && key === 'erp_products_db'; };
  assert.throws(() => persistReception(storage, draft), /recupera/);
  assert.ok(storage.getItem(RECEIPT_JOURNAL)); assert.throws(() => assertInventoryReady(storage));
  assert.throws(() => readRows(storage, 'erp_products_db'));
  assert.throws(() => readPurchaseProducts(storage));
  storage.fail = null; assert.equal(recoverInventoryTransaction(storage), true); assert.deepEqual(rawSnapshot(storage), before);
  persistReception(storage, draft); assert.equal(readReceptionData(storage).products[0].stock, 12);
});
test('recuperación no pisa cambios inesperados; journal confirmado no revierte recepción', () => {
  const { storage, draft } = setup();
  let failCleanup = true;
  storage.fail = (key, value) => key === RECEIPT_JOURNAL && value === null && failCleanup;
  persistReception(storage, draft);
  assert.ok(storage.getItem(RECEIPT_JOURNAL));
  failCleanup = false; recoverInventoryTransaction(storage); assert.equal(readReceptionData(storage).products[0].stock, 12);
  storage.setItem(RECEIPT_JOURNAL, JSON.stringify({ version: 1, committed: false, before: { erp_products_db: 'old' }, after: { erp_products_db: 'planned' } }));
  assert.throws(() => recoverInventoryTransaction(storage), /cambiaron/);
  assert.equal(JSON.parse(storage.getItem('erp_products_db'))[0].stock, 12);
});
test('recepción parcial histórica conserva movimientos y recibe solo cantidades pendientes', () => {
  const { storage, draft } = setup();
  const previous = { id: 'OLD-MOV', productoId: 'P1', productoCodigo: 'SKU1', tipoMovimiento: 'ENTRADA', tipoOperacion: 'COMPRA', documentoTipo: 'ORDEN DE COMPRA', documentoNumero: 'OC1', cantEntrada: 1 };
  storage.setItem('erp_kardex_movimientos', JSON.stringify([previous]));
  storage.setItem('erp_products_db', JSON.stringify([{ ...product, stock: 11, costoUnitario: 60 / 11 }, second]));
  const data = readReceptionData(storage), items = orderReceiptItems(order, data.products, data.movements, 'Central');
  assert.equal(items[0].cantidad, 1);
  persistReception(storage, { ...draft, items });
  const result = readReceptionData(storage); assert.equal(result.products[0].stock, 12);
  assert.deepEqual(result.movements.find(m => m.id === 'OLD-MOV'), previous);
});
test('no inventa asignación de parciales ambiguos ni productos o moneda', () => {
  const { storage } = setup(); const data = readReceptionData(storage);
  assert.throws(() => orderReceiptItems({ ...order, moneda: 'USD' }, data.products, [], 'Central'), /conversión/);
  assert.throws(() => orderReceiptItems(order, [product], [], 'Central'), /identificar/);
  assert.throws(() => orderReceiptItems({ ...order, items: [...order.items, order.items[0]] }, data.products, [{ orden_id: 'OC1', productoId: 'P1', tipoMovimiento: 'ENTRADA', tipoOperacion: 'COMPRA', cantEntrada: 1 }], 'Central'), /certeza/);
});
test('ingreso manual sigue disponible y filtro de recepción se puede quitar', () => {
  const { storage, draft } = setup(), ordersBefore = storage.getItem('erp_ordenes_compra');
  persistReception(storage, { ...draft, ordenId: '', tipoOperacion: 'INGRESO_AJUSTE', items: draft.items.map(({ ordenLineaId: _orderLine, ...line }) => line) });
  const data = readReceptionData(storage);
  assert.equal(storage.getItem('erp_ordenes_compra'), ordersBefore);
  assert.equal(filterReceiptMovements(data.movements, 'REC1').length, 2);
  assert.deepEqual(filterReceiptMovements(data.movements, null), data.movements);
  assert.equal(filterReceiptMovements(data.movements, 'missing').length, 0);
});
test('stock existente sin historial no se modifica al consultar ni se concilia automáticamente', () => {
  const { storage } = setup(), before = rawSnapshot(storage);
  readReceptionData(storage); assert.deepEqual(rawSnapshot(storage), before);
  assert.equal(JSON.parse(storage.getItem('erp_kardex_movimientos')).length, 0);
});
