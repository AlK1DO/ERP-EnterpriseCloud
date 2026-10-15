import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDashboard, dateKey, periodRange, analysisTable, analysisCsv, readRows } from '../src/modules/dashboard/dashboardAnalytics.ts';
import { persistInvoice } from '../src/services/invoicePersistence.ts';
import { commercialSnapshot } from '../src/services/commercialBackup.ts';
import { analysisPdf } from '../src/modules/dashboard/dashboardPdf.ts';

const order = { id: 'OV-1', fecha: '14 oct 2026', total: 118, estado: 'Pendiente', items: [] };
const calculate = (orders = [], purchases = [], invoices = [], products = [], period = 'monthly', reference = '2026-10-14', currency = 'PEN') => computeDashboard(orders, purchases, invoices, products, [], period, reference, currency);
class MemoryStorage {
  values = new Map();
  failKey = null;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.failKey === key) { this.failKey = null; throw new Error('Simulated write failure'); } this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}
const storeWithOrder = () => { const store = new MemoryStorage(); store.setItem('erp_ordenes_venta', JSON.stringify([order])); return store; };

test('fechas locales antiguas e ISO se interpretan sin desbordes y en Lima', () => {
  assert.equal(dateKey('14 oct 2026'), '2026-10-14');
  assert.equal(dateKey('14 de octubre de 2026'), '2026-10-14');
  assert.equal(dateKey('01 set. 2026'), '2026-09-01');
  assert.equal(dateKey('14/10/2026 10:20'), '2026-10-14');
  assert.equal(dateKey('2026-10-15T01:00:00Z'), '2026-10-14');
  assert.equal(dateKey('31/02/2026'), null);
  assert.equal(dateKey('2026-02-30'), null);
  assert.equal(dateKey('fecha desconocida'), null);
});
test('semana de lunes a domingo, mes bisiesto y año completo', () => {
  assert.deepEqual(periodRange('weekly', '2026-01-01'), { start: '2025-12-29', end: '2026-01-04' });
  assert.deepEqual(periodRange('monthly', '2024-02-14'), { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(periodRange('yearly', '2026-10-14'), { start: '2026-01-01', end: '2026-12-31' });
});
test('gráficos usan fechas y valores reales, excluyen anulaciones, fuera de periodo y otra moneda', () => {
  const result = calculate([order, { ...order, id: 'OV-2', total: 10, moneda: 'USD' }, { ...order, id: 'OV-3', total: 900, estado: 'Anulada' }, { ...order, fecha: '01 sep 2026', total: 700 }], [{ fecha: '14/10/2026', total: 40 }]);
  assert.equal(result.ventasTotales, 118);
  assert.equal(result.comprasTotales, 40);
  assert.equal(result.diferencia, 78);
  assert.equal(result.chartData.find(p => p.key === '2026-10-14').Ventas, 118);
  assert.equal(result.chartData.reduce((sum, p) => sum + p.value, 0), 118);
  assert.equal(calculate([{ ...order, moneda: 'USD' }], [], [], [], 'monthly', '2026-10-14', 'PEN').ventasTotales, 0);
  assert.equal(calculate([{ ...order, moneda: 'USD' }], [], [], [], 'monthly', '2026-10-14', 'USD').ventasTotales, 118);
});
test('periodos vacíos, importes inválidos y fechas desconocidas no inventan operaciones', () => {
  assert.equal(calculate([order], [], [], [], 'monthly', '2027-01-01').ventasTotales, 0);
  const result = calculate([{ ...order, fecha: 'invalid' }, { ...order, total: null }, { ...order, total: -1 }]);
  assert.equal(result.ventasTotales, 0);
  assert.ok(result.warnings.some(w => w.includes('inválido')));
});
test('lectura es solo lectura y no reemplaza JSON inválido ni crea datos ejemplo', () => {
  const store = new MemoryStorage();
  assert.deepEqual(readRows(store, 'missing'), []);
  assert.equal(store.values.size, 0);
  store.setItem('broken', '{bad');
  assert.throws(() => readRows(store, 'broken'));
  assert.equal(store.getItem('broken'), '{bad');
});
test('existencias por categoría: precio de venta, denominador, periodo independiente y cero', () => {
  const products = [{ categoria: 'A', stock: 2, precioVenta: 10, costoUnitario: 1 }, { categoria: 'B', stock: 1, precioVenta: 30 }];
  const result = calculate([], [], [], products);
  assert.equal(result.inventoryTotal, 50);
  assert.equal(result.pieData[0].percentage, 40);
  assert.equal(result.pieData[1].percentage, 60);
  assert.deepEqual(result.pieData, calculate([], [], [], products, 'yearly', '2024-01-01', 'USD').pieData);
  assert.deepEqual(calculate([], [], [], [{ categoria: 'A', stock: 0, precioVenta: 10 }]).pieData, []);
});
test('exportaciones usan mismos datos, moneda, fechas y alcance del inventario', () => {
  const data = calculate([order]);
  const comparison = analysisTable(data, 'comparison', 'PEN');
  const sales = analysisTable(data, 'sales', 'PEN');
  assert.equal(comparison.rows.reduce((sum, row) => sum + row[1], 0), data.ventasTotales);
  assert.equal(sales.rows.reduce((sum, row) => sum + row[1], 0), data.ventasTotales);
  const csv = analysisCsv(comparison);
  assert.ok(csv.includes('2026-10-01 al 2026-10-31'));
  assert.ok(csv.includes('PEN'));
  const stock = analysisTable(data, 'inventory', 'USD');
  assert.equal(stock.currency, 'PEN');
  assert.match(stock.period, /sin filtro/);
  assert.ok(stock.notes.some(n => n.includes('No son ventas')));
  assert.match(analysisCsv({ ...stock, rows: [['=formula;"quoted"', 0, 0]] }), /'=formula;""quoted""/);
});
test('PDF se genera con título, periodo, moneda y datos reales incluso vacío', () => {
  for (const kind of ['summary', 'comparison', 'sales', 'inventory']) {
    const table = analysisTable(calculate([order]), kind, 'PEN');
    const pdf = analysisPdf(table).output();
    assert.match(pdf, /^%PDF-/);
    assert.ok(pdf.includes('PEN'));
    if (kind !== 'inventory') {
      assert.ok(pdf.includes('2026-10-01 al 2026-10-31'));
      assert.ok(pdf.includes('118'));
    } else assert.ok(pdf.includes('Sin datos'));
  }
});
test('facturar conserva venta, copia fecha original y evita doble conteo y reintento', () => {
  const store = storeWithOrder();
  persistInvoice(store, 'OV-1', { nro: 'F001-1', fecha: '20/11/2026', total: 0 });
  const orders = readRows(store, 'erp_ordenes_venta'), invoices = readRows(store, 'erp_estado_cuenta');
  assert.equal(orders.length, 1);
  assert.equal(orders[0].estado, 'Facturada');
  assert.equal(invoices[0].orden_id, 'OV-1');
  assert.equal(invoices[0].fecha_operacion, order.fecha);
  assert.equal(calculate(orders, [], invoices).ventasTotales, 118);
  assert.throws(() => persistInvoice(store, 'OV-1', { nro: 'F001-2' }), /ya fue facturada/);
  assert.equal(readRows(store, 'erp_estado_cuenta').length, 1);
  const backup = [...store.values].find(([key]) => key.startsWith('erp_respaldo_facturacion_'));
  assert.equal(JSON.parse(backup[1]).records.erp_ordenes_venta, JSON.stringify([order]));
});
test('comprobantes históricos sin orden se cuentan una vez y advierten fecha limitada', () => {
  const invoices = [{ nro: 'F-old', fecha: '14/10/2026 12:20', total: 80, saldo: 80 }];
  const result = calculate([], [], invoices);
  assert.equal(result.ventasTotales, 80);
  assert.ok(result.warnings.some(w => w.includes('fecha original')));
});
test('fallo al guardar restaura originales, respaldo fallido bloquea toda escritura', () => {
  const store = storeWithOrder();
  const original = store.getItem('erp_ordenes_venta');
  store.failKey = 'erp_ordenes_venta';
  assert.throws(() => persistInvoice(store, 'OV-1', { nro: 'F1' }), /restauraron/);
  assert.equal(store.getItem('erp_ordenes_venta'), original);
  assert.equal(store.getItem('erp_estado_cuenta'), null);
  const failing = storeWithOrder();
  const write = failing.setItem.bind(failing);
  failing.setItem = (key, value) => { if (key.startsWith('erp_respaldo_')) throw new Error('No space'); write(key, value); };
  assert.throws(() => persistInvoice(failing, 'OV-1', { nro: 'F1' }));
  assert.equal(failing.getItem('erp_ordenes_venta'), original);
  assert.equal(failing.getItem('erp_estado_cuenta'), null);
  assert.equal(commercialSnapshot(failing).records.erp_ordenes_venta, original);
});
