import type { Cliente } from '../../services/clientesService';
import { assertInventoryReady, commitInventoryTransaction } from '../../services/inventoryTransaction.ts';
import { assertBillingReady } from '../../services/billingTransaction.ts';
import { salesClientSnapshot } from './salesClient.ts';
type Row = Record<string, any>;
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type SalesLine = { id: string; codigo: string; descripcion: string; cantidad: number; precioVenta: number; importe: number };
export function persistSalesOrder(storage: Store, id: string, client: Cliente, lines: SalesLine[], seller: string, now = new Date()) {
  assertInventoryReady(storage); assertBillingReady(storage);
  const snapshot = salesClientSnapshot(client);
  if (!id || !lines.length) throw new Error('Agrega productos antes de guardar.');
  function read(key: string): Row[] {
    const raw = storage.getItem(key); if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object')) throw new Error('Datos locales inválidos; no se reemplazaron.');
    return value;
  }
  const orders = read('erp_ordenes_venta'), products = read('erp_products_db'), movements = read('erp_kardex_movimientos');
  const signature = JSON.stringify({ snapshot, lines });
  const prior = orders.find(order => order.id === id);
  if (prior) { if (prior.solicitud_firma !== signature) throw new Error('La orden ya existe con otros datos. Inicia una nueva venta.'); return prior; }
  const entries: Row[] = [];
  for (const [index, line] of lines.entries()) {
    if (!Number.isFinite(line.cantidad) || line.cantidad <= 0 || !Number.isFinite(line.precioVenta) || line.precioVenta < 0 || !Number.isFinite(line.cantidad * line.precioVenta)) throw new Error('Cantidad o precio inválido.');
    const matches = products.filter(p => p.codigo === line.codigo);
    // Preserve the existing manual generic-line behavior; no product/stock is invented.
    if (!matches.length && line.codigo === 'GEN-001') continue;
    if (matches.length !== 1) throw new Error(`No se puede identificar el producto ${line.codigo}.`);
    const product = matches[0], stock = Number(product.stock), cost = Number(product.costoUnitario);
    if (!Number.isFinite(stock) || !Number.isFinite(cost) || cost < 0 || stock < line.cantidad) throw new Error(`Stock o costo no disponible para ${line.codigo}.`);
    product.stock = stock - line.cantidad;
    entries.unshift({ id: `${id}-salida-${index}`, fecha: now.toISOString(), productoId: product.id, productoCodigo: product.codigo, productoDescripcion: product.descripcion,
      tipoMovimiento: 'SALIDA', tipoOperacion: 'VENTA', documentoTipo: 'ORDEN DE VENTA', documentoNumero: id, orden_id: id,
      detalle: `Salida por venta a ${snapshot.nombre}`, almacen: product.almacen || 'Almacén Central', cantSalida: line.cantidad,
      costoSalida: cost, totalSalida: line.cantidad * cost, saldoCantidad: product.stock, saldoCostoUnitario: cost, saldoTotal: product.stock * cost });
  }
  const subtotal = lines.reduce((sum, line) => sum + line.cantidad * line.precioVenta, 0), igv = subtotal * 0.18;
  const order = { id, cliente_id: snapshot.id, cliente: snapshot.nombre, documento: snapshot.documento, ruc: snapshot.documento.length === 11 ? snapshot.documento : '',
    cliente_datos: snapshot, fecha: now.toISOString(), moneda: 'PEN', subtotal, igv, total: subtotal + igv, vendedor: seller,
    items: lines.map(line => ({ codigo: line.codigo, desc: line.descripcion, cant: line.cantidad, pUnitario: line.precioVenta, total: line.cantidad * line.precioVenta })), estado: 'Pendiente', solicitud_firma: signature };
  commitInventoryTransaction(storage, { erp_products_db: JSON.stringify(products), erp_kardex_movimientos: JSON.stringify([...entries, ...movements]), erp_ordenes_venta: JSON.stringify([order, ...orders]) }, id);
  return order;
}
