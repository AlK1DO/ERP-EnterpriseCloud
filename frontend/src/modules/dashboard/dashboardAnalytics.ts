import { stockState, stockSummary } from '../../services/stockAlerts.ts';
import { assertInventoryReady } from '../../services/inventoryTransaction.ts';
import { assertBillingReady } from '../../services/billingTransaction.ts';

export type Period = 'weekly' | 'monthly' | 'yearly';
export type Row = Record<string, any>;
export type Point = { name: string; key: string; Ventas: number; Compras: number; value: number };
const money = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
};
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
function validDay(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
}
export function dateKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|t)/.exec(text);
  if (iso) {
    if (!validDay(+iso[1], +iso[2], +iso[3])) return null;
    if (!text.includes('t')) return validDay(+iso[1], +iso[2], +iso[3]);
    const timestamp = new Date(value);
    if (!Number.isFinite(timestamp.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(timestamp);
    return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
  }
  const numeric = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:$|\s)/.exec(text);
  if (numeric) return validDay(+numeric[3], +numeric[2], +numeric[1]);
  const months: Record<string, number> = { ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, set: 9, septiembre: 9, setiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12 };
  const spanish = /^(\d{1,2})\s+(?:de\s+)?([a-z]+)\.?\s+(?:de\s+)?(\d{4})$/.exec(text);
  return spanish && months[spanish[2]] ? validDay(+spanish[3], months[spanish[2]], +spanish[1]) : null;
}
export function periodRange(period: Period, reference: string) {
  const key = dateKey(reference);
  if (!key) throw new Error('Selecciona una fecha válida.');
  const [year, month, day] = key.split('-').map(Number);
  let start = new Date(Date.UTC(year, month - 1, day));
  let end = new Date(start);
  if (period === 'weekly') {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  } else if (period === 'monthly') {
    start = new Date(Date.UTC(year, month - 1, 1)); end = new Date(Date.UTC(year, month, 0));
  } else {
    start = new Date(Date.UTC(year, 0, 1)); end = new Date(Date.UTC(year, 11, 31));
  }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export function readRows(storage: Pick<Storage, 'getItem'>, key: string): Row[] {
  if (key === 'erp_ordenes_venta' || key === 'erp_estado_cuenta') assertBillingReady(storage);
  if (key === 'erp_products_db' || key === 'erp_kardex_movimientos') assertInventoryReady(storage);
  const raw = storage.getItem(key);
  if (raw === null) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(`Datos inválidos en ${key}. No se modificaron los registros.`);
  return rows;
}
export function computeDashboard(orders: Row[], purchases: Row[], invoices: Row[], products: Row[], movements: Row[], period: Period, reference: string, currency: string) {
  const range = periodRange(period, reference);
  const warnings = new Set<string>();
  const points: Point[] = [];
  if (period === 'yearly') {
    for (let month = 1; month <= 12; month++) points.push({ key: `${range.start.slice(0, 4)}-${String(month).padStart(2, '0')}`, name: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][month - 1], Ventas: 0, Compras: 0, value: 0 });
  } else {
    const cursor = new Date(`${range.start}T00:00:00Z`);
    while (cursor.toISOString().slice(0, 10) <= range.end) {
      const key = cursor.toISOString().slice(0, 10);
      points.push({ key, name: key.slice(8) + '/' + key.slice(5, 7), Ventas: 0, Compras: 0, value: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  // Old connected forms only wrote PEN amounts; explicit other currencies are never converted.
  function recordCurrency(row: Row) {
    if (!row.moneda) { warnings.add('Registros antiguos sin moneda: PEN según los formularios originales en soles.'); return 'PEN'; }
    return row.moneda;
  }
  const linkedOrders = new Map(orders.filter(o => o.id).map(o => [String(o.id), o]));
  const seenInvoices = new Set<string>();
  const orphanInvoices = invoices.filter(invoice => {
    if (invoice.orden_id && linkedOrders.has(String(invoice.orden_id))) return false;
    if (invoice.nro && seenInvoices.has(String(invoice.nro))) { warnings.add('Se omitieron comprobantes repetidos con el mismo número.'); return false; }
    if (invoice.nro) seenInvoices.add(String(invoice.nro));
    if (!invoice.orden_id) warnings.add('Comprobantes antiguos sin vínculo a orden: se cuentan como ventas históricas por fecha del comprobante; no se puede reconstruir su fecha original ni comprobar cruces manuales.');
    return true;
  });
  function include(row: Row, field: 'Ventas' | 'Compras') {
    if (String(row.estado).toUpperCase() === 'ANULADA' || String(row.estado).toUpperCase() === 'ANULADO') return;
    const day = dateKey(row.fecha_operacion ?? row.fecha);
    const amount = money(row.total);
    if (!day || amount === null) { warnings.add('Se excluyeron operaciones con fecha o importe inválido.'); return; }
    if (day < range.start || day > range.end || recordCurrency(row) !== currency) return;
    const point = points.find(p => p.key === (period === 'yearly' ? day.slice(0, 7) : day));
    if (point) point[field] += amount;
  }
  orders.forEach(order => include(order, 'Ventas'));
  orphanInvoices.forEach(invoice => include(invoice, 'Ventas'));
  purchases.forEach(purchase => include(purchase, 'Compras'));
  points.forEach(p => { p.Ventas = roundMoney(p.Ventas); p.Compras = roundMoney(p.Compras); p.value = p.Ventas; });
  const ventasTotales = roundMoney(points.reduce((sum, point) => sum + point.Ventas, 0));
  const comprasTotales = roundMoney(points.reduce((sum, point) => sum + point.Compras, 0));
  const ctasPendientes = roundMoney(invoices.reduce((sum, invoice) => {
    const balance = money(invoice.saldo);
    if (balance === null) { warnings.add('Se excluyeron saldos inválidos.'); return sum; }
    return recordCurrency(invoice) === currency ? sum + balance : sum;
  }, 0));
  const catMap: Record<string, number> = {};
  products.forEach(product => {
    const stock = money(product.stock), price = money(product.precioVenta);
    if (stock === null || price === null) { warnings.add('Se excluyeron productos con stock o precio inválido del análisis por categoría.'); return; }
    // Current product schema uses soles; no foreign-currency stock conversion.
    if ((product.moneda ?? 'PEN') !== 'PEN') { warnings.add('El análisis de existencias solo incluye precios en PEN.'); return; }
    const category = String(product.categoria || 'Sin categoría');
    catMap[category] = (catMap[category] ?? 0) + stock * price;
  });
  const inventoryTotal = Object.values(catMap).reduce((sum, value) => sum + value, 0);
  const pieData = inventoryTotal > 0 ? Object.entries(catMap).map(([name, value]) => ({ name, value: roundMoney(value), percentage: value / inventoryTotal * 100 })).filter(p => p.value > 0) : [];
  const stockList = products.map(p => ({ id: p.id, name: p.descripcion, sku: `${p.codigo} - ${p.almacen}`, current: Number(p.stock), min: Number(p.stockMinimo), state: stockState(p) }));
  const ultimosMovimientos = movements.filter(m => { const day = dateKey(m.fecha); return day && day >= range.start && day <= range.end; }).sort((a,b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 5).map(m => ({ id: m.id, fecha: dateKey(m.fecha), descripcion: `${m.documentoTipo} ${m.documentoNumero} - ${m.productoDescripcion}`, tipo: m.tipoMovimiento === 'ENTRADA' ? 'ingreso' : 'salida', monto: money(m.tipoMovimiento === 'ENTRADA' ? m.totalEntrada : m.totalSalida) ?? 0 }));
  return { range, ventasTotales, comprasTotales, ctasPendientes, diferencia: roundMoney(ventasTotales - comprasTotales), stockBajo: stockSummary(products).critical, stockList, ultimosMovimientos, chartData: points, areaChartData: points, pieData, inventoryTotal: roundMoney(inventoryTotal), warnings: [...warnings] };
}
export type Analysis = { title: string; period: string; currency: string; notes: string[]; headers: string[]; rows: (string | number)[][] };
export function analysisTable(data: ReturnType<typeof computeDashboard>, kind: 'summary' | 'comparison' | 'sales' | 'inventory', currency: string): Analysis {
  const period = `${data.range.start} al ${data.range.end}`;
  const notes = [...data.warnings, 'Ventas incluyen IGV. Compras son órdenes emitidas, no pagos. No se dispone de costo de ventas fiable; la diferencia no es margen bruto.'];
  if (kind === 'inventory') return { title: 'Existencias por categoría a precio de venta', period: 'Inventario actual (sin filtro de periodo)', currency: 'PEN', notes: ['Stock × precio de venta; porcentaje sobre el total actual. No son ventas realizadas ni valorización al costo.', `Total: ${data.inventoryTotal} PEN`], headers: ['Categoría', 'Valor PEN', 'Porcentaje'], rows: data.pieData.map(p => [p.name, p.value, p.percentage.toFixed(2)]) };
  if (kind === 'summary') return { title: 'Resumen general', period, currency, notes, headers: ['Indicador', 'Valor', 'Alcance'], rows: [['Ventas', data.ventasTotales, period], ['Compras', data.comprasTotales, period], ['Diferencia ventas menos compras', data.diferencia, period], ['Saldo pendiente', data.ctasPendientes, 'Actual; sin filtro de periodo'], ['Stock crítico', data.stockBajo, 'Actual; referencias sin existencias o con stock bajo'], ['Inventario inconsistente', data.stockList.filter(p => p.state === 'INCONSISTENTE').length, 'Actual; requiere revision, sin correccion automatica']] };
  return { title: kind === 'comparison' ? 'Ventas vs. Compras' : 'Ventas del periodo', period, currency, notes, headers: kind === 'comparison' ? ['Fecha', 'Ventas', 'Compras', 'Diferencia'] : ['Fecha', 'Ventas'], rows: data.chartData.map(p => kind === 'comparison' ? [p.key, p.Ventas, p.Compras, roundMoney(p.Ventas - p.Compras)] : [p.key, p.Ventas]) };
}
export function analysisCsv(analysis: Analysis): string {
  const escape = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [[analysis.title], ['Periodo', analysis.period], ['Moneda', analysis.currency], ...analysis.notes.map(note => ['Nota', note]), analysis.headers, ...(analysis.rows.length ? analysis.rows : [['Sin datos']])].map(row => row.map(escape).join(';')).join('\r\n');
}
