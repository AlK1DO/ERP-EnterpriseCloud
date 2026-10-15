import test from 'node:test';
import assert from 'node:assert/strict';
import { addPurchaseLine, hasUnsavedPurchase, paymentLabel, persistPurchase, purchaseTotals, readPurchaseProducts, supplierSnapshot, supplierUsable } from '../src/modules/compras/purchaseOrder.ts';
import { proveedoresService } from '../src/services/proveedoresService.ts';
import { computeDashboard } from '../src/modules/dashboard/dashboardAnalytics.ts';

const provider = { id: 'P1', nombre: 'Proveedor real', tipo_persona: 'JURIDICA', documento: '20512345678', estado: 'Activo', direccion: 'Av. registrada', telefono: '555', email: 'proveedor@example.test', condicion_pago: 30 };
const product = { id: 'PROD1', codigo: 'SKU1', descripcion: 'Producto registrado', unidad: 'NIU', categoria: 'Hardware', almacen: 'Almacén Central', costoUnitario: 12, precioVenta: 20, stock: 7, stockMinimo: 2 };
class MemoryStorage {
  values = new Map();
  writes = [];
  failure = null;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.failure?.(key)) throw new Error('Fallo simulado'); this.writes.push(key); this.values.set(key, value); }
}
function setup() {
  const storage = new MemoryStorage();
  storage.setItem('erp_products_db', JSON.stringify([product]));
  storage.setItem('erp_kardex_movimientos', JSON.stringify([{ id: 'MOV-OLD' }]));
  storage.setItem('erp_enterprise_proveedores', JSON.stringify([provider]));
  storage.writes = [];
  const draft = { id: 'OC-stable', proveedor: supplierSnapshot(provider), items: [addPurchaseLine(product, '2', '10')], descuento: '5' };
  return { storage, draft };
}
test('proveedoresService es la fuente y modo de lectura no crea ejemplos ni modifica registros', async () => {
  const storage = new MemoryStorage();
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    assert.deepEqual(await proveedoresService.getProveedores({ initializeIfEmpty: false }), []);
    assert.deepEqual(storage.writes, []);
    storage.setItem('erp_enterprise_proveedores', JSON.stringify([provider])); storage.writes = [];
    assert.deepEqual(await proveedoresService.getProveedores({ initializeIfEmpty: false }), [provider]);
    assert.deepEqual(storage.writes, []);
    storage.setItem('erp_enterprise_proveedores', ''); storage.writes = [];
    await assert.rejects(proveedoresService.getProveedores({ initializeIfEmpty: false }));
    assert.deepEqual(storage.writes, []);
  } finally { globalThis.localStorage = previous; }
});
test('proveedores activos e identificación válida; ausencias se muestran sin inventar', () => {
  assert.equal(supplierUsable(provider), true);
  assert.equal(supplierUsable({ ...provider, estado: 'Inactivo' }), false);
  assert.equal(supplierUsable({ ...provider, documento: '123' }), false);
  assert.equal(supplierUsable({ ...provider, nombre: '' }), false);
  assert.equal(supplierUsable({ ...provider, tipo_persona: 'NATURAL', documento: '12345678' }), true);
  assert.equal(paymentLabel(null), 'No registrada');
  assert.equal(paymentLabel(0), 'Contado');
  assert.equal(supplierSnapshot({ ...provider, email: '', condicion_pago: undefined }).email, null);
});
test('edición recalcula con descuento global antes de IGV de 18%', () => {
  const { draft } = setup();
  const initial = purchaseTotals(draft.items, '5');
  assert.equal(initial.subtotal, 20); assert.equal(initial.descuento, 5); assert.equal(initial.baseImponible, 15);
  assert.ok(Math.abs(initial.igv - 2.7) < 1e-10); assert.equal(initial.total, 17.7);
  const edited = [{ ...draft.items[0], cantidad: '3', precioUnitario: '20' }];
  const result = purchaseTotals(edited, '10');
  assert.equal(result.subtotal, 60); assert.equal(result.igv, 9); assert.equal(result.total, 59);
  assert.equal(purchaseTotals(edited, '').total, 70.8);
});
test('rechaza vacíos, cero, negativos, NaN, infinito y descuentos inválidos sin guardar', () => {
  for (const value of ['', '0', '-1', 'NaN', 'Infinity', '12abc']) {
    const { storage, draft } = setup();
    for (const field of ['cantidad', 'precioUnitario']) {
      assert.throws(() => persistPurchase(storage, { ...draft, items: [{ ...draft.items[0], [field]: value }] }, [provider]));
      assert.equal(storage.getItem('erp_ordenes_compra'), null);
    }
  }
  const { storage, draft } = setup();
  for (const descuento of ['-1', '21', 'abc', 'Infinity']) assert.throws(() => persistPurchase(storage, { ...draft, descuento }, [provider]));
  assert.throws(() => persistPurchase(storage, { ...draft, proveedor: null }, [provider]));
  assert.throws(() => persistPurchase(storage, { ...draft, items: [] }, [provider]));
});
test('catálogo se lee sin normalizar stock ni crear ejemplos; no hay productos genéricos', () => {
  const { storage, draft } = setup();
  const raw = storage.getItem('erp_products_db');
  assert.deepEqual(readPurchaseProducts(storage), [product]);
  assert.equal(storage.getItem('erp_products_db'), raw); assert.deepEqual(storage.writes, []);
  assert.deepEqual(readPurchaseProducts(new MemoryStorage()), []);
  assert.throws(() => persistPurchase(storage, { ...draft, items: [{ ...draft.items[0], producto_id: 'GEN-001' }] }, [provider]));
  assert.throws(() => persistPurchase(storage, { ...draft, items: [...draft.items, { ...draft.items[0], id: 'LINE2' }] }, [provider]));
});
test('guardar conserva compras antiguas y stock/kardex/cache sin cambios', () => {
  const { storage, draft } = setup();
  const legacy = { id: 'OC-2026-1001', proveedor: 'Antiguo', estado: 'Emitida', items: [{ codigo: 'SKU1', descripcion: 'Descripción histórica', unidad: 'NIU', cantidad: 4, precioUnitario: 9, importe: 36 }], custom: { original: true } };
  storage.setItem('erp_ordenes_compra', JSON.stringify([legacy])); storage.setItem('erp_dashboard_data', '{"comprasTotales":123}'); storage.writes = [];
  const inventory = storage.getItem('erp_products_db'), movements = storage.getItem('erp_kardex_movimientos');
  const order = persistPurchase(storage, draft, [provider], new Date('2026-10-14T15:00:00Z'));
  assert.equal(order.estado, 'Pendiente de ingreso al Kardex');
  assert.equal(order.moneda, 'PEN');
  assert.deepEqual(JSON.parse(storage.getItem('erp_ordenes_compra'))[1], legacy);
  assert.equal(storage.getItem('erp_products_db'), inventory); assert.equal(storage.getItem('erp_kardex_movimientos'), movements);
  assert.equal(storage.getItem('erp_dashboard_data'), '{"comprasTotales":123}');
  assert.deepEqual(storage.writes.filter(key => !key.startsWith('erp_respaldo_')), ['erp_ordenes_compra']);
  const backup = [...storage.values].find(([key]) => key.startsWith('erp_respaldo_compra_'));
  assert.equal(JSON.parse(backup[1]).records.erp_ordenes_compra, JSON.stringify([legacy]));
  // Contract consumed by current IngresoKardexPage: same IDs and numeric item fields.
  for (const candidate of [order, legacy]) {
    assert.equal(typeof candidate.id, 'string'); assert.equal(typeof candidate.proveedor, 'string');
    for (const item of candidate.items) {
      assert.equal(typeof item.codigo, 'string'); assert.equal(typeof item.descripcion, 'string');
      assert.equal(typeof item.cantidad, 'number'); assert.equal(typeof item.precioUnitario, 'number');
      assert.ok(readPurchaseProducts(storage).find(p => p.codigo === item.codigo || p.descripcion === item.descripcion));
    }
  }
  assert.equal(computeDashboard([], [order], [], [], [], 'monthly', '2026-10-14', 'PEN').comprasTotales, 17.7);
});
test('datos históricos del proveedor y producto no cambian después de guardar', () => {
  const { storage, draft } = setup();
  const order = persistPurchase(storage, draft, [provider]);
  const original = JSON.parse(storage.getItem('erp_ordenes_compra'))[0];
  storage.setItem('erp_enterprise_proveedores', JSON.stringify([{ ...provider, nombre: 'Nuevo nombre', direccion: 'Nueva dirección' }]));
  storage.setItem('erp_products_db', JSON.stringify([{ ...product, descripcion: 'Nueva descripción' }]));
  assert.deepEqual(JSON.parse(storage.getItem('erp_ordenes_compra'))[0], original);
  assert.equal(order.proveedor_datos.direccion, provider.direccion);
  assert.equal(order.items[0].producto_datos.descripcion, product.descripcion);
});
test('proveedor desactivado/cambiado o producto eliminado no se guarda', () => {
  const { storage, draft } = setup();
  assert.throws(() => persistPurchase(storage, draft, [{ ...provider, estado: 'Suspendido' }]));
  assert.throws(() => persistPurchase(storage, draft, [{ ...provider, direccion: 'Otra' }]), /cambiaron/);
  storage.setItem('erp_products_db', '[]');
  assert.throws(() => persistPurchase(storage, draft, [provider]), /no existe/);
  assert.equal(storage.getItem('erp_ordenes_compra'), null);
});
test('identificador estable hace idempotente doble guardado y reintento', () => {
  const { storage, draft } = setup();
  const first = persistPurchase(storage, draft, [provider]);
  const writes = storage.writes.length;
  assert.deepEqual(persistPurchase(storage, draft, [provider]), first);
  assert.equal(storage.writes.length, writes);
  assert.equal(JSON.parse(storage.getItem('erp_ordenes_compra')).length, 1);
  assert.throws(() => persistPurchase(storage, { ...draft, descuento: '0' }, [provider]), /otros datos/);
});
test('reintento tras respuesta incierta de escritura no duplica orden', () => {
  const { storage, draft } = setup();
  const write = storage.setItem.bind(storage);
  let uncertain = true;
  storage.setItem = (key, value) => { write(key, value); if (key === 'erp_ordenes_compra' && uncertain) { uncertain = false; throw new Error('Respuesta incierta tras guardar'); } };
  assert.throws(() => persistPurchase(storage, draft, [provider]));
  assert.equal(persistPurchase(storage, draft, [provider]).id, draft.id);
  assert.equal(JSON.parse(storage.getItem('erp_ordenes_compra')).length, 1);
});
test('fallos de respaldo o escritura no pierden compras y permiten reintentar mismo ID', () => {
  for (const backupFailure of [true, false]) {
    const { storage, draft } = setup();
    const originalDraft = structuredClone(draft);
    storage.setItem('erp_ordenes_compra', '[{"id":"OLD","custom":true}]');
    const original = storage.getItem('erp_ordenes_compra');
    storage.failure = key => backupFailure ? key.startsWith('erp_respaldo_') : key === 'erp_ordenes_compra';
    assert.throws(() => persistPurchase(storage, draft, [provider]));
    assert.equal(storage.getItem('erp_ordenes_compra'), original); assert.deepEqual(draft, originalDraft);
    storage.failure = null;
    const saved = persistPurchase(storage, draft, [provider]);
    assert.equal(saved.id, 'OC-stable'); assert.equal(JSON.parse(storage.getItem('erp_ordenes_compra')).length, 2);
  }
});
test('registros dañados se rechazan sin reemplazarlos y Nueva compra detecta cambios', () => {
  const { storage, draft } = setup();
  storage.setItem('erp_ordenes_compra', '{bad');
  assert.throws(() => persistPurchase(storage, draft, [provider]));
  assert.equal(storage.getItem('erp_ordenes_compra'), '{bad');
  const clean = { items: [], selectedSupplier: null, search: '', quantity: '', price: '', discount: '' };
  assert.equal(hasUnsavedPurchase(clean, false), false);
  for (const changed of [{ ...clean, items: [{}] }, { ...clean, selectedSupplier: provider }, { ...clean, search: 'product' }, { ...clean, quantity: '1' }, { ...clean, price: '20' }, { ...clean, discount: '0' }]) assert.equal(hasUnsavedPurchase(changed, false), true);
  assert.equal(hasUnsavedPurchase({ ...clean, items: [{}] }, true), false);
});
